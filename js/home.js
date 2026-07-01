import { db } from './firebase.js';
import {
  collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, limit, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const ROUTINES_COL = collection(db, 'seba', 'data', 'routines');
const SESSIONS_COL = collection(db, 'seba', 'data', 'sessions');

// ── State ─────────────────────────────────────────────────
let routines  = [];
let sessions  = [];          // recent sessions, desc by startedAt
let active    = null;        // active session object
let pending   = null;        // routine awaiting start confirmation
let timerID   = null;
let saveTimer = null;

// ── localStorage draft ────────────────────────────────────

const DRAFT_KEY = 'seba_gym_active_session';

function saveToLocal() {
  if (!active) return;
  try {
    const payload = {
      routineId:   active.routineId,
      routineName: active.routineName,
      startedAt:   { seconds: active.startedAt.seconds, nanoseconds: active.startedAt.nanoseconds },
      exercises:   active.exercises,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    console.log('[Recovery] Draft saved — key:', DRAFT_KEY, '| routine:', payload.routineName);
  } catch (e) {
    console.warn('[Recovery] Could not write to localStorage:', e);
  }
}

function clearLocal() {
  localStorage.removeItem(DRAFT_KEY);
}

function debouncedSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveToLocal, 500);
}

// ── Firestore ─────────────────────────────────────────────

async function fetchRoutines() {
  const snap = await getDocs(ROUTINES_COL);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function fetchSessions() {
  try {
    const q = query(SESSIONS_COL, orderBy('startedAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    // Index may not exist yet on first run
    const snap = await getDocs(SESSIONS_COL);
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.startedAt?.seconds ?? 0) - (a.startedAt?.seconds ?? 0));
  }
}

function sanitizeForFirestore(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (value === undefined) return null;
    if (typeof value === 'number' && isNaN(value)) return 0;
    return value;
  }));
}

async function persistSession(data) {
  const clean = sanitizeForFirestore(data);
  console.log('[Session] Writing to Firestore:', JSON.stringify(clean, null, 2));
  const ref = await addDoc(SESSIONS_COL, clean);
  return ref.id;
}

// ── Helpers ───────────────────────────────────────────────

function daysAgo(ts) {
  if (!ts) return 'Never';
  const days = Math.floor((Date.now() - ts.seconds * 1000) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
const pad = n => String(n).padStart(2, '0');

function lastSessionForRoutine(routineId) {
  return sessions.find(s => s.routineId === routineId) || null;
}

function lastSetsForExercise(exerciseId) {
  const s = sessions.find(s => s.exercises?.some(e => e.exerciseId === exerciseId));
  if (!s) return null;
  return s.exercises.find(e => e.exerciseId === exerciseId)?.sets || null;
}

// ── Home screen ───────────────────────────────────────────

function renderHome() {
  const list = document.getElementById('home-routines-list');
  if (!routines.length) {
    list.innerHTML = `
      <div class="ex-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <p>No routines yet</p>
        <span>Create a routine in the Routines tab first</span>
      </div>`;
    return;
  }
  list.innerHTML = routines.map(r => {
    const count = (r.exercises || []).length;
    const last  = lastSessionForRoutine(r.id);
    return `
      <div class="home-card" data-id="${r.id}">
        <div class="home-card-body">
          <div class="home-card-name">${r.name}</div>
          <div class="home-card-meta">
            <span>${count} exercise${count !== 1 ? 's' : ''}</span>
            <span class="rt-dot">·</span>
            <span>${daysAgo(last?.startedAt)}</span>
          </div>
        </div>
        <svg class="rt-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>`;
  }).join('');

  list.querySelectorAll('.home-card').forEach(card => {
    card.addEventListener('click', () => {
      const r = routines.find(x => x.id === card.dataset.id);
      if (r) openStartSheet(r);
    });
  });
}

function renderSessions() {
  const wrap = document.getElementById('home-sessions-wrap');
  if (!sessions.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';
  document.getElementById('home-sessions-list').innerHTML = sessions.slice(0, 20).map(s => {
    const date = s.startedAt
      ? new Date(s.startedAt.seconds * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : '—';
    const dur = s.durationSeconds ? formatTime(s.durationSeconds) : '—';
    const sets = (s.exercises || []).reduce((n, ex) => n + (ex.sets?.filter(x => x.completed)?.length || 0), 0);
    return `
      <div class="sess-hist-card" data-id="${s.id}">
        <div class="sess-hist-body">
          <div class="sess-hist-name">${s.routineName}</div>
          <div class="sess-hist-meta">${date} · ${dur} · ${sets} sets</div>
        </div>
        <button class="sess-hist-del" data-id="${s.id}" aria-label="Delete session">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </button>
      </div>`;
  }).join('');

  document.querySelectorAll('.sess-hist-card').forEach(card => {
    card.addEventListener('click', () => {
      const s = sessions.find(x => x.id === card.dataset.id);
      if (s) openSessionDetail(s);
    });
  });

  document.querySelectorAll('.sess-hist-del').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('Delete this session?')) return;
      const id = btn.dataset.id;
      console.log('[Session] Deleting session id:', id);
      await deleteDoc(doc(db, 'seba', 'data', 'sessions', id));
      console.log('[Session] Deleted from Firestore');
      sessions = sessions.filter(s => s.id !== id);
      renderHome();
      renderSessions();
    });
  });
}

