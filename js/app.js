import { initExercises } from './exercises.js';
import { initRoutines } from './routines.js';
import { initHome } from './home.js';
import { initProgress } from './progress.js';

const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
let exercisesCallbacks = null;

function navigate(targetId) {
  views.forEach(v => v.classList.toggle('active', v.id === targetId));
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === targetId));
  history.replaceState(null, '', `#${targetId}`);
  exercisesCallbacks?.onNavigate(targetId);
}

navBtns.forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));

const initial = location.hash.slice(1) || 'home';
navigate(document.getElementById(initial) ? initial : 'home');

initExercises().then(cb => {
  exercisesCallbacks = cb;
  exercisesCallbacks.onNavigate(document.querySelector('.view.active')?.id ?? 'home');
}).catch(console.error);

initRoutines().catch(console.error);
initHome().catch(console.error);
initProgress().catch(console.error);
