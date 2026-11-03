// ── i18n ──
const i18n = window.I18N.createI18n('en-US');
let lang = 'en-US';

function t(k){ return i18n.t(k); }

// ── Cached DOM references (avoids repeated lookups in hot paths) ──
const els = {
  langSelect: document.getElementById('langSelect'),
  selYear: document.getElementById('selYear'),
  token: document.getElementById('token'),
  repo: document.getElementById('repo'),
  email: document.getElementById('email'),
  gitname: document.getElementById('gitname'),
  branch: document.getElementById('branch'),
  multiplier: document.getElementById('multiplier'),
  commitSpread: document.getElementById('commitSpread'),
  fillPercent: document.getElementById('fillPercent'),
  clearBtn: document.getElementById('clearBtn'),
  fillBtn: document.getElementById('fillBtn'),
  pushBtn: document.getElementById('pushBtn'),
  graph: document.getElementById('graph'),
  months: document.getElementById('months'),
  sDays: document.getElementById('sDays'),
  sCommits: document.getElementById('sCommits'),
  sPeriod: document.getElementById('sPeriod'),
  progress: document.getElementById('progress'),
  bar: document.getElementById('bar'),
  log: document.getElementById('log'),
  statusBar: document.getElementById('statusBar'),
  hintToken: document.getElementById('hintToken'),
  hintEmail: document.getElementById('hintEmail')
};

function detectInitialLocale(){
  const browserLocale = navigator.language || 'en-US';
  const available = new Set(i18n.availableLocales);
  if(available.has(browserLocale)) return browserLocale;
  const base = browserLocale.split('-')[0];
  for(const code of i18n.availableLocales){
    if(code.split('-')[0] === base) return code;
  }
  return 'en-US';
}

function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.dataset.i18n);
  });
  els.hintToken.innerHTML = t('hint_token');
  els.hintEmail.innerHTML = t('hint_email');
  document.querySelector('#multiplier option[value="1"]').textContent = t('mult_1');
  document.querySelector('#multiplier option[value="5"]').textContent = t('mult_5');
  document.querySelector('#multiplier option[value="10"]').textContent = t('mult_10');
  updateStats();
}

els.langSelect.addEventListener('change', e=>{
  lang = e.target.value;
  i18n.setLocale(lang);
  applyLang();
});

// ── Graph state ──
const ROWS = 7;
const COLORS = ['#21262d','#0D4429','#016C31','#26A641','#39D353','#f39c12'];
let grid = [], selLevel = 0, isDown = false;
let startDate = new Date();
let totalCols = 53;
let selectedYear = new Date().getFullYear();