// ── Session detail view ───────────────────────────────────

function openSessionDetail(s) {
  const date = s.startedAt
    ? new Date(s.startedAt.seconds * 1000).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
      })
    : '—';
  const dur = s.durationSeconds ? formatTime(s.durationSeconds) : '—';
  let totalVol = 0;
  (s.exercises || []).forEach(ex =>
    (ex.sets || []).forEach(set => {
      if (set.completed) totalVol += (set.weight || 0) * (set.reps || 0);
    })
  );

  document.getElementById('sd-name').textContent   = s.routineName;
  document.getElementById('sd-date').textContent   = date;
  document.getElementById('sd-dur').textContent    = dur;
  document.getElementById('sd-vol').textContent    = `${totalVol.toLocaleString()} kg`;

  document.getElementById('sd-exercises').innerHTML = (s.exercises || []).map((ex, ei) => `
    <div class="sd-ex-block">
      <div class="sd-ex-title">
        ${ex.exerciseName}
        <span class="sess-ex-equip">(${ex.equipment})</span>
      </div>
      <div class="sess-table-wrap">
        <div class="sess-row sess-header">
          <span>Set</span><span></span><span>kg</span><span>Reps</span><span></span>
        </div>
        ${(ex.sets || []).map((s, si) => `
          <div class="sess-row sd-set-row${s.completed ? ' done' : ''}">
            <span class="sess-set-num">${si + 1}</span>
            <span></span>
            <span class="sd-val">${s.weight || '—'}</span>
            <span class="sd-val">${s.reps || '—'}</span>
            <span>${s.completed ? '✓' : ''}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  document.getElementById('session-detail').style.display = 'flex';
}

function closeSessionDetail() {
  document.getElementById('session-detail').style.display = 'none';
}

// ── Start confirmation sheet ──────────────────────────────

function openStartSheet(routine) {
  pending = routine;
  const exercises = routine.exercises || [];
  document.getElementById('home-start-title').textContent = `Start "${routine.name}"?`;
  document.getElementById('home-start-meta').innerHTML =
    exercises.map(ex => `<div class="home-start-ex">– ${ex.exerciseName}</div>`).join('');
  document.getElementById('ex-overlay').classList.add('active');
  document.getElementById('home-start-sheet').classList.add('active');
}

function closeStartSheet() {
  document.getElementById('home-start-sheet').classList.remove('active');
  document.getElementById('ex-overlay').classList.remove('active');
  pending = null;
}

// ── Start session ─────────────────────────────────────────

function beginSession() {
  if (!pending) return;
  const routine = pending;
  closeStartSheet();

  const exercises = (routine.exercises || []).map(ex => {
    const prevSets = lastSetsForExercise(ex.exerciseId);
    const source   = prevSets || ex.sets || [];
    return {
      exerciseId:   ex.exerciseId,
      exerciseName: ex.exerciseName,
      equipment:    ex.equipment,
      previousSets: prevSets,
      sets: source.map(s => ({ weight: s.weight ?? 0, reps: s.reps ?? 0, completed: false })),
    };
  });

  active = {
    routineId:   routine.id,
    routineName: routine.name,
    startedAt:   Timestamp.now(),
    exercises,
  };

  openSessionScreen();
}

