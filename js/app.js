import {
  availableYears,
  createCalendar,
  MULTIPLIERS,
} from "./core/calendar.js";
import { Pattern } from "./core/pattern.js";
import { parseFillPercent, validateSettings } from "./core/validation.js";
import { PublishJob } from "./core/publisher.js";
import {
  downloadFile,
  loadDraft,
  MAX_FILE_BYTES,
  parseDocument,
  saveDraft,
  serializePattern,
} from "./core/portability.js";
import { createSvg } from "./core/svg.js";
import { createI18n, detectLocale, LOCALES } from "./i18n/index.js";
import { GridEditor } from "./editor.js";

const ids = [
  "langSelect",
  "selYear",
  "token",
  "repo",
  "email",
  "gitname",
  "branch",
  "multiplier",
  "commitSpread",
  "fillPercent",
  "clearBtn",
  "invertBtn",
  "fillBtn",
  "undoBtn",
  "redoBtn",
  "pushBtn",
  "resumeBtn",
  "cancelBtn",
  "graph",
  "months",
  "dayLabels",
  "sDays",
  "sCommits",
  "sPeriod",
  "progress",
  "progressBar",
  "bar",
  "log",
  "statusBar",
  "connectionFields",
  "editorFields",
  "palette",
  "importBtn",
  "importFile",
  "exportBtn",
  "previewBtn",
  "previewDialog",
  "svgPreview",
  "downloadSvgBtn",
  "publishDialog",
  "confirmPublishBtn",
  "reviewRepo",
  "reviewBranch",
  "reviewDays",
  "reviewCommits",
  "reviewPeriod",
];
const els = Object.fromEntries(
  ids.map((id) => [id, document.getElementById(id)]),
);
const i18n = createI18n();
const t = (key, values) => i18n.t(key, values);
const today = new Date();
const years = availableYears(today);
const patterns = new Map();
let selectedYear = years[1];
let job = null;
let runController = null;
let publishing = false;
let saveTimer = null;
let statsFrame = null;
let storageWarningShown = false;
let numberFormat;
let dateFormat;

const editor = new GridEditor(els.graph, els.months, {
  translate: t,
  locale: i18n.locale,
  onStroke: changed,
  onBrush: (brush) => {
    for (const swatch of els.palette.children) {
      swatch.setAttribute(
        "aria-pressed",
        String(Number(swatch.dataset.level) === brush),
      );
    }
  },
});

function currentPattern() {
  return patterns.get(selectedYear);
}

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function setStatus(key, type = "", values = {}) {
  els.statusBar.hidden = !key;
  els.statusBar.className = `status-bar ${type}`;
  els.statusBar.textContent = key ? t(key, values) : "";
}

function addLog(key, type = "", values = {}) {
  const entry = document.createElement("span");
  entry.className = type;
  entry.textContent = t(key, values);
  els.log.append(entry);
  while (els.log.childElementCount > 100) els.log.firstElementChild.remove();
  els.log.scrollTop = els.log.scrollHeight;
}

function persistDraft() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!saveDraft(storage(), patterns, selectedYear) && !storageWarningShown) {
    storageWarningShown = true;
    setStatus("status_draft_failed", "warn");
  }
}

function changed() {
  // A new drawing must never silently reuse an earlier immutable commit plan.
  if (!publishing) job = null;
  els.resumeBtn.hidden = true;
  updateStats();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistDraft, 250);
}

function updateStats() {
  const pattern = currentPattern();
  const stats = pattern.stats(
    Number(els.multiplier.value),
    els.commitSpread.value === "plus2",
  );
  els.sDays.textContent = numberFormat.format(stats.days);
  els.sCommits.textContent =
    stats.minimum === stats.maximum
      ? numberFormat.format(stats.minimum)
      : `${numberFormat.format(stats.minimum)}–${numberFormat.format(stats.maximum)}`;
  const indices = pattern.calendar.activeIndices;
  els.sPeriod.textContent = indices.length
    ? `${dateFormat.format(pattern.calendar.days[indices[0]].timestamp)} – ${dateFormat.format(pattern.calendar.days[indices.at(-1)].timestamp)}`
    : t("no_days");
  els.undoBtn.disabled = !pattern.past.length;
  els.redoBtn.disabled = !pattern.future.length;
}

