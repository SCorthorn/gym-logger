import { db } from './firebase.js';
import { store } from './store.js';
import {
  collection, getDocs, addDoc, setDoc, deleteDoc, doc, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const ROUTINES_COL = collection(db, 'seba', 'data', 'routines');
const EXERCISES_COL = collection(db, 'seba', 'data', 'exercises');

// ── State ─────────────────────────────────────────────────
let routines = [];
let current = null;        // deep-copy of routine being edited
let pickerFilter = 'All';
let pickerSearch = '';

// ── Firestore ─────────────────────────────────────────────

const DEFAULT_ROUTINES = [
  {
    name: "A",
    exercises: [
      { exerciseId: "squat",               exerciseName: "Squat",               sets: [{ reps: 8, weight: 50 }, { reps: 8, weight: 50 }, { reps: 8, weight: 50 }] },
      { exerciseId: "seated_row",          exerciseName: "Seated Row",          sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }] },
      { exerciseId: "lateral_raise",       exerciseName: "Lateral Raise",       sets: [{ reps: 8, weight: 8 }, { reps: 8, weight: 8 }, { reps: 8, weight: 8 }, { reps: 8, weight: 8 }] },
      { exerciseId: "standing_calf_raise", exerciseName: "Standing Calf Raise", sets: [{ reps: 10, weight: 50 }, { reps: 10, weight: 50 }, { reps: 10, weight: 50 }] },
      { exerciseId: "hip_abductor",        exerciseName: "Hip Abductor",        sets: [{ reps: 8, weight: 85 }, { reps: 8, weight: 85 }, { reps: 8, weight: 85 }] }
    ]
  },
  {
    name: "B",
    exercises: [
      { exerciseId: "leg_extension",        exerciseName: "Leg Extension",        sets: [{ reps: 10, weight: 32.5 }, { reps: 10, weight: 32.5 }, { reps: 10, weight: 32.5 }] },
      { exerciseId: "seated_overhead_press",exerciseName: "Seated Overhead Press",sets: [{ reps: 7, weight: 20 }, { reps: 7, weight: 20 }, { reps: 7, weight: 20 }, { reps: 7, weight: 20 }] },
      { exerciseId: "deadlift",             exerciseName: "Deadlift",             sets: [{ reps: 5, weight: 80 }, { reps: 5, weight: 80 }] },
      { exerciseId: "lat_pulldown",         exerciseName: "Lat Pulldown",         sets: [{ reps: 9, weight: 50 }, { reps: 9, weight: 50 }, { reps: 9, weight: 50 }] },
      { exerciseId: "triceps_pushdown",     exerciseName: "Triceps Pushdown",     sets: [{ reps: 8, weight: 20 }, { reps: 8, weight: 20 }, { reps: 8, weight: 20 }] }
    ]
  }
];

async function seedIfEmpty() {
  const snap = await getDocs(ROUTINES_COL);
  if (!snap.empty) return;
  const now = Timestamp.now();
  await Promise.all(DEFAULT_ROUTINES.map(r =>
    addDoc(ROUTINES_COL, { ...r, createdAt: now, updatedAt: now })
  ));
}

