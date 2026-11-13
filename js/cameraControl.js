const CLAMP_MIN = -0.6, CLAMP_MAX = 1.35, SENS = 0.004;

export class CameraControl {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.yaw = 0; this.pitch = 0.1; this.enabled = true;
    camera.rotation.order = 'YXZ';
    let drag = false, lx = 0, ly = 0;
    dom.addEventListener('pointerdown', e => { if (!this.enabled) return; drag = true; lx = e.clientX; ly = e.clientY; dom.setPointerCapture(e.pointerId); });
    dom.addEventListener('pointermove', e => {
      if (!drag || !this.enabled) return;
      this.yaw += (e.clientX - lx) * SENS;
      this.pitch = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, this.pitch + (e.clientY - ly) * SENS));
      lx = e.clientX; ly = e.clientY;
    });
    const fin = () => { drag = false; };
    dom.addEventListener('pointerup', fin); dom.addEventListener('pointercancel', fin);
    this.apply();
  }
  apply() { this.camera.rotation.set(this.pitch, this.yaw, 0); }
  // Rumbo brújula en grados (0 = Norte, 90 = Este, 180 = Sur, 270 = Oeste)
  get rumbo() { return (((-this.yaw * 180 / Math.PI) % 360) + 360) % 360; }
}

const CENTROS = { NORTE: 0, ESTE: 90, SUR: 180, OESTE: 270 };
// Medio ancho 35° para entrar, 42° para salir (histéresis anti-parpadeo)
export function sector(rumbo, pitch, actual) {
  if (pitch > 0.85) return 'CIELO';
  if (pitch < -0.35) return 'NINGUNO';
  for (const [n, c] of Object.entries(CENTROS)) {
    const d = Math.abs(((rumbo - c + 540) % 360) - 180);
    if (d <= (n === actual ? 42 : 35)) return n;
  }
  return 'NINGUNO';
}