function scheduleStats() {
  if (statsFrame !== null) return;
  statsFrame = requestAnimationFrame(() => {
    statsFrame = null;
    updateStats();
  });
}

function selectYear(year) {
  editor.finishStroke();
  selectedYear = year;
  els.selYear.value = String(year);
  if (!patterns.has(year))
    patterns.set(year, new Pattern(createCalendar(year, today)));
  editor.render(currentPattern());
  job = null;
  els.resumeBtn.hidden = true;
  updateStats();
}

function applyLanguage() {
  document.documentElement.lang = i18n.locale;
  document.title = t("app_title");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAria));
  });
  for (const swatch of els.palette.children) {
    const level = Number(swatch.dataset.level);
    const label =
      level === 5
        ? t("level_random")
        : level === 0
          ? t("level_0")
          : t("level_n", { n: level });
    swatch.setAttribute("aria-label", label);
    swatch.title = `${label} (${level})`;
  }
  numberFormat = new Intl.NumberFormat(i18n.locale);
  dateFormat = new Intl.DateTimeFormat(i18n.locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  els.dayLabels.replaceChildren(
    ...Array.from({ length: 7 }, (_, day) => {
      const label = document.createElement("span");
      label.textContent = [1, 3, 5].includes(day)
        ? new Intl.DateTimeFormat(i18n.locale, {
            weekday: "short",
            timeZone: "UTC",
          }).format(Date.UTC(2024, 0, 7 + day))
        : "";
      return label;
    }),
  );
  editor.locale = i18n.locale;
  editor.render(currentPattern());
  updateStats();
}

function readSettings() {
  const settings = validateSettings({
    token: els.token.value,
    repo: els.repo.value,
    email: els.email.value,
    gitname: els.gitname.value,
    branch: els.branch.value,
  });
  const multiplier = Number(els.multiplier.value);
  if (!MULTIPLIERS.includes(multiplier)) throw new Error("error_unknown");
  return settings;
}

function showValidation(error) {
  const field = {
    alert_token: "token",
    alert_repo: "repo",
    alert_email: "email",
    alert_branch: "branch",
    alert_name: "gitname",
    alert_percent: "fillPercent",
  }[error.message];
  if (field) {
    els[field].setAttribute("aria-invalid", "true");
    els[field].setAttribute("aria-describedby", "statusBar");
    els[field].focus();
  }
  setStatus(error.message, "err");
}

function mutate(operation) {
  try {
    editor.finishStroke();
    if (operation(currentPattern())) changed();
    setStatus("");
  } catch (error) {
    showValidation(error);
  }
}

function openPublishReview(resume = false) {
  try {
    editor.finishStroke();
    const settings = readSettings();
    if (!resume) {
      const pattern = currentPattern();
      const plan = pattern.commitPlan(
        Number(els.multiplier.value),
        els.commitSpread.value === "plus2",
      );
      if (!plan.length) throw new Error("alert_empty");
      job = new PublishJob(settings, plan, { notify: publishNotification });
    }
    if (!job || job.finished) return;
    if (resume) job.settings = { ...job.settings, token: settings.token };
    els.reviewRepo.textContent = job.settings.repository.slug;
    els.reviewBranch.textContent = job.settings.branch;
    els.reviewDays.textContent = numberFormat.format(job.plan.length);
    els.reviewCommits.textContent = numberFormat.format(
      resume ? job.total - job.completed : job.total,
    );
    els.reviewPeriod.textContent = `${job.plan[0].date} – ${job.plan.at(-1).date}`;
    els.confirmPublishBtn.textContent = t(
      resume ? "publish_resume_confirm" : "publish_confirm",
    );
    els.confirmPublishBtn.dataset.resume = String(resume);
    els.publishDialog.showModal();
  } catch (error) {
    showValidation(error);
  }
}

