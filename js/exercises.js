import { db } from './firebase.js';
import {
  collection, getDocs, addDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const EXERCISES_COL = collection(db, 'seba', 'data', 'exercises');

const SEED = [
  { name: 'Crunches',                  muscleGroup: 'Abs',                        zone: 'Core',  equipment: 'Bodyweight', isCustom: false },
  { name: 'Leg Raises',                muscleGroup: 'Abs',                        zone: 'Core',  equipment: 'Bodyweight', isCustom: false },
  { name: 'Russian Twist',             muscleGroup: 'Abs',                        zone: 'Core',  equipment: 'Kettlebell', isCustom: false },
  { name: 'Side to Side Crunches',     muscleGroup: 'Abs',                        zone: 'Core',  equipment: 'Bodyweight', isCustom: false },
  { name: 'Commando Plank',            muscleGroup: 'Abs',                        zone: 'Core',  equipment: 'Bodyweight', isCustom: false },
  { name: 'Hip Abduction with Band',   muscleGroup: 'Glutes',                     zone: 'Lower', equipment: 'Band',       isCustom: false },
  { name: 'Deadlift',                  muscleGroup: 'Glutes, Hamstrings, Back',   zone: 'Lower', equipment: 'Barbell',    isCustom: false },
  { name: 'Single Leg Glute Bridge',   muscleGroup: 'Glutes, Hamstrings',         zone: 'Lower', equipment: 'Bodyweight', isCustom: false },
  { name: 'Single Leg Deadlift',       muscleGroup: 'Glutes, Hamstrings',         zone: 'Lower', equipment: 'Kettlebell', isCustom: false },
  { name: 'Squats',                    muscleGroup: 'Quads',                      zone: 'Lower', equipment: 'Barbell',    isCustom: false },
  { name: 'Leg Extension',             muscleGroup: 'Quads',                      zone: 'Lower', equipment: 'Machine',    isCustom: false },
  { name: 'Standing Calf Raise',       muscleGroup: 'Calves',                     zone: 'Lower', equipment: 'Machine',    isCustom: false },
  { name: 'Hip Abductor',              muscleGroup: 'Glutes',                     zone: 'Lower', equipment: 'Machine',    isCustom: false },
  { name: 'Lower Back Extension',      muscleGroup: 'Back',                       zone: 'Upper', equipment: 'Machine',    isCustom: false },
  { name: 'Dumbbell Chest Press',      muscleGroup: 'Chest',                      zone: 'Upper', equipment: 'Dumbbell',   isCustom: false },
  { name: 'Tricep Extension',          muscleGroup: 'Triceps',                    zone: 'Upper', equipment: 'Dumbbell',   isCustom: false },
  { name: 'Tricep Overhead Extension', muscleGroup: 'Triceps',                    zone: 'Upper', equipment: 'Dumbbell',   isCustom: false },
  { name: 'Dumbbell Chest Fly',        muscleGroup: 'Chest',                      zone: 'Upper', equipment: 'Dumbbell',   isCustom: false },
  { name: 'Seated Overhead Press',     muscleGroup: 'Shoulders',                  zone: 'Upper', equipment: 'Dumbbell',   isCustom: false },
  { name: 'Lat Pulldown',              muscleGroup: 'Back',                       zone: 'Upper', equipment: 'Machine',    isCustom: false },
  { name: 'Triceps Pushdown',          muscleGroup: 'Triceps',                    zone: 'Upper', equipment: 'Cable',      isCustom: false },
  { name: 'Seated Row',                muscleGroup: 'Back',                       zone: 'Upper', equipment: 'Machine',    isCustom: false },
  { name: 'Lateral Raise',             muscleGroup: 'Shoulders',                  zone: 'Upper', equipment: 'Dumbbell',   isCustom: false },
];

const ZONE_ORDER = ['Core', 'Upper', 'Lower'];

let allExercises = [];
let activeFilter = 'All';
let searchQuery = '';

// ── Firestore ──────────────────────────────────────────────

async function seedIfEmpty() {
  const snap = await getDocs(EXERCISES_COL);
  if (!snap.empty) return;
  await Promise.all(SEED.map(ex => addDoc(EXERCISES_COL, ex)));
}

async function fetchAll() {
  const snap = await getDocs(EXERCISES_COL);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveNew(data) {
  const ref = await addDoc(EXERCISES_COL, { ...data, isCustom: true });
  return { id: ref.id, ...data, isCustom: true };
}

async function remove(id) {
  await deleteDoc(doc(db, 'seba', 'data', 'exercises', id));
}

// ── Filtering ─────────────────────────────────────────────

function filtered() {
  const q = searchQuery.toLowerCase();
  return allExercises
    .filter(ex => {
      const zoneMatch = activeFilter === 'All' || ex.zone === activeFilter;
      const nameMatch = ex.name.toLowerCase().includes(q) || ex.muscleGroup.toLowerCase().includes(q);
      return zoneMatch && nameMatch;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Render list ────────────────────────────────────────────

function renderList() {
  const list = document.getElementById('ex-list');
  const items = filtered();

  if (items.length === 0) {
    const isCustom = activeFilter === 'Custom';
    list.innerHTML = `
      <div class="ex-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6.5 6.5h11M6.5 17.5h11M3 10h2.5v4H3zM18.5 10H21v4h-2.5z"/>
          <rect x="5.5" y="8.5" width="13" height="7" rx="1"/>
        </svg>
        <p>${isCustom ? "You haven't added any custom exercises yet" : 'No exercises found'}</p>
        ${!isCustom ? '<span>Try a different filter or add a custom exercise</span>' : ''}
      </div>`;
    return;
  }

  const grouped = Object.fromEntries(ZONE_ORDER.map(z => [z, []]));
  items.forEach(ex => { if (grouped[ex.zone]) grouped[ex.zone].push(ex); });

  let html = '';
  ZONE_ORDER.forEach(zone => {
    if (!grouped[zone].length) return;
    html += `<div class="ex-section-header">${zone}</div>`;
    grouped[zone].forEach(ex => {
      html += `
        <div class="ex-card" data-id="${ex.id}">
          <div class="ex-card-name">
            ${ex.name}
            ${ex.isCustom ? '<span class="ex-custom-badge">Custom</span>' : ''}
          </div>
          <div class="ex-card-tags">
            <span class="ex-tag ex-tag-muscle">${ex.muscleGroup}</span>
            <span class="ex-tag ex-tag-equipment">${ex.equipment}</span>
          </div>
        </div>`;
    });
  });

  list.innerHTML = html;
  list.querySelectorAll('.ex-card').forEach(card => {
    card.addEventListener('click', () => {
      const ex = allExercises.find(e => e.id === card.dataset.id);
      if (ex) openDetail(ex);
    });
  });
}

// ── Detail sheet ───────────────────────────────────────────

function openDetail(ex) {
  document.getElementById('ex-detail-name').textContent = ex.name;
  document.getElementById('ex-detail-zone').textContent = ex.zone;
  document.getElementById('ex-detail-muscle').textContent = ex.muscleGroup;
  document.getElementById('ex-detail-equipment').textContent = ex.equipment;
  document.getElementById('ex-detail-notes').textContent = ex.notes || '—';

  const deleteBtn = document.getElementById('ex-detail-delete');
  deleteBtn.style.display = ex.isCustom ? 'flex' : 'none';
  deleteBtn.onclick = () => handleDelete(ex);

  showSheet('ex-detail-sheet');
}

function closeDetail() {
  hideSheet('ex-detail-sheet');
}

async function handleDelete(ex) {
  if (!confirm(`Delete "${ex.name}"?`)) return;
  await remove(ex.id);
  allExercises = allExercises.filter(e => e.id !== ex.id);
  closeDetail();
  renderList();
}

// ── New exercise modal ─────────────────────────────────────

function openNew() {
  document.getElementById('ex-new-form').reset();
  showSheet('ex-new-modal');
}

function closeNew() {
  hideSheet('ex-new-modal');
}

async function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('.ex-save-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const ex = await saveNew({
      name: form.exName.value.trim(),
      zone: form.exZone.value,
      muscleGroup: form.exMuscle.value.trim(),
      equipment: form.exEquipment.value,
      notes: form.exNotes.value.trim() || null,
    });
    allExercises.push(ex);
    renderList();
    closeNew();
  } catch (err) {
    console.error(err);
    alert('Failed to save. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Exercise';
  }
}

// ── Sheet helpers ──────────────────────────────────────────

function showSheet(id) {
  document.getElementById('ex-overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
}

function hideSheet(id) {
  document.getElementById(id).classList.remove('active');
  document.getElementById('ex-overlay').classList.remove('active');
}

// ── FAB visibility (only on exercises tab) ─────────────────

function updateFab(viewId) {
  document.getElementById('ex-fab').classList.toggle('visible', viewId === 'exercises');
}

// ── Init ───────────────────────────────────────────────────

export async function initExercises() {
  const list = document.getElementById('ex-list');
  try {
    list.innerHTML = '<div class="ex-empty"><p style="color:var(--text-secondary);font-size:14px">Loading…</p></div>';
    await seedIfEmpty();
    allExercises = await fetchAll();
    renderList();
  } catch (err) {
    console.error('Exercises init error:', err);
    list.innerHTML = `<div class="ex-empty"><p style="color:#ef4444">Failed to load exercises</p><span style="font-size:12px;color:var(--text-secondary)">${err.message}</span></div>`;
    return { onNavigate: () => {} };
  }

  document.getElementById('ex-search').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderList();
  });

  document.querySelectorAll('.ex-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      document.querySelectorAll('.ex-chip').forEach(c => c.classList.toggle('active', c === chip));
      renderList();
    });
  });

  document.getElementById('ex-detail-close').addEventListener('click', closeDetail);
  document.getElementById('ex-new-close').addEventListener('click', closeNew);
  document.getElementById('ex-new-form').addEventListener('submit', handleSubmit);
  document.getElementById('ex-fab').addEventListener('click', openNew);

  document.getElementById('ex-overlay').addEventListener('click', e => {
    if (e.target.id === 'ex-overlay') {
      closeDetail();
      closeNew();
    }
  });

  return { onNavigate: updateFab };
}
