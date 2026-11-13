import { createCalendar, MAX_LEVEL } from "./calendar.js";

export const FORMAT = "contribution-painter";
export const MAX_FILE_BYTES = 64 * 1024;
const DRAFT_KEY = "contribution-painter:draft:v1";

export function serializePattern(pattern) {
  const cells = {};
  for (const index of pattern.calendar.activeIndices) {
    const level = pattern.levels[index];
    if (level) cells[pattern.calendar.days[index].key] = level;
  }
  return { format: FORMAT, version: 1, year: pattern.calendar.year, cells };
}

export function validateDocument(value, years, today = new Date()) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("alert_import");
  if (
    value.format !== FORMAT ||
    value.version !== 1 ||
    !years.includes(value.year)
  )
    throw new Error("alert_import");
  if (
    !value.cells ||
    typeof value.cells !== "object" ||
    Array.isArray(value.cells)
  )
    throw new Error("alert_import");
  const entries = Object.entries(value.cells);
  if (entries.length > 366) throw new Error("alert_import");
  const calendar = createCalendar(value.year, today);
  for (const [key, level] of entries) {
    if (
      !calendar.byDate.get(key)?.editable ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > MAX_LEVEL
    ) {
      throw new Error("alert_import");
    }
  }
  return {
    format: FORMAT,
    version: 1,
    year: value.year,
    cells: Object.fromEntries(entries),
  };
}

export function parseDocument(text, years, today = new Date()) {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error("alert_file_size");
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("alert_import");
  }
  return validateDocument(value, years, today);
}

export function loadDraft(storage, years, today = new Date()) {
  try {
    const text = storage.getItem(DRAFT_KEY);
    if (!text || text.length > MAX_FILE_BYTES) return null;
    const value = JSON.parse(text);
    if (
      value?.format !== FORMAT ||
      value.version !== 1 ||
      !Array.isArray(value.patterns) ||
      value.patterns.length > years.length
    ) {
      return null;
    }
    const patterns = value.patterns.map((pattern) =>
      validateDocument(pattern, years, today),
    );
    if (
      new Set(patterns.map((pattern) => pattern.year)).size !== patterns.length
    )
      return null;
    return {
      patterns,
      selectedYear: years.includes(value.selectedYear)
        ? value.selectedYear
        : years[1],
    };
  } catch {
    return null;
  }
}

export function saveDraft(storage, patterns, selectedYear) {
  try {
    storage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        format: FORMAT,
        version: 1,
        selectedYear,
        patterns: [...patterns.values()].map(serializePattern),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function downloadFile(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