async function fetchRoutines() {
  const snap = await getDocs(ROUTINES_COL);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getExerciseLibrary() {
  if (store.exercises.length) return store.exercises;
  const snap = await getDocs(EXERCISES_COL);
  store.exercises = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return store.exercises;
}

async function persistRoutine(routine) {
  const data = {
    name: routine.name,
    exercises: routine.exercises,
    updatedAt: Timestamp.now(),
    createdAt: routine.createdAt || Timestamp.now(),
  };
  if (routine.id) {
    await setDoc(doc(db, 'seba', 'data', 'routines', routine.id), data);
    return { ...routine, ...data };
  }
  const ref = await addDoc(ROUTINES_COL, data);
  return { id: ref.id, ...data };
}

async function removeRoutine(id) {
  await deleteDoc(doc(db, 'seba', 'data', 'routines', id));
}

// ── List view ─────────────────────────────────────────────

function renderList() {
  const list = document.getElementById('rt-list');
  if (!routines.length) {
    list.innerHTML = `
      <div class="ex-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
        <p>No routines yet</p>
        <span>Tap "+ New Routine" to get started</span>
      </div>`;
    return;
  }
  list.innerHTML = routines.map(r => {
    const count = (r.exercises || []).length;
    const last = r.lastPerformed
      ? new Date(r.lastPerformed.seconds * 1000).toLocaleDateString()
      : 'Never';
    return `
      <div class="rt-card" data-id="${r.id}">
        <div class="rt-card-body">
          <div class="rt-card-name">${r.name}</div>
          <div class="rt-card-meta">
            <span>${count} exercise${count !== 1 ? 's' : ''}</span>
            <span class="rt-dot">·</span>
            <span>Last: ${last}</span>
          </div>
        </div>
        <svg class="rt-card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>`;
  }).join('');

  list.querySelectorAll('.rt-card').forEach(card => {
    const id = card.dataset.id;
    const suppressRef = { v: false };

    // Long press → delete
    let timer;
    card.addEventListener('touchstart', () => {
      timer = setTimeout(() => {
        suppressRef.v = true;
        const r = routines.find(x => x.id === id);
        if (r && confirm(`Delete "${r.name}"?`)) {
          removeRoutine(id).then(() => {
            routines = routines.filter(x => x.id !== id);
            renderList();
          });
        }
        setTimeout(() => { suppressRef.v = false; }, 400);
      }, 600);
    }, { passive: true });
    card.addEventListener('touchend', () => clearTimeout(timer), { passive: true });
    card.addEventListener('touchmove', () => clearTimeout(timer), { passive: true });

    card.addEventListener('click', () => {
      if (suppressRef.v) return;
      const r = routines.find(x => x.id === id);
      if (r) openDetail(r);
    });
  });
}

// ── New routine dialog ─────────────────────────────────────

function openNameDialog() {
  document.getElementById('rt-dialog-input').value = '';
  document.getElementById('rt-name-dialog').style.display = 'flex';
  setTimeout(() => document.getElementById('rt-dialog-input').focus(), 100);
}

function closeNameDialog() {
  document.getElementById('rt-name-dialog').style.display = 'none';
}

async function confirmNewRoutine() {
  const name = document.getElementById('rt-dialog-input').value.trim();
  if (!name) { document.getElementById('rt-dialog-input').focus(); return; }
  closeNameDialog();
  const routine = await persistRoutine({ name, exercises: [] });
  routines.unshift(routine);
  renderList();
  openDetail(routine);
}

// ── Detail view ───────────────────────────────────────────

function openDetail(routine) {
  current = JSON.parse(JSON.stringify(routine));
  document.getElementById('rt-list-view').style.display = 'none';
  document.getElementById('rt-detail-view').style.display = 'block';
  document.getElementById('rt-name-input').value = current.name;
  // Scroll main to top
  document.querySelector('main').scrollTop = 0;
  renderExercises();
}

function closeDetail() {
  document.getElementById('rt-detail-view').style.display = 'none';
  document.getElementById('rt-list-view').style.display = 'block';
  current = null;
  document.querySelector('main').scrollTop = 0;
}

async function saveDetail() {
  const name = document.getElementById('rt-name-input').value.trim();
  if (!name) { document.getElementById('rt-name-input').focus(); return; }
  current.name = name;

  const btn = document.getElementById('rt-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const saved = await persistRoutine(current);
    const idx = routines.findIndex(r => r.id === saved.id);
    if (idx >= 0) routines[idx] = saved; else routines.unshift(saved);
    renderList();
    closeDetail();
  } catch (err) {
    console.error(err);
    alert('Failed to save. Try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

// ── Exercise list in detail ────────────────────────────────

function renderExercises() {
  const container = document.getElementById('rt-exercises');
  if (!current.exercises.length) {
    container.innerHTML = `
      <div class="rt-empty-exercises">
        <p>No exercises added yet</p>
        <span>Tap "Add Exercise" below</span>
      </div>`;
    return;
  }

  container.innerHTML = current.exercises.map((ex, ei) => `
    <div class="rt-ex-card" data-ei="${ei}">
      <div class="rt-ex-header">
        <div class="rt-drag-handle" aria-label="Drag to reorder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 6h8M8 12h8M8 18h8"/>
          </svg>
        </div>
        <div class="rt-ex-name">
          ${ex.exerciseName}
          <span class="rt-ex-equip">(${ex.equipment})</span>
        </div>
        <button class="rt-ex-menu-btn" data-ei="${ei}" aria-label="Exercise options">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
          </svg>
        </button>
      </div>
      <div class="rt-sets-wrap">
        <div class="rt-sets-header">
          <span>Set</span><span>kg</span><span>Reps</span><span></span>
        </div>
        ${(ex.sets || []).map((s, si) => `
          <div class="rt-set-row" data-ei="${ei}" data-si="${si}">
            <span class="rt-set-num">${si + 1}</span>
            <input class="rt-set-input" type="number" inputmode="decimal" min="0" step="0.5"
              value="${s.weight ?? ''}" placeholder="—"
              data-ei="${ei}" data-si="${si}" data-field="weight" onfocus="this.select()" />
            <input class="rt-set-input" type="number" inputmode="numeric" min="0"
              value="${s.reps ?? ''}" placeholder="—"
              data-ei="${ei}" data-si="${si}" data-field="reps" onfocus="this.select()" />
            <button class="rt-set-del" data-ei="${ei}" data-si="${si}" aria-label="Delete set">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>`).join('')}
        <button class="rt-add-set-btn" data-ei="${ei}">+ Add set</button>
      </div>
    </div>`).join('');

  wireDetailEvents(container);
}

function wireDetailEvents(container) {
  // Input changes
  container.querySelectorAll('.rt-set-input').forEach(input => {
    input.addEventListener('change', () => {
      const { ei, si, field } = input.dataset;
      current.exercises[+ei].sets[+si][field] = parseFloat(input.value) || 0;
    });
  });

  // Add set
  container.querySelectorAll('.rt-add-set-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ei = +btn.dataset.ei;
      const last = current.exercises[ei].sets.at(-1) || {};
      current.exercises[ei].sets.push({ weight: last.weight ?? 0, reps: last.reps ?? 0 });
      renderExercises();
    });
  });

  // Delete set
  container.querySelectorAll('.rt-set-del').forEach(btn => {
    btn.addEventListener('click', () => {
      current.exercises[+btn.dataset.ei].sets.splice(+btn.dataset.si, 1);
      renderExercises();
    });
  });

  // Exercise menu
  container.querySelectorAll('.rt-ex-menu-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showExerciseMenu(btn, +btn.dataset.ei);
    });
  });
}

