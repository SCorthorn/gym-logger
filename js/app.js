const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');

function navigate(targetId) {
  views.forEach(v => v.classList.toggle('active', v.id === targetId));
  navBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.view === targetId));
  history.replaceState(null, '', `#${targetId}`);
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.view));
});

const initial = location.hash.slice(1) || 'home';
navigate(document.getElementById(initial) ? initial : 'home');
