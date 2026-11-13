const CLAVE = '2509';
const ARCHIVOS_FOTO = [
  '001.jpg', '002.jpg', '003.jpg', '004.jpg', '005.jpg', '006.jpg', '007.jpg',
  '008.jpg', '009.jpg', '010.jpg', '011.jpg', '012.jpg', '013.jpg', '014.jpg',
  '015.jpg', '016.jpg', '017.jpg', '018.jpg', '019.jpg', '020.jpg', '021.jpg',
  '022.jpg', '023.jpg', '024.jpg', '025.jpg', '026.jpg', '027.jpg', '028.jpg',
  '029.jpg', '030.jpg', '031.jpg', '032.jpg', '033.jpg', '035.jpg', '036.jpg',
  '037.jpg', '038.jpg', '039.jpg',
];
const PIES = [
  'Tu sonrisa vuelve bonito cualquier día.',
  'Tienes una luz que hace especial todo a tu alrededor.',
  'A tu lado, hasta lo sencillo se siente mágico.',
  'Tus ojos guardan mi lugar favorito.',
  'Tu forma de ser me enamora cada día más.',
  'Eres más bonita de lo que las palabras alcanzan a decir.',
  'Tu risa es mi sonido favorito.',
  'Qué suerte la mía de coincidir contigo.',
  'Haces que cualquier lugar se sienta como hogar.',
  'Tu ternura hace más amable el mundo.',
  'Me encanta la paz que encuentro en ti.',
  'Tienes el don de mejorar cualquier momento.',
  'Tu belleza también está en cada detalle de tu corazón.',
  'Eres mi pensamiento bonito de todos los días.',
  'Contigo, cada recuerdo merece guardarse para siempre.',
  'Tu mirada puede iluminar hasta mis días nublados.',
  'Admiro la fuerza y dulzura que viven en ti.',
  'Eres única, y eso es una de mis cosas favoritas.',
  'Tu presencia hace que todo se sienta mejor.',
  'Amo la manera en que conviertes momentos en recuerdos.',
  'Tienes una sonrisa que siempre quiero volver a ver.',
  'Eres un regalo que la vida puso en mi camino.',
  'Tu corazón es tan hermoso como tu sonrisa.',
  'Cada día encuentro una nueva razón para admirarte.',
  'Me haces sentir en el lugar correcto.',
  'Hay algo en ti que siempre logra sorprenderme.',
  'Tu alegría se contagia y hace brillar todo.',
  'Eres mi casualidad favorita y mi elección de cada día.',
  'Qué bonito es el mundo cuando lo comparto contigo.',
  'Tienes una forma preciosa de hacer sentir querida a la gente.',
  'No hay filtro que supere la belleza de ser tú.',
  'Eres la parte favorita de muchos de mis días.',
  'Tu dulzura se queda conmigo incluso cuando no estás.',
  'Con esa mirada, haces que el tiempo se detenga.',
  'Tu esencia es imposible de confundir e imposible de olvidar.',
  'Cada versión de ti me parece maravillosa.',
  'Te mereces todo lo bonito que das a los demás.',
  'Me encanta tenerte en mi vida, tal y como eres.',
];
const FOTOS = ARCHIVOS_FOTO.map((archivo, i) => ({
  src: `assets/img/${archivo}`,
  pie: PIES[i] ?? `Foto ${i + 1}`,
}));

export function initLogin(onSuccess) {
  const dots = [...document.querySelectorAll('.dot')];
  const panel = document.querySelector('.panel');
  let code = '', activo = true, intervaloFotos = null, timerCambio = null;

  const render = () => dots.forEach((d, i) => d.classList.toggle('on', i < code.length));
  const add = (n) => { if (activo && code.length < 4) { code += n; render(); } };
  const del = () => { code = code.slice(0, -1); render(); };
  const enter = () => {
    if (!activo) return;
    if (code === CLAVE) {
      activo = false;
      clearInterval(intervaloFotos);
      if (timerCambio !== null) clearTimeout(timerCambio);
      onSuccess();
      return;
    }
    panel.classList.remove('shake'); void panel.offsetWidth; panel.classList.add('shake');
    code = ''; setTimeout(render, 350);
  };
  const press = (k) => k === 'del' ? del() : k === 'enter' ? enter() : add(k);

  document.querySelectorAll('.teclado button').forEach(b => b.addEventListener('click', () => press(b.dataset.k)));
  document.addEventListener('keydown', (e) => {
    if (!activo) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') del();
    else if (e.key === 'Enter') enter();
  });

  // Álbum
  const img = document.getElementById('foto'), vacia = document.getElementById('foto-vacia'), pie = document.getElementById('pie');
  const fotosAleatorias = [...FOTOS];
  for (let n = fotosAleatorias.length - 1; n > 0; n--) {
    const j = Math.floor(Math.random() * (n + 1));
    [fotosAleatorias[n], fotosAleatorias[j]] = [fotosAleatorias[j], fotosAleatorias[n]];
  }
  let i = 0;
  const mostrar = () => {
    vacia.hidden = true; img.hidden = false; img.src = fotosAleatorias[i].src; pie.textContent = fotosAleatorias[i].pie;
  };
  const cambiarFoto = (direccion) => {
    if (timerCambio !== null) clearTimeout(timerCambio);
    img.classList.add('foto-fade');
    timerCambio = setTimeout(() => {
      i = (i + direccion + fotosAleatorias.length) % fotosAleatorias.length;
      mostrar();
      img.classList.remove('foto-fade');
      timerCambio = null;
    }, 300);
  };
  img.addEventListener('error', () => { img.hidden = true; vacia.hidden = false; });
  document.getElementById('prev').onclick = () => cambiarFoto(-1);
  document.getElementById('next').onclick = () => cambiarFoto(1);
  mostrar();
  intervaloFotos = setInterval(() => cambiarFoto(1), 3000);
}
