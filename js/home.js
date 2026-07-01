import { db } from './firebase.js';
import {
  collection, getDocs, addDoc, query, orderBy, limit, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const ROUTINES_COL = collection(db, 'seba', 'data', 'routines');
const SESSIONS_COL = collection(db, 'seba', 'data', 'sessions');

// ── State ─────────────────────────────────────────────────
let routines  = [];
let sessions  = [];          // recent sessions, desc by startedAt
let active    = null;        // active session object
let pending   = null;        // routine awaiting start confirmation
let timerID   = null;

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

async function persistSession(data) {
  await addDoc(SESSIONS_COL, data);
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

// ── Start confirmation sheet ──────────────────────────────

function openStartSheet(routine) {
  pending = routine;
  const count = (routine.exercises || []).length;
  document.getElementById('home-start-title').textContent = `Start "${routine.name}"?`;
  document.getElementById('home-start-meta').textContent =
    `${count} exercise${count !== 1 ? 's' : ''}`;
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
}

function wireSessEvents(container) {
  // Input → state
  container.querySelectorAll('.sess-input').forEach(inp => {
    inp.addEventListener('change', () => {
      active.exercises[+inp.dataset.ei].sets[+inp.dataset.si][inp.dataset.field] =
        parseFloat(inp.value) || 0;
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

  document.getElementById('ex-overlay').classList.add('active');
  document.getElementById('sess-finish-sheet').classList.add('active');
}

function closeFinishSheet() {
  document.getElementById('sess-finish-sheet').classList.remove('active');
  document.getElementById('ex-overlay').classList.remove('active');
}

async function saveSession() {
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
    await persistSession(data);
    sessions.unshift(data);
    closeFinishSheet();
    closeSessionScreen();
    renderHome();
  } catch (err) {
    console.error(err);
    alert('Failed to save. Try again.');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Save Session';
  }
}

// ── Init ──────────────────────────────────────────────────

export async function initHome() {
  [routines, sessions] = await Promise.all([fetchRoutines(), fetchSessions()]);
  renderHome();

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