// ── Year selector ──
(()=>{
  const sel = els.selYear;
  const now = new Date().getFullYear();
  for(let y = now + 1; y >= now - 10; y--){
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    if(y === now) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', ()=> setYear(+sel.value));
})();

function setYear(year){
  selectedYear = year;
  const jan1 = new Date(year, 0, 1);
  const sun = new Date(jan1);
  sun.setDate(jan1.getDate() - jan1.getDay());
  sun.setHours(12,0,0,0);
  startDate = sun;

  const dec31 = new Date(year, 11, 31);
  const sat = new Date(dec31);
  sat.setDate(dec31.getDate() + (6 - dec31.getDay()));
  sat.setHours(12,0,0,0);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  totalCols = Math.round((sat - sun) / msPerWeek) + 1;
  rebuildGraph();
}

// ── Graph ──
const graphEl = els.graph;
const monthsEl = els.months;

function rebuildGraph(){
  grid = new Array(totalCols * ROWS).fill(0);
  graphEl.innerHTML = '';
  monthsEl.innerHTML = '';

  const monthsFrag = document.createDocumentFragment();
  let lastM = -1;
  for(let c = 0; c < totalCols; c++){
    const d = new Date(startDate);
    d.setDate(d.getDate() + c * 7);
    const span = document.createElement('span');
    if(d.getMonth() !== lastM){ span.textContent = d.toLocaleString(lang,{month:'short'}); lastM = d.getMonth(); }
    monthsFrag.appendChild(span);
  }
  monthsEl.appendChild(monthsFrag);

  const colDef = `repeat(${totalCols}, 13px)`;
  monthsEl.style.gridTemplateColumns = colDef;
  graphEl.style.gridTemplateColumns = colDef;

  const today = new Date(); today.setHours(23,59,59,999);
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd   = new Date(selectedYear, 11, 31); yearEnd.setHours(23,59,59,999);

  // Build all cells in a fragment so the whole grid is inserted with one reflow.
  const frag = document.createDocumentFragment();
  for(let c = 0; c < totalCols; c++){
    for(let r = 0; r < ROWS; r++){
      const d = new Date(startDate);
      d.setDate(d.getDate() + c * 7 + r);
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.i = c * ROWS + r;
      if(d < yearStart || d > yearEnd || d > today){
        cell.classList.add('out');
        cell.style.background = 'transparent';
      } else {
        cell.style.background = COLORS[0];
      }
      frag.appendChild(cell);
    }
  }
  graphEl.appendChild(frag);
  updateStats();
}

// Event delegation: two listeners on the container instead of two per cell
// (371 cells => 742 listeners before), which keeps drag-painting fast.
graphEl.addEventListener('mousedown', e=>{
  const cell = e.target.closest('.cell');
  if(!cell) return;
  e.preventDefault();
  isDown = true;
  paint(cell);
});
graphEl.addEventListener('mouseover', e=>{
  if(!isDown) return;
  const cell = e.target.closest('.cell');
  if(cell) paint(cell);
});

function resolveLevel(){
  if(selLevel === 5) return Math.floor(Math.random() * 5);
  return selLevel;
}

function paint(cell){
  if(cell.classList.contains('out')) return;
  const i = +cell.dataset.i;
  const level = resolveLevel();
  grid[i] = level;
  cell.style.background = COLORS[level];
  scheduleStatsUpdate();
}

// ── Stats ──
// Coalesce stat updates into one per animation frame so drag-painting stays smooth.
let statsScheduled = false;
function scheduleStatsUpdate(){
  if(statsScheduled) return;
  statsScheduled = true;
  requestAnimationFrame(()=>{
    statsScheduled = false;
    updateStats();
  });
}

function updateStats(){
  const mult = +els.multiplier.value;
  const isSpreadEnabled = els.commitSpread.value === 'plus2';
  // Single pass over the grid instead of reduce + two filter passes.
  let days = 0, minCommits = 0;
  for(let i = 0; i < grid.length; i++){
    const v = grid[i];
    if(v > 0){ days++; minCommits += v * mult; }
  }
  const maxCommits = isSpreadEnabled ? minCommits + days * 2 : minCommits;
  els.sDays.textContent = days;
  els.sCommits.textContent = isSpreadEnabled
    ? `${minCommits.toLocaleString()}-${maxCommits.toLocaleString()}`
    : minCommits.toLocaleString();
  const end = new Date(startDate); end.setDate(end.getDate() + totalCols * 7 - 1);
  const fmt = d => d.toLocaleDateString(lang,{day:'numeric',month:'short',year:'numeric'});
  els.sPeriod.textContent = fmt(startDate) + ' — ' + fmt(end);
}

// ── Controls ──
document.querySelectorAll('.swatch').forEach(s => s.addEventListener('click', ()=>{
  selLevel = +s.dataset.level;
  document.querySelectorAll('.swatch').forEach(x => x.classList.toggle('sel', x === s));
}));
document.addEventListener('keydown', e=>{
  const ae = document.activeElement;
  if(ae && ['INPUT','TEXTAREA','SELECT'].includes(ae.tagName)) return;
  const n = parseInt(e.key);
  if(n >= 0 && n <= 5){
    selLevel = n;
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('sel', +s.dataset.level === n));
  }
});
document.addEventListener('mouseup', ()=> isDown = false);
els.multiplier.addEventListener('change', updateStats);
els.commitSpread.addEventListener('change', updateStats);

els.clearBtn.addEventListener('click', ()=>{
  grid = new Array(totalCols * ROWS).fill(0);
  document.querySelectorAll('.cell:not(.out)').forEach(c => c.style.background = COLORS[0]);
  updateStats(); setStatus('');
});
els.fillBtn.addEventListener('click', ()=>{
  const fillPercent = getFillPercent();
  const activeCells = [...document.querySelectorAll('.cell:not(.out)')];
  const targetCount = Math.round(activeCells.length * (fillPercent / 100));
  const picked = new Set(pickRandomCells(activeCells, targetCount));

  activeCells.forEach(c=>{
    const i = +c.dataset.i;
    if(picked.has(c)){
      const level = resolveLevel();
      grid[i] = level;
      c.style.background = COLORS[level];
      return;
    }
    grid[i] = 0;
    c.style.background = COLORS[0];
  });
  updateStats();
});

