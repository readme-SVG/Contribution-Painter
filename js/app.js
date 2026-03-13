// ── i18n ──
const i18n = window.I18N.createI18n('en-US');
let lang = 'en-US';

function t(k){ return i18n.t(k); }

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
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    el.textContent = t(el.dataset.i18n);
  });
  document.getElementById('hintToken').innerHTML = t('hint_token');
  document.getElementById('hintEmail').innerHTML = t('hint_email');
  document.querySelector('#multiplier option[value="1"]').textContent = t('mult_1');
  document.querySelector('#multiplier option[value="5"]').textContent = t('mult_5');
  document.querySelector('#multiplier option[value="10"]').textContent = t('mult_10');
  updateStats();
}

document.getElementById('langSelect').addEventListener('change', e=>{
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
  const sel = document.getElementById('selYear');
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
const graphEl = document.getElementById('graph');
const monthsEl = document.getElementById('months');

function rebuildGraph(){
  grid = Array(totalCols * ROWS).fill(0);
  graphEl.innerHTML = '';
  monthsEl.innerHTML = '';

  let lastM = -1;
  for(let c = 0; c < totalCols; c++){
    const d = new Date(startDate);
    d.setDate(d.getDate() + c * 7);
    const span = document.createElement('span');
    if(d.getMonth() !== lastM){ span.textContent = d.toLocaleString(lang,{month:'short'}); lastM = d.getMonth(); }
    monthsEl.appendChild(span);
  }

  const colDef = `repeat(${totalCols}, 13px)`;
  monthsEl.style.gridTemplateColumns = colDef;
  graphEl.style.gridTemplateColumns = colDef;

  const today = new Date(); today.setHours(23,59,59,999);
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd   = new Date(selectedYear, 11, 31); yearEnd.setHours(23,59,59,999);

  for(let c = 0; c < totalCols; c++){
    for(let r = 0; r < ROWS; r++){
      const d = new Date(startDate);
      d.setDate(d.getDate() + c * 7 + r);
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.i = c * ROWS + r;
      cell.dataset.ts = d.getTime();
      if(d < yearStart || d > yearEnd || d > today){
        cell.classList.add('out');
        cell.style.background = 'transparent';
      } else {
        cell.style.background = COLORS[0];
      }
      cell.addEventListener('mousedown', e=>{ e.preventDefault(); isDown = true; paint(cell); });
      cell.addEventListener('mouseenter', ()=>{ if(isDown) paint(cell); });
      graphEl.appendChild(cell);
    }
  }
  updateStats();
}

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
  updateStats();
}

function updateStats(){
  const mult = +document.getElementById('multiplier').value;
  document.getElementById('sDays').textContent = grid.filter(v=>v>0).length;
  document.getElementById('sCommits').textContent = grid.reduce((a,v)=>a+v*mult,0).toLocaleString();
  const end = new Date(startDate); end.setDate(end.getDate() + totalCols * 7 - 1);
  const fmt = d => d.toLocaleDateString(lang,{day:'numeric',month:'short',year:'numeric'});
  document.getElementById('sPeriod').textContent = fmt(startDate) + ' \u2014 ' + fmt(end);
}

// ── Controls ──
document.querySelectorAll('.swatch').forEach(s => s.addEventListener('click', ()=>{
  selLevel = +s.dataset.level;
  document.querySelectorAll('.swatch').forEach(x => x.classList.toggle('sel', x === s));
}));
document.addEventListener('keydown', e=>{
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  const n = parseInt(e.key);
  if(n >= 0 && n <= 5){
    selLevel = n;
    document.querySelectorAll('.swatch').forEach(s => s.classList.toggle('sel', +s.dataset.level === n));
  }
});
document.addEventListener('mouseup', ()=> isDown = false);
document.getElementById('multiplier').addEventListener('change', updateStats);

document.getElementById('clearBtn').addEventListener('click', ()=>{
  grid = Array(totalCols * ROWS).fill(0);
  document.querySelectorAll('.cell:not(.out)').forEach(c => c.style.background = COLORS[0]);
  updateStats(); setStatus('');
});
document.getElementById('fillBtn').addEventListener('click', ()=>{
  document.querySelectorAll('.cell:not(.out)').forEach(c=>{
    const i = +c.dataset.i;
    const level = resolveLevel();
    grid[i] = level;
    c.style.background = COLORS[level];
  });
  updateStats();
});
document.getElementById('invertBtn').addEventListener('click', ()=>{
  document.querySelectorAll('.cell:not(.out)').forEach(c=>{
    const i = +c.dataset.i;
    grid[i] = grid[i] === 0 ? resolveLevel() : 0;
    c.style.background = COLORS[grid[i]];
  });
  updateStats();
});

// ── Logging ──
function addLog(msg, type){
  const log = document.getElementById('log');
  const span = document.createElement('span');
  if(type) span.className = type;
  span.textContent = msg + '\n';
  log.appendChild(span);
  log.scrollTop = log.scrollHeight;
}
function setStatus(msg, type){
  const el = document.getElementById('statusBar');
  el.className = 'status-bar' + (type ? ' '+type : '');
  el.textContent = msg;
}

// ── GitHub API ──
async function api(token, method, path, body){
  const r = await fetch('https://api.github.com'+path, {
    method,
    headers:{ 'Authorization':'token '+token, 'Content-Type':'application/json', 'Accept':'application/vnd.github+json' },
    body: body ? JSON.stringify(body) : undefined
  });
  if(r.status === 204) return null;
  const data = await r.json();
  if(!r.ok) throw new Error(data.message || 'HTTP '+r.status);
  return data;
}

async function doPush(){
  const token   = document.getElementById('token').value.trim();
  const repo    = document.getElementById('repo').value.trim();
  const branch  = document.getElementById('branch').value.trim() || 'main';
  const mult    = +document.getElementById('multiplier').value;
  const email   = document.getElementById('email').value.trim();
  const gitname = document.getElementById('gitname').value.trim() || 'GitHub Painter';

  if(!token) { alert(t('alert_token')); return; }
  if(!repo || !repo.includes('/')) { alert(t('alert_repo')); return; }
  if(!email) { alert(t('alert_email')); return; }

  const commits = [];
  for(let c = 0; c < totalCols; c++){
    for(let r = 0; r < ROWS; r++){
      const level = grid[c * ROWS + r];
      if(!level) continue;
      const d = new Date(startDate);
      d.setDate(d.getDate() + c * 7 + r);
      d.setHours(12,0,0,0);
      const iso = d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
      for(let k = 0; k < level * mult; k++) commits.push({ date:iso, idx:`${c}-${r}-${k}` });
    }
  }
  if(!commits.length){ alert(t('alert_empty')); return; }

  const btn = document.getElementById('pushBtn');
  btn.disabled = true;
  document.getElementById('progress').classList.add('on');
  document.getElementById('log').innerHTML = '';
  document.getElementById('bar').style.width = '0%';
  setStatus('');

  try{
    addLog(t('log_checking'));
    await api(token, 'GET', `/repos/${repo}`);
    addLog(`${t('log_found')} ${repo}`, 'ok');

    let baseSha = null, baseTreeSha = null;
    try{
      const ref = await api(token, 'GET', `/repos/${repo}/git/ref/heads/${branch}`);
      baseSha = ref.object.sha;
      const c0 = await api(token, 'GET', `/repos/${repo}/git/commits/${baseSha}`);
      baseTreeSha = c0.tree.sha;
      addLog(`${t('log_branch_ok')} "${branch}"`, 'ok');
    }catch{ addLog(t('log_branch_new')); }

    addLog(t('log_blob'));
    const blob = await api(token, 'POST', `/repos/${repo}/git/blobs`, { content:'This GitHub contribution graph art was generated using Contribution-Painter. Create your own at: https://github.com/readme-SVG/Contribution-Painter\n', encoding:'utf-8' });

    const total = commits.length;
    let done = 0, currentSha = baseSha, currentTree = baseTreeSha;
    addLog(`${t('log_commits')} ${total.toLocaleString()}`);

    for(const cm of commits){
      const treePayload = { tree:[{ path:'contribution-painter.txt', mode:'100644', type:'blob', sha:blob.sha }] };
      if(currentTree) treePayload.base_tree = currentTree;
      const tree = await api(token, 'POST', `/repos/${repo}/git/trees`, treePayload);
      const newCommit = await api(token, 'POST', `/repos/${repo}/git/commits`, {
        message: `painted ${cm.idx}`, tree: tree.sha,
        author:    { name:gitname, email:email, date:cm.date },
        committer: { name:gitname, email:email, date:cm.date },
        parents: currentSha ? [currentSha] : []
      });
      currentSha = newCommit.sha; currentTree = tree.sha;
      done++;
      const pct = Math.round(done/total*100);
      document.getElementById('bar').style.width = pct+'%';
      if(done%25===0 || done===total) addLog(`  [${pct}%] ${done}/${total}`);
    }

    addLog(t('log_updating'));
    if(baseSha){
      await api(token, 'PATCH', `/repos/${repo}/git/refs/heads/${branch}`, { sha:currentSha, force:true });
    } else {
      await api(token, 'POST', `/repos/${repo}/git/refs`, { ref:`refs/heads/${branch}`, sha:currentSha });
    }

    addLog(`${t('log_done')} github.com/${repo}`, 'ok');
    document.getElementById('bar').style.width = '100%';
    setStatus(`${t('status_done')} github.com/${repo}`, 'ok');

  }catch(e){
    addLog(t('log_error')+' '+e.message, 'err');
    setStatus(t('status_error')+' '+e.message, 'err');
  }
  btn.disabled = false;
}

document.getElementById('pushBtn').addEventListener('click', doPush);

// ── Init ──
lang = detectInitialLocale();
i18n.setLocale(lang);
document.getElementById('langSelect').value = lang;
setYear(new Date().getFullYear());
applyLang();
