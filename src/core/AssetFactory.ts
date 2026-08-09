import * as THREE from "three";

export interface PlaneColorScheme {
  hull: number;
  accent: number;
  canopy?: number;
  prop?: number;
  /** P-51-style black/white invasion stripes on the rear fuselage and wings. */
  stripes?: boolean;
  /** USAAF-style star-and-bar roundel decals on the wings and fuselage sides. */
  roundel?: boolean;
  /** Roundel ring color (CSS hex string); defaults to a blue "friendly" insignia. */
  roundelRing?: string;
  /** Roundel star color (CSS hex string); defaults to off-white. */
  roundelStar?: string;
}

export interface FighterPlane {
  group: THREE.Group;
  propeller: THREE.Object3D;
  hullMaterial: THREE.MeshStandardMaterial;
  accentMaterial: THREE.MeshStandardMaterial;
}

/**
 * Builds a low-poly WW2-arcade style fighter aircraft entirely out of primitive
 * geometry (no external assets). The model is built nose-forward along -Z so it
 * matches the world's forward/scroll axis.
 */
export function createFighterPlane(scheme: PlaneColorScheme): FighterPlane {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: scheme.hull,
    flatShading: true,
    roughness: 0.55,
    metalness: 0.2,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: scheme.accent,
    flatShading: true,
    roughness: 0.45,
    metalness: 0.25,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: scheme.canopy ?? 0x1c2836,
    flatShading: true,
    roughness: 0.25,
    metalness: 0.4,
    emissive: 0x0d3a52,
    emissiveIntensity: 0.4,
  });
  const propMat = new THREE.MeshStandardMaterial({
    color: scheme.prop ?? 0x1a1a1a,
    flatShading: true,
    roughness: 0.7,
  });

  // Fuselage: elongated tapered cylinder, nose (small radius) pointing toward -Z.
  // Proportions lean P-51 Mustang-ish: slim nose, long rear deck.
  const fuselageGeo = new THREE.CylinderGeometry(0.095, 0.185, 1.9, 6);
  fuselageGeo.rotateX(-Math.PI / 2);
  const fuselage = new THREE.Mesh(fuselageGeo, hullMat);
  fuselage.castShadow = true;
  group.add(fuselage);

  // Ventral chin scoop (the Mustang's signature belly radiator intake).
  const scoopGeo = new THREE.BoxGeometry(0.13, 0.11, 0.55);
  const scoop = new THREE.Mesh(scoopGeo, hullMat);
  scoop.position.set(0, -0.15, 0.15);
  scoop.castShadow = true;
  group.add(scoop);

  // Main wings, mid-fuselage mounted with a tapered tip.
  const wingGeo = new THREE.BoxGeometry(1.85, 0.055, 0.44);
  const wings = new THREE.Mesh(wingGeo, hullMat);
  wings.position.set(0, -0.02, 0.02);
  wings.castShadow = true;
  group.add(wings);

  // Wingtip accent panels (also carry stripes/roundels when enabled below).
  const tipGeo = new THREE.BoxGeometry(0.26, 0.06, 0.4);
  const tipL = new THREE.Mesh(tipGeo, accentMat);
  tipL.position.set(-0.8, -0.02, 0.02);
  const tipR = tipL.clone();
  tipR.position.x = 0.8;
  group.add(tipL, tipR);

  // Horizontal stabilizer (tailplane).
  const tailGeo = new THREE.BoxGeometry(0.75, 0.05, 0.24);
  const tail = new THREE.Mesh(tailGeo, hullMat);
  tail.position.set(0, 0, 0.86);
  tail.castShadow = true;
  group.add(tail);

  // Vertical fin, slightly raked.
  const finGeo = new THREE.BoxGeometry(0.055, 0.4, 0.34);
  const fin = new THREE.Mesh(finGeo, accentMat);
  fin.position.set(0, 0.21, 0.82);
  fin.rotation.x = 0.12;
  fin.castShadow = true;
  group.add(fin);

  // Bubble canopy, sat further back like a P-51D.
  const canopyGeo = new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const canopy = new THREE.Mesh(canopyGeo, canopyMat);
  canopy.scale.set(0.85, 1, 1.7);
  canopy.position.set(0, 0.15, 0.08);
  group.add(canopy);

  // Nose accent band (spinner base).
  const noseGeo = new THREE.CylinderGeometry(0.1, 0.125, 0.16, 6);
  noseGeo.rotateX(-Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, accentMat);
  nose.position.set(0, 0, -0.87);
  group.add(nose);

  if (scheme.stripes) {
    applyInvasionStripes(group);
  }
  if (scheme.roundel) {
    applyRoundels(group, scheme.roundelRing, scheme.roundelStar);
  }

  // Propeller (spins around the local forward/Z axis at runtime).
  const propGroup = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.045, 0.58, 0.045);
  const bladeA = new THREE.Mesh(bladeGeo, propMat);
  const bladeB = bladeA.clone();
  bladeB.rotation.z = Math.PI / 2;
  propGroup.add(bladeA, bladeB);
  propGroup.position.set(0, 0, -0.97);
  group.add(propGroup);

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
    child.userData.proceduralPart = true;
  });

  return { group, propeller: propGroup, hullMaterial: hullMat, accentMaterial: accentMat };
}