function getFillPercent(){
  const input = els.fillPercent;
  const parsed = Number.parseFloat(input.value.trim().replace(',', '.'));
  const safe = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 100;
  input.value = `${safe}%`;
  return safe;
}

function pickRandomCells(cells, count){
  const pool = [...cells];
  for(let i = pool.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ── Logging ──
const MAX_LOG_ENTRIES = 400;
function addLog(msg, type){
  const log = els.log;
  const span = document.createElement('span');
  if(type) span.className = type;
  span.textContent = msg + '\n';
  log.appendChild(span);
  // Keep the log DOM bounded during very long runs.
  while(log.childElementCount > MAX_LOG_ENTRIES) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}
function setStatus(msg, type){
  const el = els.statusBar;
  el.className = 'status-bar' + (type ? ' '+type : '');
  el.textContent = msg;
}

// ── GitHub API ──
const API_BASE = 'https://api.github.com';
const API_TIMEOUT_MS = 30000;
const API_MAX_ATTEMPTS = 3;

function sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function api(token, method, path, body){
  for(let attempt = 1; ; attempt++){
    let r;
    try{
      r = await fetch(API_BASE + path, {
        method,
        headers:{
          'Authorization': 'token ' + token,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(API_TIMEOUT_MS)
      });
    }catch(err){
      // Network failure or timeout. Only idempotent reads are safe to retry:
      // a failed write may still have been applied server-side.
      if(method === 'GET' && attempt < API_MAX_ATTEMPTS){
        await sleep(500 * attempt);
        continue;
      }
      throw new Error('Network error: ' + err.message);
    }

    if(r.status === 204 || r.status === 205) return null;

    const contentType = r.headers.get('content-type') || '';
    const text = await r.text();
    const isJson = contentType.includes('json');

    if(!r.ok){
      let message = 'HTTP ' + r.status;
      if(isJson && text){
        try{
          const data = JSON.parse(text);
          if(data.message) message = data.message;
          if(Array.isArray(data.errors) && data.errors.length){
            message += ' — ' + data.errors.map(e => e.message || e.code).join('; ');
          }
        }catch{ /* keep the plain HTTP status message */ }
      }
      if((r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0'){
        message = 'GitHub API rate limit exceeded. ' + message;
      }
      const err = new Error(message);
      err.status = r.status;
      // 429 means the request was rejected before processing, so any method may retry.
      if(r.status === 429 && attempt < API_MAX_ATTEMPTS){
        const waitSec = Math.min(Number(r.headers.get('retry-after')) || 5, 60);
        await sleep(waitSec * 1000);
        continue;
      }
      // Server-side failures on reads are transient and safe to retry.
      if(r.status >= 500 && method === 'GET' && attempt < API_MAX_ATTEMPTS){
        await sleep(500 * attempt);
        continue;
      }
      throw err;
    }

    if(!text) return null;
    if(!isJson) return text;
    return JSON.parse(text);
  }
}

// ── Input validation ──
// GitHub owner/repo: alphanumerics plus - _ . (segments are URL-encoded below,
// so user input can never alter the request path or host).
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;
// Minimal email sanity check — GitHub rejects a malformed email with a 422,
// which would otherwise abort the run only after many commits were created.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// git-check-ref-format rules (subset) for branch names.
const BAD_REF_RE = /[\x00-\x20~^:?*[\\]|\.\.|@\{|(^[-/])|([/.]$)|\.lock$/i;

function encSeg(s){ return encodeURIComponent(s); }

async function doPush(){
  const token   = els.token.value.trim();
  const repo    = els.repo.value.trim();
  const branch  = els.branch.value.trim() || 'main';
  const mult    = +els.multiplier.value;
  const spreadMode = els.commitSpread.value;
  const email   = els.email.value.trim();
  const gitname = els.gitname.value.trim() || 'GitHub Painter';

  if(!token) { alert(t('alert_token')); return; }
  if(!REPO_RE.test(repo) || repo.split('/').some(s => s === '.' || s === '..')) { alert(t('alert_repo')); return; }
  if(!EMAIL_RE.test(email)) { alert(t('alert_email')); return; }
  if(BAD_REF_RE.test(branch)) { alert(t('alert_branch')); return; }

  const [owner, repoName] = repo.split('/');
  const repoPath = `/repos/${encSeg(owner)}/${encSeg(repoName)}`;
  const branchPath = branch.split('/').map(encSeg).join('/');

  const commits = [];
  for(let c = 0; c < totalCols; c++){
    for(let r = 0; r < ROWS; r++){
      const level = grid[c * ROWS + r];
      if(!level) continue;
      const d = new Date(startDate);
      d.setDate(d.getDate() + c * 7 + r);
      d.setHours(12,0,0,0);
      const iso = d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
      const baseCount = level * mult;
      const spreadBoost = spreadMode === 'plus2' ? Math.floor(Math.random() * 3) : 0;
      const commitCount = baseCount + spreadBoost;
      for(let k = 0; k < commitCount; k++) commits.push({ date:iso, idx:`${c}-${r}-${k}` });
    }
  }
  if(!commits.length){ alert(t('alert_empty')); return; }

  const btn = els.pushBtn;
  btn.disabled = true;
  els.progress.classList.add('on');
  els.log.innerHTML = '';
  els.bar.style.width = '0%';
  setStatus('');

  try{
    addLog(t('log_checking'));
    await api(token, 'GET', repoPath);
    addLog(`${t('log_found')} ${repo}`, 'ok');

    let baseSha = null, baseTreeSha = null;
    try{
      const ref = await api(token, 'GET', `${repoPath}/git/ref/heads/${branchPath}`);
      baseSha = ref.object.sha;
      const c0 = await api(token, 'GET', `${repoPath}/git/commits/${baseSha}`);
      baseTreeSha = c0.tree.sha;
      addLog(`${t('log_branch_ok')} "${branch}"`, 'ok');
    }catch(err){
      // Only a genuine 404 means "branch does not exist yet"; anything else
      // (bad token, missing access, server error) must abort before any commit.
      if(err && err.status === 404) addLog(t('log_branch_new'));
      else throw err;
    }

    // Pre-flight quota check: every commit costs 2 requests (tree + commit),
    // so make sure the remaining rate limit can cover the whole run before
    // creating anything.
    try{
      const rl = await api(token, 'GET', '/rate_limit');
      const core = rl && rl.resources && rl.resources.core;
      const needed = commits.length * 2 + 5;
      if(core && core.remaining < needed){
        addLog(`${t('log_error')} rate limit: ${core.remaining} remaining, ~${needed} needed`, 'err');
        setStatus(`${t('status_error')} rate limit (${core.remaining}/${needed})`, 'err');
        return;
      }
    }catch{ /* the quota probe is best-effort */ }

    addLog(t('log_blob'));
    const blob = await api(token, 'POST', `${repoPath}/git/blobs`, { content:'This GitHub contribution graph art was generated using Contribution-Painter. Create your own at: https://github.com/readme-SVG/Contribution-Painter\n', encoding:'utf-8' });

    const total = commits.length;
    let done = 0, currentSha = baseSha, currentTree = baseTreeSha;
    addLog(`${t('log_commits')} ${total.toLocaleString()}`);

    for(const cm of commits){
      const treePayload = { tree:[{ path:'contribution-painter.txt', mode:'100644', type:'blob', sha:blob.sha }] };
      if(currentTree) treePayload.base_tree = currentTree;
      const tree = await api(token, 'POST', `${repoPath}/git/trees`, treePayload);
      const newCommit = await api(token, 'POST', `${repoPath}/git/commits`, {
        message: `painted ${cm.idx}`, tree: tree.sha,
        author:    { name:gitname, email:email, date:cm.date },
        committer: { name:gitname, email:email, date:cm.date },
        parents: currentSha ? [currentSha] : []
      });
      currentSha = newCommit.sha; currentTree = tree.sha;
      done++;
      const pct = Math.round(done/total*100);
      els.bar.style.width = pct + '%';
      if(done % 25 === 0 || done === total) addLog(`  [${pct}%] ${done}/${total}`);
    }

    addLog(t('log_updating'));
    if(baseSha){
      await api(token, 'PATCH', `${repoPath}/git/refs/heads/${branchPath}`, { sha:currentSha, force:true });
    } else {
      await api(token, 'POST', `${repoPath}/git/refs`, { ref:`refs/heads/${branch}`, sha:currentSha });
    }

    addLog(`${t('log_done')} github.com/${repo}`, 'ok');
    els.bar.style.width = '100%';
    setStatus(`${t('status_done')} github.com/${repo}`, 'ok');

  }catch(e){
    addLog(t('log_error') + ' ' + e.message, 'err');
    setStatus(t('status_error') + ' ' + e.message, 'err');
  }finally{
    btn.disabled = false;
  }
}

els.pushBtn.addEventListener('click', doPush);

// ── Init ──
lang = detectInitialLocale();
i18n.setLocale(lang);
els.langSelect.value = lang;
setYear(new Date().getFullYear());
applyLang();
