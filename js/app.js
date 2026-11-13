import { initLogin } from './login.js';

initLogin(async () => {
  const login = document.getElementById('login');
  login.classList.add('fuera');
  const { startWorld } = await import('./world3d.js');
  document.getElementById('mundo').hidden = false;
  startWorld();
  setTimeout(() => login.remove(), 900);
});
