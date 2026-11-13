import * as THREE from 'three';
import { CameraControl, sector } from './cameraControl.js';
import { NOTAS } from './notesData.js';

const R_MIN = 1.8, R_MAX = 28, N = 1600;
const STEM_HEIGHT = 0.8, BEND_LEVELS = 16, BEND_MIN = 0.015, BEND_MAX = 0.48;

function createStemGeometry(bend) {
  const points = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    points.push(new THREE.Vector3(bend * t * t, STEM_HEIGHT * t, 0));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.014, 5, false);
}

function createTulipGeometry() {
  const segments = 24;
  const rings = [
    { y: 0, r: 0.025 },
    { y: 0.07, r: 0.065 },
    { y: 0.17, r: 0.115 },
    { y: 0.25, r: 0.11 },
    { y: 0.3, r: 0.085 },
  ];
  const positions = [], indices = [];

  rings.forEach((ring, j) => {
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const tip = j === rings.length - 1 ? 0.035 * Math.cos(angle * 5) : 0;
      positions.push(Math.cos(angle) * ring.r, ring.y + tip, Math.sin(angle) * ring.r);

      if (j === 0) continue;
      const current = j * segments + i;
      const next = j * segments + (i + 1) % segments;
      const below = (j - 1) * segments + i;
      const belowNext = (j - 1) * segments + (i + 1) % segments;
      indices.push(below, current, next, next, current, belowNext);
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createLeafGeometry() {
  const lengthSegments = 12, widthSegments = 4;
  const positions = [], indices = [];

  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    const halfWidth = 0.09 * Math.sin(Math.PI * t);
    for (let j = 0; j <= widthSegments; j++) {
      const side = (j / widthSegments) * 2 - 1;
      const ridge = 0.025 * (1 - Math.abs(side)) * Math.sin(Math.PI * t);
      positions.push(
        0.34 * t - side * halfWidth * 0.25,
        0.46 * t - 0.11 * t * t + ridge,
        side * halfWidth,
      );
      if (i === 0 || j === widthSegments) continue;
      const current = i * (widthSegments + 1) + j;
      const next = current + 1;
      const above = current + widthSegments + 1;
      const aboveNext = above + 1;
      indices.push(current, above, next, next, above, aboveNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createGrassGeometry() {
  const lengthSegments = 4, positions = [], indices = [];
  for (let i = 0; i <= lengthSegments; i++) {
    const t = i / lengthSegments;
    const halfWidth = 0.022 * Math.sin(Math.PI * t);
    for (const side of [-1, 1]) {
      positions.push(0.035 * t * t, 0.22 * t, side * halfWidth);
      if (i === 0) continue;
      const current = i * 2, previous = current - 2;
      indices.push(previous, current, previous + 1, previous + 1, current, current + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addWind(material, amplitude, height, wholeInstance = false) {
  material.onBeforeCompile = shader => {
    shader.uniforms.uWindTime = { value: 0 };
    shader.uniforms.uWindAmplitude = { value: amplitude };
    shader.uniforms.uWindHeight = { value: height };
    shader.uniforms.uWindWhole = { value: wholeInstance ? 1 : 0 };
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uWindTime;\nuniform float uWindAmplitude;\nuniform float uWindHeight;\nuniform float uWindWhole;',
    ).replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
float windPhase = uWindTime * 0.62;
#ifdef USE_INSTANCING
windPhase += instanceMatrix[3][0] * 0.13 + instanceMatrix[3][2] * 0.17;
#endif
float windWeight = mix(clamp(position.y / max(uWindHeight, 0.001), 0.0, 1.0), 1.0, uWindWhole);
transformed.x += sin(windPhase) * uWindAmplitude * windWeight;
transformed.z += cos(windPhase * 0.73) * uWindAmplitude * 0.18 * windWeight;`,
    );
    material.userData.windUniforms = shader.uniforms;
  };
  material.customProgramCacheKey = () => 'garden-wind-v1';
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function startWorld() {
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050711);
  scene.fog = new THREE.FogExp2(0x050711, 0.065);

  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 60);
  camera.position.set(0, 1.5, 0);
  const control = new CameraControl(camera, canvas);

  // Suelo
  const ground = new THREE.Mesh(new THREE.CircleGeometry(35, 48), new THREE.MeshBasicMaterial({ color: 0x08130b }));
  ground.rotation.x = -Math.PI / 2;
  const GRASS_COUNT = 9000;
  const grassMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  addWind(grassMaterial, 0.055, 0.22);
  const grass = new THREE.InstancedMesh(createGrassGeometry(), grassMaterial, GRASS_COUNT);
  const grassM = new THREE.Matrix4(), grassQ = new THREE.Quaternion(), grassS = new THREE.Vector3(), grassP = new THREE.Vector3();
  const grassUp = new THREE.Vector3(0, 1, 0);
  const grassTones = [0x0b2012, 0x102816, 0x14301b].map(color => new THREE.Color(color));
  const grassColor = new THREE.Color();
  for (let i = 0; i < GRASS_COUNT; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R_MAX;
    const size = 0.65 + Math.random() * 0.8;
    grassQ.setFromAxisAngle(grassUp, Math.random() * Math.PI * 2);
    grassM.compose(grassP.set(Math.cos(a) * r, 0.006, Math.sin(a) * r), grassQ, grassS.set(size, size, size));
    grass.setMatrixAt(i, grassM);
    grass.setColorAt(i, grassColor.copy(grassTones[i % grassTones.length]).multiplyScalar(0.75 + Math.random() * 0.25));
  }
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  scene.add(ground, grass);

  // Estrellas
  const sp = new Float32Array(1000 * 3), sc = new Float32Array(1000 * 3);
  const starBase = new Float32Array(1000), starPhase = new Float32Array(1000), starSpeed = new Float32Array(1000);
  for (let i = 0; i < 1000; i++) {
    const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.95 + 0.05), r = 45;
    sp.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th)], i * 3);
    const b = 0.3 + Math.random() * 0.7;
    starBase[i] = b; starPhase[i] = Math.random() * Math.PI * 2; starSpeed[i] = 0.18 + Math.random() * 0.37;
    sc.set([b, b, b * 0.95], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  const starColorAttribute = new THREE.BufferAttribute(sc, 3).setUsage(THREE.DynamicDrawUsage);
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('color', starColorAttribute);
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, fog: false })));

  const lunaPos = new THREE.Vector3(-12, 15, -38);
  const haloLunaMaterial = new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xffe8b0, transparent: true, opacity: 0.55, depthWrite: false, fog: false,
  });
  const haloLuna = new THREE.Sprite(haloLunaMaterial);
  haloLuna.position.copy(lunaPos);
  haloLuna.scale.set(10, 10, 1);
  const lunaMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0cb, fog: false });
  const lunaColorBase = lunaMaterial.color.clone();
  const luna = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 24, 24),
    lunaMaterial,
  );
  luna.position.copy(lunaPos);
  scene.add(luna, haloLuna);

  // Tulipanes (InstancedMesh para tallos, hojas y flores; Points para halos)
  const stems = Array.from({ length: BEND_LEVELS }, (_, i) => {
    const bend = BEND_MIN + (i / (BEND_LEVELS - 1)) * (BEND_MAX - BEND_MIN);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    addWind(material, 0.075, STEM_HEIGHT);
    return new THREE.InstancedMesh(createStemGeometry(bend), material, N);
  });
  const stemCounts = new Uint16Array(BEND_LEVELS);
  const leafMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  addWind(leafMaterial, 0.09, 0.46);
  const leaves = new THREE.InstancedMesh(createLeafGeometry(), leafMaterial, N);
  const petalMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  addWind(petalMaterial, 0.035, 0.3);
  const petals = new THREE.InstancedMesh(createTulipGeometry(), petalMaterial, N);
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  addWind(bulbMaterial, 0.02, 1, true);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 8, 8), bulbMaterial, N);
  const gpos = new Float32Array(N * 3), gcol = new Float32Array(N * 3);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), qFlower = new THREE.Quaternion(), qLeaf = new THREE.Quaternion();
  const qBend = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
  const s = new THREE.Vector3(), p = new THREE.Vector3(), offset = new THREE.Vector3(), col = new THREE.Color();
  const verde = new THREE.Color(0x1f5a3a), tonos = [0xff4d6d, 0xff6b6b, 0xf72585, 0xf78c6b, 0xf9c74f, 0xb5179e, 0xff8fab, 0xe5989b, 0xc77dff].map(h => new THREE.Color(h)), foco = new THREE.Color(0xffbe76);

  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = R_MIN + Math.sqrt(Math.random()) * (R_MAX - R_MIN);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const bendIndex = Math.floor(Math.random() * BEND_LEVELS);
    const bend = BEND_MIN + (bendIndex / (BEND_LEVELS - 1)) * (BEND_MAX - BEND_MIN);
    const att = Math.max(0, 1 - (r / R_MAX) ** 2);
    q.setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.55, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.55));
    const stemIndex = stemCounts[bendIndex]++;
    m.compose(p.set(x, 0, z), q, s.set(1, 1, 1));
    stems[bendIndex].setMatrixAt(stemIndex, m);
    stems[bendIndex].setColorAt(stemIndex, col.copy(verde).multiplyScalar(0.3 + att));
    const leafT = 0.36;
    qBend.setFromAxisAngle(zAxis, -Math.atan2(2 * bend * leafT, STEM_HEIGHT));
    qLeaf.copy(q).multiply(qBend);
    p.set(x, 0, z).add(offset.set(bend * leafT * leafT, STEM_HEIGHT * leafT, 0).applyQuaternion(q));
    m.compose(p, qLeaf, s.set(1, 1, 1)); leaves.setMatrixAt(i, m);
    leaves.setColorAt(i, col.copy(verde).multiplyScalar(0.3 + att));
    qBend.setFromAxisAngle(zAxis, -Math.atan2(2 * bend, STEM_HEIGHT));
    qFlower.copy(q).multiply(qBend);
    p.set(x, 0, z).add(offset.set(bend, STEM_HEIGHT, 0).applyQuaternion(q));
    m.compose(p, qFlower, s.set(1, 1, 1)); petals.setMatrixAt(i, m);
    petals.setColorAt(i, col.copy(tonos[i % tonos.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08).multiplyScalar(0.25 + att * 0.75));
    p.set(x, 0, z).add(offset.set(bend, STEM_HEIGHT, 0).applyQuaternion(q));
    p.add(offset.set(0, 0.17, 0).applyQuaternion(qFlower));
    m.compose(p, qFlower, s.set(1, 1, 1)); bulbs.setMatrixAt(i, m);
    bulbs.setColorAt(i, col.copy(foco).multiplyScalar(att));
    p.set(x, 0, z).add(offset.set(bend, STEM_HEIGHT, 0).applyQuaternion(q));
    p.add(offset.set(0, 0.28, 0).applyQuaternion(qFlower));
    gpos.set([p.x, p.y, p.z], i * 3); col.copy(foco).multiplyScalar(att); gcol.set([col.r, col.g, col.b], i * 3);
  }
  for (let i = 0; i < BEND_LEVELS; i++) {
    stems[i].count = stemCounts[i];
    stems[i].instanceMatrix.needsUpdate = true;
    if (stems[i].instanceColor) stems[i].instanceColor.needsUpdate = true;
  }
  for (const mesh of [leaves, petals, bulbs]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  scene.add(...stems, leaves, petals, bulbs);
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(gpos, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gcol, 3));
  scene.add(new THREE.Points(gg, new THREE.PointsMaterial({ size: 0.9, map: glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));

  // UI de notas
  const sobre = document.getElementById('sobre'), sobreTxt = document.getElementById('sobre-txt');
  const overlay = document.getElementById('nota-overlay'), hint = document.getElementById('hint');
  let estado = 'NINGUNO', modal = false;

  sobre.addEventListener('click', () => {
    const n = NOTAS[estado]; if (!n) return;
    document.getElementById('nota-titulo').textContent = n.titulo;
    document.getElementById('nota-texto').textContent = n.texto;
    overlay.hidden = false; sobre.hidden = true; modal = true; control.enabled = false;
  });
  const cerrar = () => { overlay.hidden = true; modal = false; control.enabled = true; estado = 'NINGUNO'; };
  document.getElementById('nota-cerrar').addEventListener('click', cerrar);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  });
  setTimeout(() => hint.classList.add('off'), 6000);

  const windMaterials = [...stems.map(mesh => mesh.material), leafMaterial, petalMaterial, bulbMaterial, grassMaterial];
  renderer.setAnimationLoop(time => {
    const elapsed = time * 0.001;
    for (const material of windMaterials) {
      const uniforms = material.userData.windUniforms;
      if (uniforms) uniforms.uWindTime.value = elapsed;
    }
    for (let i = 0; i < starBase.length; i++) {
      const twinkle = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(elapsed * starSpeed[i] + starPhase[i]));
      const brightness = starBase[i] * twinkle;
      sc[i * 3] = brightness; sc[i * 3 + 1] = brightness; sc[i * 3 + 2] = brightness * 0.95;
    }
    starColorAttribute.needsUpdate = true;
    const moonPulse = 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(elapsed * 0.18));
    lunaMaterial.color.copy(lunaColorBase).multiplyScalar(moonPulse);
    haloLunaMaterial.opacity = 0.3 + 0.28 * (0.5 + 0.5 * Math.sin(elapsed * 0.18 + 0.8));

    control.apply();
    if (!modal) {
      const nuevo = sector(control.rumbo, control.pitch, estado);
      if (nuevo !== estado) {
        estado = nuevo;
        if (NOTAS[estado]) { sobreTxt.textContent = NOTAS[estado].etiqueta; sobre.hidden = false; }
        else sobre.hidden = true;
      }
    }
    renderer.render(scene, camera);
  });
}