// ── Active session screen ─────────────────────────────────

function openSessionScreen() {
  const screen = document.getElementById('session-screen');
  screen.style.display = 'flex';
  document.getElementById('sess-routine-name').textContent = active.routineName;
  document.getElementById('sess-date').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });
  renderSets();
  startTimer();
  initSwipeDelete(document.getElementById('sess-exercises'));
}

// Snapshot all visible input values into active state before any re-render
function snapshotInputs() {
  document.querySelectorAll('.sess-set-row').forEach(row => {
    const ei = +row.dataset.ei, si = +row.dataset.si;
    if (!active.exercises[ei]?.sets[si]) return;
    const w = row.querySelector('[data-field="weight"]');
    const r = row.querySelector('[data-field="reps"]');
    if (w) active.exercises[ei].sets[si].weight = parseFloat(w.value) || 0;
    if (r) active.exercises[ei].sets[si].reps   = parseFloat(r.value) || 0;
  });
}

// Swipe-left to delete a set row. Uses event delegation on the container so
// it covers dynamically added rows (+ Add set) without re-attaching listeners.
function initSwipeDelete(container) {
  let startX = 0, startY = 0, dragRow = null, axisLocked = false;

  container.addEventListener('touchstart', e => {
    const row = e.target.closest('.sess-set-row');
    if (!row) return;
    dragRow   = row;
    startX    = e.touches[0].clientX;
    startY    = e.touches[0].clientY;
    axisLocked = false;
  }, { passive: true });

  container.addEventListener('touchmove', e => {
    if (!dragRow) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!axisLocked) {
      // Cancel if scrolling vertically
      if (Math.abs(dy) > Math.abs(dx)) { dragRow = null; return; }
      axisLocked = true;
    }
    if (dx < 0) {
      dragRow.style.transition = 'none';
      dragRow.style.transform  = `translateX(${Math.max(dx, -90)}px)`;
    }
  }, { passive: true });

  container.addEventListener('touchend', e => {
    if (!dragRow) return;
    const dx  = e.changedTouches[0].clientX - startX;
    const row = dragRow;
    dragRow   = null;

    if (dx < -60) {
      // Commit delete: animate out then splice
      row.style.transition = 'transform 0.18s ease, opacity 0.18s ease';
      row.style.transform  = 'translateX(-100%)';
      row.style.opacity    = '0';
      setTimeout(() => {
        const ei = +row.dataset.ei, si = +row.dataset.si;
        snapshotInputs();
        if (active.exercises[ei]) {
          active.exercises[ei].sets.splice(si, 1);
          renderSets();
        }
      }, 180);
    } else {
      // Snap back
      row.style.transition = 'transform 0.2s ease';
      row.style.transform  = '';
      setTimeout(() => { row.style.transition = ''; }, 200);
    }
  }, { passive: true });
}

function closeSessionScreen() {
  document.getElementById('session-screen').style.display = 'none';
  stopTimer();
  active = null;
}

function startTimer() {
  const startMs = active.startedAt.seconds * 1000;
  const el = document.getElementById('sess-timer');
  const tick = () => { el.textContent = formatTime(Math.floor((Date.now() - startMs) / 1000)); };
  tick();
  timerID = setInterval(tick, 1000);
}

function stopTimer() { clearInterval(timerID); timerID = null; }

// ── Session exercise list ─────────────────────────────────