function publishNotification(type, values) {
  if (type === "progress") {
    const percent = Math.floor((values.completed / values.total) * 100);
    els.bar.style.width = `${percent}%`;
    els.progressBar.setAttribute("aria-valuenow", percent);
    if (values.completed % 25 === 0 || values.completed === values.total)
      addLog("log_creating", "", values);
  } else addLog(type);
}

function setPublishing(active) {
  publishing = active;
  els.connectionFields.disabled = active;
  els.editorFields.disabled = active;
  els.cancelBtn.hidden = !active;
  els.resumeBtn.hidden = active || !job || job.finished;
  els.pushBtn.disabled = active;
}

async function publish() {
  els.publishDialog.close();
  if (!job || publishing) return;
  const activeJob = job;
  runController = new AbortController();
  setPublishing(true);
  els.progress.hidden = false;
  const percent = Math.floor((activeJob.completed / activeJob.total) * 100);
  els.bar.style.width = `${percent}%`;
  els.progressBar.setAttribute("aria-valuenow", percent);
  els.log.replaceChildren();
  setStatus("");
  try {
    await activeJob.run(activeJob.settings.token, runController.signal);
    els.bar.style.width = "100%";
    els.progressBar.setAttribute("aria-valuenow", "100");
    addLog("log_success", "ok", {
      total: activeJob.total,
      repo: activeJob.settings.repository.slug,
    });
    setStatus("status_finished", "ok");
    els.token.value = "";
  } catch (error) {
    if (error.name === "AbortError") {
      addLog("log_stopped", "warn", {
        completed: activeJob.completed,
        total: activeJob.total,
      });
      setStatus("status_cancelled", "warn");
    } else {
      const key = /^(alert_|error_|status_|log_)/.test(error.message)
        ? error.message
        : "error_unknown";
      const detail = error.detail
        ? ` ${error.detail.replaceAll(activeJob.settings.token, "[redacted]")}`
        : "";
      setStatus(key, "err", { status: error.status });
      if (detail) els.statusBar.textContent += detail;
      addLog(key, "err", { status: error.status });
    }
  } finally {
    setPublishing(false);
    runController = null;
    if (activeJob.finished) job = null;
  }
}

els.langSelect.addEventListener("change", async () => {
  const previous = i18n.locale;
  els.langSelect.disabled = true;
  try {
    await i18n.setLocale(els.langSelect.value);
    applyLanguage();
  } catch {
    els.langSelect.value = previous;
    setStatus("status_locale_failed", "err");
  } finally {
    els.langSelect.disabled = false;
  }
});
els.selYear.addEventListener("change", () => {
  selectYear(Number(els.selYear.value));
  persistDraft();
});
els.palette.addEventListener("click", (event) => {
  const swatch = event.target.closest(".swatch");
  if (swatch) editor.setBrush(Number(swatch.dataset.level));
});
els.graph.addEventListener("pointermove", scheduleStats);
els.graph.addEventListener("pointerup", scheduleStats);
els.clearBtn.addEventListener("click", () =>
  mutate((pattern) => pattern.clear()),
);
els.invertBtn.addEventListener("click", () =>
  mutate((pattern) => pattern.invert()),
);
els.fillBtn.addEventListener("click", () =>
  mutate((pattern) => {
    const percent = parseFillPercent(els.fillPercent.value);
    els.fillPercent.value = `${percent}%`;
    return pattern.fill(percent, editor.brush);
  }),
);
els.undoBtn.addEventListener("click", () =>
  mutate((pattern) => pattern.undo()),
);
els.redoBtn.addEventListener("click", () =>
  mutate((pattern) => pattern.redo()),
);
els.multiplier.addEventListener("change", changed);
els.commitSpread.addEventListener("change", changed);
els.fillPercent.addEventListener("blur", () => {
  try {
    els.fillPercent.value = `${parseFillPercent(els.fillPercent.value)}%`;
  } catch {
    /* Keep invalid input visible until Fill is used. */
  }
});