function showExerciseMenu(anchor, ei) {
  document.querySelectorAll('.rt-dropdown').forEach(d => d.remove());
  const dropdown = document.createElement('div');
  dropdown.className = 'rt-dropdown';
  dropdown.innerHTML = `<button class="rt-dropdown-item rt-dropdown-danger">Remove exercise</button>`;

  const rect = anchor.getBoundingClientRect();
  dropdown.style.cssText = `position:fixed;top:${rect.bottom + 4}px;right:${window.innerWidth - rect.right}px;`;
  document.body.appendChild(dropdown);

  dropdown.querySelector('.rt-dropdown-danger').addEventListener('click', () => {
    current.exercises.splice(ei, 1);
    dropdown.remove();
    renderExercises();
  });

  setTimeout(() => {
    document.addEventListener('click', () => dropdown.remove(), { once: true });
  }, 0);
}

// ── Drag and drop ─────────────────────────────────────────

function initDragDrop() {
  const container = document.getElementById('rt-exercises');
  let state = null;

  container.addEventListener('touchstart', e => {
    const handle = e.target.closest('.rt-drag-handle');
    if (!handle) return;
    const card = handle.closest('.rt-ex-card');
    if (!card) return;

    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();

    const ghost = card.cloneNode(true);
    Object.assign(ghost.style, {
      position: 'fixed', top: rect.top + 'px', left: rect.left + 'px',
      width: rect.width + 'px', zIndex: '1000', opacity: '0.85',
      pointerEvents: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      borderRadius: '12px',
    });
    document.body.appendChild(ghost);

    const placeholder = document.createElement('div');
    Object.assign(placeholder.style, {
      height: rect.height + 'px', border: '2px dashed var(--accent)',
      borderRadius: '12px', marginBottom: '8px', boxSizing: 'border-box',
    });
    card.parentNode.insertBefore(placeholder, card);
    card.style.visibility = 'hidden';

    state = {
      card, ghost, placeholder,
      startEi: +card.dataset.ei,
      startY: touch.clientY,
      ghostInitTop: rect.top,
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { once: true, passive: true });
  }, { passive: true });

  function onMove(e) {
    if (!state) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dy = touch.clientY - state.startY;
    state.ghost.style.top = (state.ghostInitTop + dy) + 'px';

    const ghostCY = state.ghostInitTop + dy + state.ghost.offsetHeight / 2;
    const cards = [...container.querySelectorAll('.rt-ex-card')];
    let insertBefore = null;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (ghostCY < r.top + r.height / 2) { insertBefore = c; break; }
    }
    if (insertBefore) container.insertBefore(state.placeholder, insertBefore);
    else container.appendChild(state.placeholder);
  }

  function onEnd() {
    if (!state) return;
    document.removeEventListener('touchmove', onMove);
    const { card, ghost, placeholder, startEi } = state;

    const siblings = [...container.children];
    let newIdx = siblings.indexOf(placeholder);

    card.style.visibility = '';
    placeholder.parentNode.insertBefore(card, placeholder);
    placeholder.remove();
    ghost.remove();

    if (newIdx !== -1) {
      const adjusted = newIdx > startEi ? newIdx - 1 : newIdx;
      if (adjusted !== startEi) {
        const [moved] = current.exercises.splice(startEi, 1);
        current.exercises.splice(adjusted, 0, moved);
        renderExercises();
      }
    }
    state = null;
  }
}