function renderSets() {
  const container = document.getElementById('sess-exercises');
  container.innerHTML = active.exercises.map((ex, ei) => {
    const prev = ex.previousSets || [];
    return `
      <div class="sess-block" data-ei="${ei}">
        <div class="sess-ex-title">
          ${ex.exerciseName}
          <span class="sess-ex-equip">(${ex.equipment})</span>
        </div>
        <div class="sess-table-wrap">
          <div class="sess-row sess-header">
            <span>Serie</span>
            <span>Previous</span>
            <span>kg</span>
            <span>Reps</span>
            <span></span>
          </div>
          ${ex.sets.map((s, si) => {
            const p = prev[si];
            const prevStr = (p?.weight && p?.reps) ? `${p.weight}×${p.reps}` : '—';
            return `
              <div class="sess-row sess-set-row${s.completed ? ' done' : ''}" data-ei="${ei}" data-si="${si}">
                <span class="sess-set-num">${si + 1}</span>
                <span class="sess-prev">${prevStr}</span>
                <input class="sess-input" type="number" inputmode="decimal" min="0" step="0.5"
                  value="${s.weight || ''}" placeholder="—"
                  data-ei="${ei}" data-si="${si}" data-field="weight" onfocus="this.select()" />
                <input class="sess-input" type="number" inputmode="numeric" min="0"
                  value="${s.reps || ''}" placeholder="—"
                  data-ei="${ei}" data-si="${si}" data-field="reps" onfocus="this.select()" />
                <button class="sess-check${s.completed ? ' done' : ''}" data-ei="${ei}" data-si="${si}" aria-label="Complete">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>`;
          }).join('')}
        </div>
        <button class="sess-add-set" data-ei="${ei}">+ Add set</button>
      </div>`;
  }).join('');

  wireSessEvents(container);
  saveToLocal();
}