const STRIPE_WHITE = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, flatShading: true, roughness: 0.5 });
const STRIPE_BLACK = new THREE.MeshStandardMaterial({ color: 0x14161a, flatShading: true, roughness: 0.5 });

/** Adds alternating black/white invasion-stripe rings (rear fuselage) and bands (wings). */
function applyInvasionStripes(group: THREE.Group): void {
  const fuselageStripeZs = [0.44, 0.51, 0.58, 0.65];
  fuselageStripeZs.forEach((z, i) => {
    const ringGeo = new THREE.CylinderGeometry(0.15, 0.158, 0.058, 6);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, i % 2 === 0 ? STRIPE_WHITE : STRIPE_BLACK);
    ring.position.set(0, 0, z);
    group.add(ring);
  });

  const wingStripeXOffsets = [0.35, 0.5, 0.65];
  for (const side of [-1, 1]) {
    wingStripeXOffsets.forEach((xOff, i) => {
      const bandGeo = new THREE.BoxGeometry(0.09, 0.062, 0.42);
      const band = new THREE.Mesh(bandGeo, i % 2 === 0 ? STRIPE_WHITE : STRIPE_BLACK);
      band.position.set(side * xOff, -0.017, 0.02);
      group.add(band);
    });
  }
}

function createRoundelTexture(ringHex: string, starHex: string): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = ringHex;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = starHex;
  const cx = size / 2;
  const cy = size / 2;
  const spikes = 5;
  const outerR = size * 0.32;
  const innerR = size * 0.14;
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const roundelTextureCache = new Map<string, THREE.CanvasTexture>();

/** Adds star-in-circle roundel decals to both wingtops. */
function applyRoundels(group: THREE.Group, ringHex = "#1c3f7a", starHex = "#f4f6fa"): void {
  const cacheKey = `${ringHex}|${starHex}`;
  let texture = roundelTextureCache.get(cacheKey);
  if (!texture) {
    texture = createRoundelTexture(ringHex, starHex);
    roundelTextureCache.set(cacheKey, texture);
  }
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const geo = new THREE.CircleGeometry(0.16, 16);

  const wingL = new THREE.Mesh(geo, mat);
  wingL.rotation.x = -Math.PI / 2;
  wingL.position.set(-0.55, 0.012, 0.03);
  group.add(wingL);

  const wingR = new THREE.Mesh(geo, mat);
  wingR.rotation.x = -Math.PI / 2;
  wingR.position.set(0.55, 0.012, 0.03);
  group.add(wingR);
}

