import { db } from './firebase.js';
import {
  collection, getDocs, addDoc, onSnapshot, query, orderBy, limit, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const SESSIONS_COL = collection(db, 'seba', 'data', 'sessions');

const HISTORICAL_SESSIONS = [
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-04-20T00:00:00+00:00", "finishedAt": "2026-04-20T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Seated Row", "exerciseId": "seated_row", "sets": [{"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 6, "weight": 6.0, "completed": true}, {"reps": 6, "weight": 6.0, "completed": true}, {"reps": 6, "weight": 6.0, "completed": true}, {"reps": 6, "weight": 6.0, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}]},
      {"exerciseName": "Concentration Curl", "exerciseId": "concentration_curl", "sets": [{"reps": 5, "weight": 10.0, "completed": true}, {"reps": 5, "weight": 10.0, "completed": true}, {"reps": 5, "weight": 10.0, "completed": true}]},
      {"exerciseName": "Seated Leg Curl", "exerciseId": "seated_leg_curl", "sets": [{"reps": 8, "weight": 35.0, "completed": true}, {"reps": 8, "weight": 40.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-04-22T00:00:00+00:00", "finishedAt": "2026-04-22T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Leg Extension", "exerciseId": "leg_extension", "sets": [{"reps": 10, "weight": 25.0, "completed": true}, {"reps": 10, "weight": 25.0, "completed": true}, {"reps": 10, "weight": 25.0, "completed": true}]},
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 5, "weight": 16.0, "completed": true}, {"reps": 5, "weight": 16.0, "completed": true}, {"reps": 5, "weight": 16.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 40.0, "completed": true}, {"reps": 5, "weight": 40.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]}
    ]
  },
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-04-26T00:00:00+00:00", "finishedAt": "2026-04-26T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Squat", "exerciseId": "squat", "sets": [{"reps": 8, "weight": 20.0, "completed": true}, {"reps": 8, "weight": 20.0, "completed": true}, {"reps": 10, "weight": 20.0, "completed": true}]},
      {"exerciseName": "Seated Row", "exerciseId": "seated_row", "sets": [{"reps": 8, "weight": 47.5, "completed": true}, {"reps": 8, "weight": 47.5, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 8, "weight": 6.0, "completed": true}, {"reps": 8, "weight": 6.0, "completed": true}, {"reps": 8, "weight": 6.0, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}]},
      {"exerciseName": "Seated Leg Curl", "exerciseId": "seated_leg_curl", "sets": [{"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-04-28T00:00:00+00:00", "finishedAt": "2026-04-28T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Leg Extension", "exerciseId": "leg_extension", "sets": [{"reps": 9, "weight": 32.5, "completed": true}, {"reps": 9, "weight": 32.5, "completed": true}, {"reps": 9, "weight": 35.0, "completed": true}]},
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 8, "weight": 16.0, "completed": true}, {"reps": 8, "weight": 16.0, "completed": true}, {"reps": 8, "weight": 16.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 60.0, "completed": true}, {"reps": 5, "weight": 60.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 7, "weight": 50.0, "completed": true}, {"reps": 7, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]}
    ]
  },
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-04-30T00:00:00+00:00", "finishedAt": "2026-04-30T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Squat", "exerciseId": "squat", "sets": [{"reps": 8, "weight": 40.0, "completed": true}, {"reps": 8, "weight": 40.0, "completed": true}, {"reps": 8, "weight": 40.0, "completed": true}]},
      {"exerciseName": "Seated Row", "exerciseId": "seated_row", "sets": [{"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 6, "weight": 8.0, "completed": true}, {"reps": 6, "weight": 8.0, "completed": true}, {"reps": 6, "weight": 8.0, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}]},
      {"exerciseName": "Bicep Curl", "exerciseId": "bicep_curl", "sets": [{"reps": 6, "weight": 14.0, "completed": true}, {"reps": 6, "weight": 14.0, "completed": true}, {"reps": 8, "weight": 14.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-05-04T00:00:00+00:00", "finishedAt": "2026-05-04T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Leg Extension", "exerciseId": "leg_extension", "sets": [{"reps": 10, "weight": 32.5, "completed": true}, {"reps": 10, "weight": 32.5, "completed": true}, {"reps": 10, "weight": 35.0, "completed": true}]},
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 6, "weight": 18.0, "completed": true}, {"reps": 6, "weight": 18.0, "completed": true}, {"reps": 6, "weight": 18.0, "completed": true}, {"reps": 8, "weight": 15.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 60.0, "completed": true}, {"reps": 5, "weight": 70.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 48.0, "completed": true}]}
    ]
  },
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-05-06T00:00:00+00:00", "finishedAt": "2026-05-06T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Seated Row", "exerciseId": "seated_row", "sets": [{"reps": 8, "weight": 52.5, "completed": true}, {"reps": 8, "weight": 52.5, "completed": true}, {"reps": 8, "weight": 55.0, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 7, "weight": 8.0, "completed": true}, {"reps": 7, "weight": 8.0, "completed": true}, {"reps": 7, "weight": 8.0, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}, {"reps": 20, "weight": 0.0, "completed": true}]},
      {"exerciseName": "Triceps Pushdown", "exerciseId": "triceps_pushdown", "sets": [{"reps": 8, "weight": 15.0, "completed": true}, {"reps": 8, "weight": 20.0, "completed": true}, {"reps": 8, "weight": 20.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-05-19T00:00:00+00:00", "finishedAt": "2026-05-19T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 7, "weight": 18.0, "completed": true}, {"reps": 7, "weight": 18.0, "completed": true}, {"reps": 7, "weight": 18.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 70.0, "completed": true}, {"reps": 5, "weight": 70.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 8, "weight": 50.0, "completed": true}, {"reps": 7, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]}
    ]
  },
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-05-21T00:00:00+00:00", "finishedAt": "2026-05-21T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Seated Row", "exerciseId": "seated_row", "sets": [{"reps": 8, "weight": 55.0, "completed": true}, {"reps": 8, "weight": 55.0, "completed": true}, {"reps": 8, "weight": 57.5, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 10, "weight": 20.0, "completed": true}, {"reps": 12, "weight": 20.0, "completed": true}, {"reps": 12, "weight": 20.0, "completed": true}, {"reps": 12, "weight": 20.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-05-24T00:00:00+00:00", "finishedAt": "2026-05-24T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Leg Extension", "exerciseId": "leg_extension", "sets": [{"reps": 10, "weight": 30.0, "completed": true}, {"reps": 10, "weight": 30.0, "completed": true}, {"reps": 10, "weight": 30.0, "completed": true}]},
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 5, "weight": 20.0, "completed": true}, {"reps": 5, "weight": 20.0, "completed": true}, {"reps": 5, "weight": 20.0, "completed": true}, {"reps": 7, "weight": 18.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 70.0, "completed": true}, {"reps": 5, "weight": 75.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}]}
    ]
  },
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-05-27T00:00:00+00:00", "finishedAt": "2026-05-27T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Squat", "exerciseId": "squat", "sets": [{"reps": 8, "weight": 50.0, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 10, "weight": 30.0, "completed": true}, {"reps": 10, "weight": 30.0, "completed": true}, {"reps": 10, "weight": 30.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-06-07T00:00:00+00:00", "finishedAt": "2026-06-07T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 3, "weight": 20.0, "completed": true}, {"reps": 6, "weight": 16.0, "completed": true}, {"reps": 6, "weight": 16.0, "completed": true}, {"reps": 6, "weight": 16.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 70.0, "completed": true}, {"reps": 5, "weight": 75.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}, {"reps": 8, "weight": 45.0, "completed": true}]}
    ]
  },
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-06-09T00:00:00+00:00", "finishedAt": "2026-06-09T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Seated Row", "exerciseId": "seated_row", "sets": [{"reps": 8, "weight": 55.0, "completed": true}, {"reps": 8, "weight": 55.0, "completed": true}, {"reps": 8, "weight": 55.0, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}]},
      {"exerciseName": "Leg Extension", "exerciseId": "leg_extension", "sets": [{"reps": 10, "weight": 27.5, "completed": true}, {"reps": 10, "weight": 27.5, "completed": true}, {"reps": 10, "weight": 27.5, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 10, "weight": 40.0, "completed": true}, {"reps": 10, "weight": 40.0, "completed": true}, {"reps": 10, "weight": 40.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-06-15T00:00:00+00:00", "finishedAt": "2026-06-15T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Leg Extension", "exerciseId": "leg_extension", "sets": [{"reps": 10, "weight": 30.0, "completed": true}, {"reps": 10, "weight": 30.0, "completed": true}, {"reps": 10, "weight": 30.0, "completed": true}]},
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 7, "weight": 18.0, "completed": true}, {"reps": 7, "weight": 18.0, "completed": true}, {"reps": 7, "weight": 18.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 75.0, "completed": true}, {"reps": 5, "weight": 75.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 9, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 48.75, "completed": true}]}
    ]
  },
  {
    "routineName": "A", "routineId": "a",
    "startedAt": "2026-06-24T00:00:00+00:00", "finishedAt": "2026-06-24T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Squat", "exerciseId": "squat", "sets": [{"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}, {"reps": 8, "weight": 50.0, "completed": true}]},
      {"exerciseName": "Seated Row", "exerciseId": "seated_row", "sets": [{"reps": 8, "weight": 55.0, "completed": true}, {"reps": 8, "weight": 60.0, "completed": true}, {"reps": 8, "weight": 57.5, "completed": true}]},
      {"exerciseName": "Lateral Raise", "exerciseId": "lateral_raise", "sets": [{"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}, {"reps": 8, "weight": 8.0, "completed": true}]},
      {"exerciseName": "Standing Calf Raise", "exerciseId": "standing_calf_raise", "sets": [{"reps": 10, "weight": 50.0, "completed": true}, {"reps": 10, "weight": 50.0, "completed": true}, {"reps": 10, "weight": 50.0, "completed": true}]},
      {"exerciseName": "Hip Abductor", "exerciseId": "hip_abductor", "sets": [{"reps": 8, "weight": 85.0, "completed": true}, {"reps": 8, "weight": 80.0, "completed": true}, {"reps": 8, "weight": 80.0, "completed": true}]}
    ]
  },
  {
    "routineName": "B", "routineId": "b",
    "startedAt": "2026-06-27T00:00:00+00:00", "finishedAt": "2026-06-27T00:00:00+00:00",
    "durationSeconds": 3600,
    "exercises": [
      {"exerciseName": "Leg Extension", "exerciseId": "leg_extension", "sets": [{"reps": 10, "weight": 32.5, "completed": true}, {"reps": 10, "weight": 32.5, "completed": true}, {"reps": 10, "weight": 32.5, "completed": true}]},
      {"exerciseName": "Seated Overhead Press", "exerciseId": "seated_overhead_press", "sets": [{"reps": 7, "weight": 20.0, "completed": true}, {"reps": 6, "weight": 20.0, "completed": true}, {"reps": 4, "weight": 20.0, "completed": true}, {"reps": 5, "weight": 14.0, "completed": true}]},
      {"exerciseName": "Deadlift", "exerciseId": "deadlift", "sets": [{"reps": 5, "weight": 80.0, "completed": true}, {"reps": 5, "weight": 80.0, "completed": true}]},
      {"exerciseName": "Lat Pulldown", "exerciseId": "lat_pulldown", "sets": [{"reps": 9, "weight": 50.0, "completed": true}, {"reps": 9, "weight": 50.0, "completed": true}, {"reps": 9, "weight": 50.0, "completed": true}]},
      {"exerciseName": "Triceps Pushdown", "exerciseId": "triceps_pushdown", "sets": [{"reps": 8, "weight": 20.0, "completed": true}, {"reps": 8, "weight": 20.0, "completed": true}, {"reps": 8, "weight": 20.0, "completed": true}]}
    ]
  }
];

// ── State ─────────────────────────────────────────────────

let allSessions  = [];
let activeKey    = null;   // currently expanded exercise (normalized name key)
let activeMetric = 'volume';
let chart        = null;

function tsToDate(ts) {
  if (!ts) return new Date(0);
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
}

// Deduplicate by normalized name so e.g. "Lat Pulldown" logged under
// different exerciseIds (Firestore ID vs "lat_pulldown") collapses into one.
function getTrackedExercises() {
  const map = new Map(); // normalized name → display name
  for (const s of allSessions) {
    for (const ex of (s.exercises || [])) {
      const key = ex.exerciseName.trim().toLowerCase();
      if (!map.has(key)) map.set(key, ex.exerciseName.trim());
    }
  }
  return [...map.entries()]
    .map(([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Match by normalized exercise name so all variants are merged
function computeMetrics(nameKey) {
  const points = [];
  for (const s of allSessions) {
    const ex = (s.exercises || []).find(
      e => e.exerciseName.trim().toLowerCase() === nameKey
    );
    if (!ex) continue;
    const completedSets = (ex.sets || []).filter(set => set.completed);
    if (!completedSets.length) continue;

    const date = tsToDate(s.startedAt);
    let volume = 0, maxWeight = 0, e1rm = 0;
    for (const set of completedSets) {
      const w = set.weight || 0;
      const r = set.reps   || 0;
      volume += w * r;
      if (w > maxWeight) maxWeight = w;
      const est = w * (1 + r / 30);
      if (est > e1rm) e1rm = est;
    }
    points.push({ date, volume, maxWeight, e1rm: Math.round(e1rm * 10) / 10 });
  }
  return points.sort((a, b) => a.date - b.date);
}

function fmtDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getRow(key) {
  for (const row of document.querySelectorAll('.prog-ex-row')) {
    if (row.dataset.key === key) return row;
  }
  return null;
}

// ── Render list ───────────────────────────────────────────

function renderSearchResults(q) {
  const results  = document.getElementById('prog-results');
  const tracked  = getTrackedExercises();
  const filtered = q
    ? tracked.filter(e => e.name.toLowerCase().includes(q.toLowerCase()))
    : tracked;

  if (!filtered.length) {
    results.innerHTML = `
      <div class="ex-empty">
        <p>${q ? 'No matching exercises' : 'No sessions logged yet'}</p>
        <span>${q ? '' : 'Import history or log a workout first'}</span>
      </div>`;
    activeKey = null;
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  results.innerHTML = filtered.map(e => `
    <div class="prog-ex-row" data-key="${e.key}">
      <div class="prog-ex-item">
        <span class="prog-ex-name">${e.name}</span>
        <svg class="prog-ex-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      <div class="prog-expand" style="display:none">
        <div class="prog-toggles">
          <button class="prog-toggle active" data-metric="volume">Volume</button>
          <button class="prog-toggle" data-metric="maxWeight">Max Weight</button>
          <button class="prog-toggle" data-metric="e1rm">Est. 1RM</button>
        </div>
        <div class="prog-chart-wrap">
          <canvas class="prog-canvas"></canvas>
          <div class="prog-chart-msg" style="display:none">
            Log at least 2 sessions to see your chart
          </div>
        </div>
        <div class="prog-summary"></div>
      </div>
    </div>`).join('');

  results.querySelectorAll('.prog-ex-item').forEach(item => {
    item.addEventListener('click', () => {
      const row = item.closest('.prog-ex-row');
      toggleExercise(row.dataset.key);
    });
  });

  results.querySelectorAll('.prog-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.prog-ex-row');
      if (row.dataset.key !== activeKey) return;
      row.querySelectorAll('.prog-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeMetric = btn.dataset.metric;
      renderChartInto(row);
    });
  });
}

// ── Accordion toggle ──────────────────────────────────────

function toggleExercise(key) {
  const prevKey = activeKey;

  // Close previously open row
  if (prevKey) {
    const prevRow = getRow(prevKey);
    if (prevRow) {
      prevRow.querySelector('.prog-expand').style.display  = 'none';
      prevRow.querySelector('.prog-ex-chevron').classList.remove('open');
    }
    if (chart) { chart.destroy(); chart = null; }
    activeKey = null;
  }

  // Same key: was already open, now closed — done
  if (key === prevKey) return;

  // Open new row
  activeKey    = key;
  activeMetric = 'volume';

  const row = getRow(key);
  if (!row) return;

  row.querySelectorAll('.prog-toggle').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.metric === 'volume');
  });

  row.querySelector('.prog-expand').style.display = 'block';
  row.querySelector('.prog-ex-chevron').classList.add('open');

  renderChartInto(row);
}

function renderChartInto(row) {
  const key     = row.dataset.key;
  const points  = computeMetrics(key);
  const canvas  = row.querySelector('.prog-canvas');
  const msg     = row.querySelector('.prog-chart-msg');
  const summary = row.querySelector('.prog-summary');

  if (points.length < 2) {
    canvas.style.display = 'none';
    msg.style.display    = 'flex';
    summary.innerHTML    = '';
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  canvas.style.display = 'block';
  msg.style.display    = 'none';

  const labels = points.map(p => fmtDate(p.date));
  const values = points.map(p => p[activeMetric]);

  const ctx      = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(59,130,246,0.35)');
  gradient.addColorStop(1, 'rgba(59,130,246,0)');

  if (chart) { chart.destroy(); chart = null; }

  chart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: gradient,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#1a1a1a',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#2a2a2a',
          borderColor: '#3a3a3a',
          borderWidth: 1,
          titleColor: '#9ca3af',
          bodyColor: '#ffffff',
          bodyFont: { size: 15, weight: '700' },
          callbacks: {
            title: items => items[0].label,
            label: item => ` ${Math.round(item.raw * 10) / 10} kg`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#9ca3af', font: { size: 11 }, maxTicksLimit: 6 },
          grid:  { color: '#2f2f2f' },
          border: { color: '#3a3a3a' }
        },
        y: {
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback: v => `${v} kg`
          },
          grid:  { color: '#2f2f2f' },
          border: { color: '#3a3a3a' }
        }
      }
    }
  });

  const best     = Math.max(...values);
  const lastDate = fmtDate(points[points.length - 1].date);
  summary.innerHTML = `
    <div class="prog-stats">
      <div class="fin-stat">
        <span class="fin-stat-label">Sessions</span>
        <span class="fin-stat-value">${points.length}</span>
      </div>
      <div class="fin-stat">
        <span class="fin-stat-label">All-time best</span>
        <span class="fin-stat-value">${Math.round(best * 10) / 10} kg</span>
      </div>
      <div class="fin-stat">
        <span class="fin-stat-label">Last session</span>
        <span class="fin-stat-value">${lastDate}</span>
      </div>
    </div>`;
}