function wireSessEvents(container) {
  // Input → state
  container.querySelectorAll('.sess-input').forEach(inp => {
    inp.addEventListener('change', () => {
      active.exercises[+inp.dataset.ei].sets[+inp.dataset.si][inp.dataset.field] =
        parseFloat(inp.value) || 0;
      debouncedSave();
    });
  });

  // Checkmark toggle
  container.querySelectorAll('.sess-check').forEach(btn => {
    btn.addEventListener('click', () => {
      const ei = +btn.dataset.ei, si = +btn.dataset.si;
      // snapshot inputs before re-render
      const row = btn.closest('.sess-set-row');
      const w = row.querySelector('[data-field="weight"]');
      const r = row.querySelector('[data-field="reps"]');
      if (w) active.exercises[ei].sets[si].weight = parseFloat(w.value) || 0;
      if (r) active.exercises[ei].sets[si].reps   = parseFloat(r.value) || 0;
      active.exercises[ei].sets[si].completed = !active.exercises[ei].sets[si].completed;
      renderSets();
    });
  });

  // Add set
  container.querySelectorAll('.sess-add-set').forEach(btn => {
    btn.addEventListener('click', () => {
      const ei = +btn.dataset.ei;
      const sets = active.exercises[ei].sets;
      const last  = sets[sets.length - 1] || {};
      // snapshot last row's inputs
      const rows = container.querySelectorAll(`.sess-set-row[data-ei="${ei}"]`);
      const lastRow = rows[rows.length - 1];
      let w = last.weight || 0, r = last.reps || 0;
      if (lastRow) {
        const wi = lastRow.querySelector('[data-field="weight"]');
        const ri = lastRow.querySelector('[data-field="reps"]');
        if (wi) w = parseFloat(wi.value) || 0;
        if (ri) r = parseFloat(ri.value) || 0;
      }
      sets.push({ weight: w, reps: r, completed: false });
      renderSets();
      setTimeout(() => {
        const all = document.querySelectorAll(`.sess-set-row[data-ei="${ei}"]`);
        all[all.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 60);
    });
  });
}

// ── Finish flow ───────────────────────────────────────────

function openFinishSheet() {
  console.log('[Session] Finish tapped');
  // Snapshot all current input values
  active.exercises.forEach((ex, ei) => {
    ex.sets.forEach((s, si) => {
      const row = document.querySelector(`.sess-set-row[data-ei="${ei}"][data-si="${si}"]`);
      if (!row) return;
      const w = row.querySelector('[data-field="weight"]');
      const r = row.querySelector('[data-field="reps"]');
      if (w) s.weight = parseFloat(w.value) || 0;
      if (r) s.reps   = parseFloat(r.value) || 0;
    });
  });

  const now      = Timestamp.now();
  const durSecs  = now.seconds - active.startedAt.seconds;
  let totalSets  = 0, totalVol = 0;
  active.exercises.forEach(ex => {
    ex.sets.forEach(s => {
      if (s.completed) {
        totalSets++;
        totalVol += (s.weight || 0) * (s.reps || 0);
      }
    });
  });

  document.getElementById('fin-name').textContent     = active.routineName;
  document.getElementById('fin-duration').textContent  = formatTime(durSecs);
  document.getElementById('fin-sets').textContent      = `${totalSets} set${totalSets !== 1 ? 's' : ''}`;
  document.getElementById('fin-volume').textContent    = `${totalVol.toLocaleString()} kg`;

  active._finishedAt  = now;
  active._durSecs     = durSecs;

  document.getElementById('sess-overlay').classList.add('active');
  document.getElementById('sess-finish-sheet').classList.add('active');
  console.log('[Session] Finish sheet shown — sets:', totalSets, 'volume:', totalVol);
}

function closeFinishSheet() {
  document.getElementById('sess-finish-sheet').classList.remove('active');
  document.getElementById('sess-overlay').classList.remove('active');
  console.log('[Session] Finish sheet closed — continuing session');
}

async function saveSession() {
  console.log('[Session] Save tapped');
  const btn = document.getElementById('fin-save-btn');
  btn.disabled  = true;
  btn.textContent = 'Saving…';
  try {
    const data = {
      routineId:       active.routineId,
      routineName:     active.routineName,
      startedAt:       active.startedAt,
      finishedAt:      active._finishedAt,
      durationSeconds: active._durSecs,
      exercises: active.exercises.map(ex => ({
        exerciseId:   ex.exerciseId,
        exerciseName: ex.exerciseName,
        equipment:    ex.equipment,
        sets: ex.sets.map(s => ({
          weight:    s.weight    || 0,
          reps:      s.reps      || 0,
          completed: s.completed || false,
        })),
      })),
    };
    const newId = await persistSession(data);
    console.log('[Session] Saved to Firestore, id:', newId);
    sessions.unshift({ id: newId, ...data });
    clearLocal();
    closeFinishSheet();
    closeSessionScreen();
    renderHome();
    renderSessions();
    console.log('[Session] Navigated back to Home');
  } catch (err) {
    console.error('[Session] Save failed — code:', err?.code, '| message:', err?.message, err);
    alert(`Failed to save.\nError: ${err?.code || err?.message || 'unknown'}\nCheck console for details.`);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save Session';
  }
}

// ── Session recovery ──────────────────────────────────────

function checkRecovery() {
  const raw = localStorage.getItem(DRAFT_KEY);
  console.log('[Recovery] checkRecovery — draft found:', !!raw);
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { clearLocal(); return; }
  if (!data?.routineName || !data?.startedAt?.seconds) { clearLocal(); return; }

  const d = new Date(data.startedAt.seconds * 1000);
  const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const overlay = document.createElement('div');
  overlay.className = 'recovery-overlay';
  overlay.innerHTML = `
    <div class="recovery-modal">
      <div class="recovery-title">Unfinished Session</div>
      <div class="recovery-body">
        You have an unfinished <strong>${data.routineName}</strong> session from ${label}. Continue?
      </div>
      <button id="recovery-continue" class="recovery-btn recovery-btn--primary">Continue</button>
      <button id="recovery-discard" class="recovery-btn recovery-btn--ghost">Discard</button>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#recovery-continue').addEventListener('click', () => {
    overlay.remove();
    active = {
      routineId:   data.routineId,
      routineName: data.routineName,
      startedAt:   new Timestamp(data.startedAt.seconds, data.startedAt.nanoseconds ?? 0),
      exercises:   data.exercises,
    };
    openSessionScreen();
  });

  overlay.querySelector('#recovery-discard').addEventListener('click', () => {
    overlay.remove();
    clearLocal();
  });
}

// ── Init ──────────────────────────────────────────────────

export async function initHome() {
  checkRecovery();

  [routines, sessions] = await Promise.all([fetchRoutines(), fetchSessions()]);
  renderHome();
  renderSessions();

  document.getElementById('sd-close').addEventListener('click', closeSessionDetail);
  document.getElementById('home-start-cancel').addEventListener('click', closeStartSheet);
  document.getElementById('home-start-confirm').addEventListener('click', beginSession);

  document.getElementById('sess-finish-btn').addEventListener('click', openFinishSheet);
  document.getElementById('fin-cancel-btn').addEventListener('click', closeFinishSheet);
  document.getElementById('fin-save-btn').addEventListener('click', saveSession);

  document.getElementById('ex-overlay').addEventListener('click', e => {
    if (e.target.id !== 'ex-overlay') return;
    closeStartSheet();
    closeFinishSheet();
  });
}