function createLabelTexture(letter: string, ringColor: string, fillColor: string): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#0b1220";
  const fontSize = letter.length > 1 ? 20 : 32;
  ctx.font = `bold ${fontSize}px 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, size / 2, size / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Small floating pickup medal: a glowing gem core plus a top-facing labeled disc. */
export function createMedal(letter: string, color: number, ringColor: string, fillColor: string): THREE.Group {
  const group = new THREE.Group();

  const coreMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.7,
    flatShading: true,
    roughness: 0.35,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), coreMat);
  core.castShadow = true;
  group.add(core);

  const labelMat = new THREE.MeshBasicMaterial({
    map: createLabelTexture(letter, ringColor, fillColor),
    transparent: true,
  });
  const label = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), labelMat);
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.22;
  group.add(label);

  return group;
}

/** Tileable ocean texture: banded gradient + scattered wave-crest specks. */
/**
 * Tileable ocean texture: deep teal base, a soft warm sun-glint band (golden-hour
 * mood), fine wave-crest lines, and faint concentric ripple rings for extra detail.
 */
export function createWaterTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const base = ctx.createLinearGradient(0, 0, 0, size);
  base.addColorStop(0, "#0d3f52");
  base.addColorStop(0.45, "#0f5468");
  base.addColorStop(1, "#0a3242");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Warm diagonal sun-glint band (golden-hour highlight raking across the water).
  const glint = ctx.createLinearGradient(0, 0, size, size * 0.7);
  glint.addColorStop(0, "rgba(255, 214, 150, 0.55)");
  glint.addColorStop(0.18, "rgba(255, 189, 120, 0.28)");
  glint.addColorStop(0.4, "rgba(255, 170, 130, 0.08)");
  glint.addColorStop(1, "rgba(255, 170, 130, 0)");
  ctx.fillStyle = glint;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255, 226, 190, 0.14)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const y = (i / 14) * size + Math.sin(i) * 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 16) {
      ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 5);
    }
    ctx.stroke();
  }

  // Faint concentric ripple rings, echoing gentle current swirls on open water.
  ctx.strokeStyle = "rgba(255, 232, 210, 0.1)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const rings = 3 + Math.floor(Math.random() * 3);
    for (let r = 0; r < rings; r++) {
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + r * 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "rgba(255, 240, 220, 0.12)";
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 1.6;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Small low-poly island prop: rocky cone base + flat grassy top, purely decorative. */
export function createIsland(): THREE.Group {
  const group = new THREE.Group();
  const scale = 0.8 + Math.random() * 1.1;

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b5a46, flatShading: true, roughness: 0.9 });
  const rock = new THREE.Mesh(new THREE.ConeGeometry(1.4 * scale, 1.1 * scale, 6), rockMat);
  rock.position.y = 0.35 * scale;
  rock.castShadow = true;
  rock.receiveShadow = true;
  group.add(rock);

  const grassMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3a, flatShading: true, roughness: 0.85 });
  const grass = new THREE.Mesh(new THREE.ConeGeometry(1.05 * scale, 0.5 * scale, 6), grassMat);
  grass.position.y = 0.78 * scale;
  grass.receiveShadow = true;
  group.add(grass);

  return group;
}

/** Small patrol boat / gun-ship silhouette, facing +Z (toward the player). */
export function createShip(hullColor = 0x445566): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, flatShading: true, roughness: 0.7, metalness: 0.1 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, flatShading: true, roughness: 0.6 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, flatShading: true, roughness: 0.5 });

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 2.0), hullMat);
  hull.position.y = 0.2;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  const bowGeo = new THREE.ConeGeometry(0.56, 0.7, 4);
  bowGeo.rotateX(-Math.PI / 2);
  const bow = new THREE.Mesh(bowGeo, hullMat);
  bow.position.set(0, 0.2, 1.3);
  bow.castShadow = true;
  group.add(bow);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.6), deckMat);
  bridge.position.set(0, 0.6, -0.2);
  bridge.castShadow = true;
  group.add(bridge);

  const funnelGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.4, 8);
  const funnel = new THREE.Mesh(funnelGeo, accentMat);
  funnel.position.set(0, 1.0, -0.5);
  funnel.castShadow = true;
  group.add(funnel);

  const gunGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 6);
  gunGeo.rotateX(-Math.PI / 2);
  const gun = new THREE.Mesh(gunGeo, deckMat);
  gun.position.set(0, 0.42, 0.8);
  gun.castShadow = true;
  group.add(gun);

  return group;
}

export interface Turret {
  group: THREE.Group;
  head: THREE.Group;
}

/** Stationary ground/deck turret with an independently rotatable aiming head. */
export function createTurret(bodyColor = 0x5e6a4f): Turret {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a4f42, flatShading: true, roughness: 0.85 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, flatShading: true, roughness: 0.6, metalness: 0.15 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x232620, flatShading: true, roughness: 0.5 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.22, 8), baseMat);
  base.position.y = 0.11;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const head = new THREE.Group();
  head.position.y = 0.24;
  const turretBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.24, 0.46), bodyMat);
  turretBody.castShadow = true;
  head.add(turretBody);

  const barrelGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.55, 6);
  barrelGeo.rotateX(-Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.set(0, 0.03, 0.5);
  barrel.castShadow = true;
  head.add(barrel);

  group.add(head);

  group.traverse((child) => {
    child.userData.proceduralPart = true;
  });

  return { group, head };
}