// ── Exercise picker ────────────────────────────────────────

async function openPicker() {
  await getExerciseLibrary();
  pickerFilter = 'All';
  pickerSearch = '';
  document.getElementById('rt-picker-search').value = '';
  document.querySelectorAll('#rt-picker-chips .ex-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.filter === 'All');
  });
  renderPickerList();
  document.getElementById('ex-overlay').classList.add('active');
  document.getElementById('rt-picker-sheet').classList.add('active');
}

function closePicker() {
  document.getElementById('rt-picker-sheet').classList.remove('active');
  document.getElementById('ex-overlay').classList.remove('active');
}

function renderPickerList() {
  const q = pickerSearch.toLowerCase();
  const ZONES = ['Core', 'Upper', 'Lower'];
  const items = store.exercises
    .filter(ex => {
      const zoneOk = pickerFilter === 'All' || ex.zone === pickerFilter;
      const textOk = ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q);
      return zoneOk && textOk;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const list = document.getElementById('rt-picker-list');
  if (!items.length) {
    list.innerHTML = '<div class="ex-empty"><p>No exercises found</p></div>';
    return;
  }

  const grouped = Object.fromEntries(ZONES.map(z => [z, []]));
  items.forEach(ex => { if (grouped[ex.zone]) grouped[ex.zone].push(ex); });

  let html = '';
  ZONES.forEach(zone => {
    if (!grouped[zone].length) return;
    html += `<div class="ex-section-header">${zone}</div>`;
    grouped[zone].forEach(ex => {
      const added = current.exercises.some(e => e.exerciseId === ex.id);
      html += `
        <div class="rt-picker-item${added ? ' rt-picker-item--added' : ''}" data-id="${ex.id}">
          <div class="ex-card-name">${ex.name}</div>
          <div class="ex-card-tags">
            <span class="ex-tag ex-tag-muscle">${ex.muscleGroup}</span>
            <span class="ex-tag ex-tag-equipment">${ex.equipment}</span>
          </div>
          ${added ? '<span class="rt-picker-added">Added</span>' : ''}
        </div>`;
    });
  });
  list.innerHTML = html;

  list.querySelectorAll('.rt-picker-item:not(.rt-picker-item--added)').forEach(item => {
    item.addEventListener('click', () => {
      const ex = store.exercises.find(e => e.id === item.dataset.id);
      if (!ex) return;
      current.exercises.push({
        exerciseId: ex.id,
        exerciseName: ex.name,
        equipment: ex.equipment,
        sets: [{ weight: 0, reps: 0 }],
      });
      closePicker();
      renderExercises();
    });
  });
}

// ── Init ──────────────────────────────────────────────────

export async function initRoutines() {
  await seedIfEmpty();
  routines = await fetchRoutines();
  renderList();

  // New routine
  document.getElementById('rt-new-btn').addEventListener('click', openNameDialog);
  document.getElementById('rt-dialog-cancel').addEventListener('click', closeNameDialog);
  document.getElementById('rt-dialog-confirm').addEventListener('click', confirmNewRoutine);
  document.getElementById('rt-dialog-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmNewRoutine();
    if (e.key === 'Escape') closeNameDialog();
  });

  // Detail view
  document.getElementById('rt-back-btn').addEventListener('click', closeDetail);
  document.getElementById('rt-save-btn').addEventListener('click', saveDetail);
  document.getElementById('rt-add-exercise-btn').addEventListener('click', openPicker);

  // Picker
  document.getElementById('rt-picker-close').addEventListener('click', closePicker);
  document.getElementById('rt-picker-search').addEventListener('input', e => {
    pickerSearch = e.target.value;
    renderPickerList();
  });
  document.querySelectorAll('#rt-picker-chips .ex-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      pickerFilter = chip.dataset.filter;
      document.querySelectorAll('#rt-picker-chips .ex-chip').forEach(c => {
        c.classList.toggle('active', c === chip);
      });
      renderPickerList();
    });
  });

  // Overlay click closes picker (exercises module handles the rest)
  document.getElementById('ex-overlay').addEventListener('click', e => {
    if (e.target.id === 'ex-overlay') closePicker();
  });

  // Drag and drop (attached once, works via event delegation)
  initDragDrop();
}