for (const id of ["token", "repo", "email", "gitname", "branch"]) {
  els[id].addEventListener("input", () => {
    els[id].removeAttribute("aria-invalid");
    const hint = {
      token: "hintToken",
      repo: "repoHint",
      email: "hintEmail",
      branch: "branchHint",
    }[id];
    if (hint) els[id].setAttribute("aria-describedby", hint);
    if (id !== "token" && !publishing) {
      job = null;
      els.resumeBtn.hidden = true;
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (
    publishing ||
    event.isComposing ||
    event.target.closest(
      'input, select, textarea, [contenteditable="true"], dialog',
    )
  )
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    mutate((pattern) => (event.shiftKey ? pattern.redo() : pattern.undo()));
  } else if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "y"
  ) {
    event.preventDefault();
    mutate((pattern) => pattern.redo());
  } else if (
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    /^[0-5]$/.test(event.key)
  ) {
    editor.setBrush(Number(event.key));
  }
});

els.importBtn.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", async () => {
  const file = els.importFile.files[0];
  els.importFile.value = "";
  if (!file) return;
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error("alert_file_size");
    const document = parseDocument(await file.text(), years, today);
    selectYear(document.year);
    patterns.get(document.year).replace(document.cells);
    changed();
    persistDraft();
    setStatus("status_imported", "ok");
  } catch (error) {
    setStatus(
      /^(alert_|error_)/.test(error.message) ? error.message : "alert_import",
      "err",
    );
  }
});
els.exportBtn.addEventListener("click", () => {
  editor.finishStroke();
  downloadFile(
    JSON.stringify(serializePattern(currentPattern()), null, 2),
    "application/json",
    `contribution-pattern-${selectedYear}.json`,
  );
  setStatus("status_exported", "ok");
});
els.previewBtn.addEventListener("click", () => {
  editor.finishStroke();
  els.svgPreview.replaceChildren(createSvg(currentPattern()));
  els.previewDialog.showModal();
});
els.downloadSvgBtn.addEventListener("click", () => {
  const svg = new XMLSerializer().serializeToString(
    createSvg(currentPattern()),
  );
  downloadFile(
    svg,
    "image/svg+xml;charset=utf-8",
    `contribution-pattern-${selectedYear}.svg`,
  );
});
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () =>
    document.getElementById(button.dataset.close).close(),
  );
});
els.pushBtn.addEventListener("click", () => openPublishReview());
els.resumeBtn.addEventListener("click", () => openPublishReview(true));
els.confirmPublishBtn.addEventListener("click", publish);
els.cancelBtn.addEventListener("click", () => runController?.abort());
window.addEventListener("pagehide", persistDraft);
window.addEventListener("beforeunload", (event) => {
  if (!publishing) return;
  event.preventDefault();
  event.returnValue = "";
});

for (const year of years) {
  const option = document.createElement("option");
  option.value = year;
  option.textContent = year;
  els.selYear.append(option);
}
const draft = loadDraft(storage(), years, today);
if (draft) {
  selectedYear = draft.selectedYear;
  for (const entry of draft.patterns) {
    const pattern = new Pattern(createCalendar(entry.year, today));
    pattern.replace(entry.cells);
    pattern.past.length = 0;
    patterns.set(entry.year, pattern);
  }
}
let initialLocale = detectLocale();
try {
  const saved = storage()?.getItem("contribution-painter:locale");
  if (LOCALES[saved]) initialLocale = saved;
} catch {
  /* Browser locale is the fallback when storage is restricted. */
}
await i18n.setLocale(initialLocale);
els.langSelect.value = i18n.locale;
numberFormat = new Intl.NumberFormat(i18n.locale);
dateFormat = new Intl.DateTimeFormat(i18n.locale, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
selectYear(selectedYear);
editor.setBrush(1);
applyLanguage();
els.langSelect.addEventListener("change", () => {
  try {
    storage()?.setItem("contribution-painter:locale", i18n.locale);
  } catch {
    /* Language persistence is optional. */
  }
});
document.body.dataset.ready = "true";