// ── History import ────────────────────────────────────────

async function checkImportNeeded() {
  const snap = await getDocs(SESSIONS_COL);
  const alreadyImported = snap.docs.some(d => {
    const ts = d.data().startedAt;
    if (!ts) return false;
    const date = tsToDate(ts);
    return date.getFullYear() === 2026 && date.getMonth() === 3 && date.getDate() === 20;
  });
  if (!alreadyImported) {
    document.getElementById('prog-import-wrap').style.display = 'block';
  }
}

async function importHistory() {
  const btn = document.getElementById('prog-import-btn');
  btn.disabled    = true;
  btn.textContent = 'Importing…';
  try {
    for (const s of HISTORICAL_SESSIONS) {
      await addDoc(SESSIONS_COL, {
        routineId:       s.routineId,
        routineName:     s.routineName,
        startedAt:       Timestamp.fromDate(new Date(s.startedAt)),
        finishedAt:      Timestamp.fromDate(new Date(s.finishedAt)),
        durationSeconds: s.durationSeconds,
        exercises:       s.exercises,
      });
    }
    document.getElementById('prog-import-wrap').style.display = 'none';
    // allSessions will be updated automatically by the onSnapshot listener
  } catch (err) {
    console.error('[Progress] Import failed', err);
    btn.disabled    = false;
    btn.textContent = 'Import History';
    alert('Import failed. Check console.');
  }
}

// ── Init ──────────────────────────────────────────────────

export async function initProgress() {
  document.getElementById('prog-search').addEventListener('input', e => {
    if (chart) { chart.destroy(); chart = null; }
    activeKey = null;
    renderSearchResults(e.target.value.trim());
  });

  document.getElementById('prog-import-btn').addEventListener('click', importHistory);

  await checkImportNeeded();

  // Real-time listener: re-render list and refresh open chart on every change
  const q = query(SESSIONS_COL, orderBy('startedAt', 'desc'), limit(500));
  onSnapshot(q, snap => {
    allSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const searchVal = document.getElementById('prog-search').value.trim();
    renderSearchResults(searchVal);
    // Re-render chart for the currently open exercise, if any
    if (activeKey) {
      const row = getRow(activeKey);
      if (row) renderChartInto(row);
    }
  }, err => console.error('[Progress] onSnapshot error:', err));
}
