'use strict';
(() => {
/* ---------- helpers & config ---------- */
const $ = id => document.getElementById(id);
const R = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const MAP = 300, BOTS = 29;
const RAR = [['Common', 0x9aa0a6], ['Uncommon', 0x4cc24a], ['Rare', 0x3a8dff], ['Epic', 0xb44cff], ['Legendary', 0xffb02e]];
const WEAP = {
  pistol:  { n: 'Pistol',        d: 24, rate: .35, mag: 16, sp: .012, pel: 1,  rl: 1.3, rng: 150 },
  ar:      { n: 'Assault Rifle', d: 30, rate: .14, mag: 30, sp: .03,  pel: 1,  rl: 2.2, rng: 200 },
  shotgun: { n: 'Pump Shotgun',  d: 11, rate: .95, mag: 5,  sp: .09,  pel: 10, rl: 2.6, rng: 45 }
};
const NAMES = ['Ace', 'Blaze', 'Comet', 'Dash', 'Echo', 'Frost', 'Ghost', 'Hawk', 'Ion', 'Jinx', 'Knox', 'Lynx', 'Maverick', 'Nova', 'Onyx', 'Pixel', 'Quake', 'Rogue', 'Slate', 'Titan', 'Vex', 'Wolf', 'Zephyr'];
const POIS = [
  ['Tilted Towers', 0, 0, 9, 48, 1], ['Pleasant Park', -150, 120, 6, 38, 0], ['Retail Row', 140, -130, 6, 38, 0],
  ['Salty Springs', 110, 140, 5, 30, 0], ['Greasy Grove', -130, -110, 6, 36, 0], ['Lonely Lodge', -40, 230, 3, 25, 0], ['Dusty Depot', -230, 10, 4, 30, 0]
];
const LAKE = { x: -200, z: -210, r: 42 };
const HOUSE_COLS = [0xe8d9b5, 0xcfd8dc, 0xd7b99a, 0xb8c9a9, 0xe0b4a4, 0xa9bfd6];

/* ---------- renderer / scene ---------- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ecff5);
scene.fog = new THREE.Fog(0x8ecff5, 90, 420);
const cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .1, 900);
const ren = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
ren.setPixelRatio(Math.min(devicePixelRatio, 1.5));
ren.setSize(innerWidth, innerHeight);
document.body.prepend(ren.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8f4a, .95));
const sun = new THREE.DirectionalLight(0xfff2d0, .7); sun.position.set(120, 200, 70); scene.add(sun);
addEventListener('resize', () => { cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); ren.setSize(innerWidth, innerHeight); });

const mats = {}; const mat = c => mats[c] || (mats[c] = new THREE.MeshLambertMaterial({ color: c }));
const UB = new THREE.BoxGeometry(1, 1, 1), CONE = new THREE.ConeGeometry(2.8, 6, 7);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 2.6, MAP * 2.6), mat(0x5fae48));
ground.rotation.x = -Math.PI / 2; scene.add(ground);
const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r, 32), new THREE.MeshBasicMaterial({ color: 0x2e8fd8 }));
lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE.x, .05, LAKE.z); scene.add(lake);

/* ---------- world: solids, pieces ---------- */
const solids = [], items = [], chars = [], builtKeys = new Set(), rects = [];
const newPiece = (hp, wood) => ({ hp, wood, parts: [], extra: [], key: null });
function box(x, y, z, w, h, d, col, o = {}) {
  const m = new THREE.Mesh(UB, mat(col)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); scene.add(m);
  const s = { min: V(x - w / 2, y, z - d / 2), max: V(x + w / 2, y + h, z + d / 2), mesh: m };
  solids.push(s);
  if (o.piece) { s.piece = o.piece; o.piece.parts.push(s); }
  return s;
}
function destroy(p) {
  p.parts.forEach(s => { scene.remove(s.mesh); const i = solids.indexOf(s); if (i >= 0) solids.splice(i, 1); });
  p.extra.forEach(m => scene.remove(m));
  if (p.key) builtKeys.delete(p.key);
}
function hitSolid(s, d) { const p = s.piece; if (!p) return null; p.hp -= d; if (p.hp <= 0) destroy(p); return p; }

function tree(x, z) {
  const p = newPiece(100, true);
  const l = new THREE.Mesh(CONE, mat(0x2f7d32)); l.position.set(x, 8, z); scene.add(l); p.extra.push(l);
  box(x, 0, z, .8, 6, .8, 0x6b4a2b, { piece: p });
}
function house(cx, cz, w, d, fl, col) {
  const h = fl * 4, t = .4, gw = 2.6, sw = (w - gw) / 2;
  const wall = (x, z, a, b, y = 0, hh = h) => box(x, y, z, a, hh, b, col, { piece: newPiece(220, true) });
  wall(cx, cz - d / 2, w, t); wall(cx - w / 2, cz, t, d); wall(cx + w / 2, cz, t, d);
  wall(cx - w / 2 + sw / 2, cz + d / 2, sw, t); wall(cx + w / 2 - sw / 2, cz + d / 2, sw, t); wall(cx, cz + d / 2, gw, t, 3, h - 3);
  box(cx, h, cz, w + .6, .4, d + .6, 0x555a63, { piece: newPiece(220, true) });
  rects.push([cx - w / 2 - 3, cz - d / 2 - 3, cx + w / 2 + 3, cz + d / 2 + 3]);
  spawnItem('chest', cx + R(-w / 3, w / 3), cz - d / 2 + 1.3, 4);
  for (let i = 0; i < 2; i++) spawnItem(randType(), cx + R(-w / 3, w / 3), cz + R(-d / 4, d / 4), rt());
}
const free = (x, z, m = 0) => !rects.some(r => x > r[0] - m && x < r[2] + m && z > r[1] - m && z < r[3] + m) && Math.hypot(x - LAKE.x, z - LAKE.z) > LAKE.r + 3;

/* ---------- loot ---------- */
const rt = () => { const r = Math.random(); return r < .4 ? 0 : r < .7 ? 1 : r < .88 ? 2 : r < .97 ? 3 : 4; };
const randType = () => { const r = Math.random(); return r < .28 ? 'pistol' : r < .52 ? 'ar' : r < .72 ? 'shotgun' : r < .88 ? 'shield' : 'med'; };
const itemName = it => it.type === 'chest' ? 'Open Chest' : it.type === 'shield' ? 'Shield Potion' : it.type === 'med' ? 'Med Kit' : `${WEAP[it.type].n} (${RAR[it.tier][0]})`;
function spawnItem(type, x, z, tier) {
  const chest = type === 'chest', col = chest ? 0xffb02e : type === 'shield' ? 0x2fa8ff : type === 'med' ? 0xff4d4d : RAR[tier][1];
  const m = new THREE.Mesh(UB, new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: .45 }));
  m.scale.set(chest ? 1 : .7, chest ? .6 : .35, chest ? .7 : .35); m.position.set(x, .6, z); scene.add(m);
  items.push({ type, tier, mesh: m, x, z });
}
function pickup(c) {
  let best = null, bd = 3.6;
  for (const it of items) { const d = Math.hypot(it.x - c.pos.x, it.z - c.pos.z); if (d < bd) { bd = d; best = it; } }
  return best;
}
function take(c, it) {
  items.splice(items.indexOf(it), 1); scene.remove(it.mesh);
  if (it.type === 'chest') { for (let i = 0; i < 2; i++) spawnItem(randType(), it.x + R(-1.5, 1.5), it.z + R(0, 2), rt()); return; }
  if (it.type === 'shield') c.sh = Math.min(100, c.sh + 50);
  else if (it.type === 'med') c.hp = Math.min(100, c.hp + 50);
  else {
    let i = c.inv.findIndex(w => !w); if (i < 0) i = c.slot > 0 ? c.slot - 1 : 0;
    const old = c.inv[i]; if (old) spawnItem(old.type, c.pos.x + 1, c.pos.z + 1, old.tier);
    c.inv[i] = { type: it.type, tier: it.tier, ammo: WEAP[it.type].mag }; c.slot = i + 1; setGun(c);
  }
}

/* ---------- characters ---------- */
function mkChar(name, col, bot) {
  const g = new THREE.Group();
  const part = (w, h, d, c, y, x = 0) => { const m = new THREE.Mesh(UB, mat(c)); m.scale.set(w, h, d); m.position.set(x, y, 0); g.add(m); return m; };
  part(.5, .8, .3, col, 1); part(.2, .6, .2, 0x2c3e50, .3, -.14); part(.2, .6, .2, 0x2c3e50, .3, .14);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 6), mat(0xf1c27d)); head.position.y = 1.65; g.add(head);
  const gun = part(.12, .12, .7, 0x777777, 1.1, .35); gun.position.z = -.4;
  const glider = part(3, .08, 2, 0xff8a2b, 2.7); glider.visible = false;
  scene.add(g);
  return { name, bot, pos: V(), vel: V(), yaw: 0, pitch: 0, hp: 100, sh: 0, alive: true, mesh: g, gun, glider, inv: [null, null, null], slot: 0, cool: 0, rel: 0, relW: null, wood: 0, mode: 'bus', onGround: false, blocked: false, elims: 0, seed: R(0, 6), think: 0, react: 0, wpT: 0, stuck: 0 };
}
function setGun(c) {
  const w = c.slot ? c.inv[c.slot - 1] : null;
  c.gun.visible = c.slot === 0 || !!w;
  c.gun.material = mat(c.slot === 0 ? 0x999999 : w ? RAR[w.tier][1] : 0x333333);
}
const player = mkChar('You', 0x3a8dff, false);
chars.push(player);
for (let i = 0; i < BOTS; i++) {
  const b = mkChar(pick(NAMES) + ((R(1, 99)) | 0), pick([0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe84393, 0x7f8c8d]), true);
  b.dropT = R(1, 13); const po = pick(POIS);
  b.land = { x: clamp(po[1] + R(-po[4], po[4]), -MAP, MAP), z: clamp(po[2] + R(-po[4], po[4]), -MAP, MAP) };
  if (Math.random() < .3) b.land = { x: R(-MAP, MAP), z: R(-MAP, MAP) };
  chars.push(b);
}

/* ---------- physics ---------- */
function physics(c, dt) {
  const r = .4, h = 1.8, p = c.pos; c.blocked = false;
  const ov = s => p.x + r > s.min.x && p.x - r < s.max.x && p.z + r > s.min.z && p.z - r < s.max.z && p.y + h > s.min.y && p.y < s.max.y - .001;
  if (c.mode === 'ground') c.vel.y -= 28 * dt;
  for (const a of ['x', 'z']) {
    const mv = c.vel[a] * dt; p[a] += mv;
    for (const s of solids) if (ov(s)) {
      if (s.max.y - p.y <= .65) p.y = s.max.y; else { p[a] -= mv; c.vel[a] = 0; c.blocked = true; break; }
    }
  }
  p.y += c.vel.y * dt; c.onGround = false;
  for (const s of solids) if (ov(s)) {
    if (c.vel.y <= 0) { p.y = s.max.y; c.onGround = true; } else p.y = s.min.y - h;
    c.vel.y = 0;
  }
  if (p.y <= 0) { p.y = 0; if (c.vel.y < 0) c.vel.y = 0; c.onGround = true; }
  p.x = clamp(p.x, -MAP, MAP); p.z = clamp(p.z, -MAP, MAP);
}

/* ---------- raycasting & combat ---------- */
function rayBox(o, d, s) {
  let t0 = 0, t1 = 1e9;
  for (const a of ['x', 'y', 'z']) {
    const inv = 1 / (d[a] || 1e-9); let ta = (s.min[a] - o[a]) * inv, tb = (s.max[a] - o[a]) * inv;
    if (ta > tb) { const t = ta; ta = tb; tb = t; }
    if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) return null;
  }
  return t0;
}
function raySph(o, d, x, y, z, r) {
  const ox = o.x - x, oy = o.y - y, oz = o.z - z, b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r, h = b * b - c;
  if (h < 0) return null; const t = -b - Math.sqrt(h); return t > 0 ? t : null;
}
function cast(o, d, max, ign, solidOnly) {
  let best = { t: max };
  if (d.y < 0) { const g = -o.y / d.y; if (g < best.t) best = { t: g }; }
  for (const s of solids) { const t = rayBox(o, d, s); if (t !== null && t < best.t) best = { t, s }; }
  if (!solidOnly) for (const c of chars) {
    if (!c.alive || c === ign) continue;
    let t = raySph(o, d, c.pos.x, c.pos.y + .9, c.pos.z, .55); if (t !== null && t < best.t) best = { t, ch: c };
    t = raySph(o, d, c.pos.x, c.pos.y + 1.65, c.pos.z, .28); if (t !== null && t < best.t) best = { t, ch: c, head: true };
  }
  return best;
}
function tracer(a, b) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xffe28a }));
  scene.add(l); setTimeout(() => { scene.remove(l); l.geometry.dispose(); }, 50);
}
function shoot(c, o, d, w) {
  const W = WEAP[w.type], dmg = W.d * (1 + .1 * w.tier) * (c.bot ? .6 : 1);
  for (let i = 0; i < W.pel; i++) {
    const dir = d.clone(); dir.x += R(-1, 1) * W.sp; dir.y += R(-1, 1) * W.sp; dir.z += R(-1, 1) * W.sp; dir.normalize();
    const h = cast(o, dir, W.rng, c);
    if (i < 2 && o.distanceTo(player.pos) < 130) tracer(o.clone().addScaledVector(dir, 1), o.clone().addScaledVector(dir, Math.min(h.t, 120)));
    if (h.ch) damage(h.ch, dmg * (h.head ? 2 : 1) * (W.pel > 1 ? 1 - h.t / W.rng * .7 : 1), c, h.head);
    else if (h.s) hitSolid(h.s, dmg * (W.pel > 1 ? .5 : 1));
  }
  if (c === player) beep(c.slot === 3 ? 90 : 160, .1, .08, 'sawtooth');
  else if (o.distanceTo(player.pos) < 60) beep(120, .08, .03, 'sawtooth');
}
function damage(c, a, by, head) {
  if (!c.alive) return;
  if (c.sh > 0) { const s = Math.min(c.sh, a); c.sh -= s; a -= s; }
  c.hp -= a;
  if (by === player) { const h = $('hit'); h.classList.add('on'); setTimeout(() => h.classList.remove('on'), 90); beep(head ? 900 : 600, .06, .05, 'sine'); }
  if (c.hp <= 0) kill(c, by);
}
function kill(c, by) {
  c.alive = false; scene.remove(c.mesh);
  c.inv.forEach(w => w && spawnItem(w.type, c.pos.x + R(-1, 1), c.pos.z + R(-1, 1), w.tier));
  const n = chars.filter(x => x.alive).length; $('alive').textContent = n;
  feed(by ? `${by.name} eliminated ${c.name}` : `${c.name} was caught in the storm`);
  if (by) by.elims++; if (by === player) $('elims').textContent = player.elims;
  if (c === player) end(false, n + 1); else if (player.alive && n === 1) end(true, 1);
}
function feed(t) { const e = document.createElement('div'); e.textContent = t; $('feed').prepend(e); setTimeout(() => e.remove(), 5000); }
function tickReload(c, dt) { if (c.rel > 0) { c.rel -= dt; if (c.rel <= 0 && c.relW) { c.relW.ammo = WEAP[c.relW.type].mag; c.relW = null; } } }
function startReload(c, w) { if (c.rel > 0 || w.ammo >= WEAP[w.type].mag) return; c.rel = WEAP[w.type].rl; c.relW = w; }

/* ---------- building ---------- */
function build(c, type) {
  if (c.wood < 10 || c.mode !== 'ground') return;
  const fx = -Math.sin(c.yaw), fz = -Math.cos(c.yaw), ax = Math.abs(fx) > Math.abs(fz);
  const dx = ax ? Math.sign(fx) : 0, dz = ax ? 0 : Math.sign(fz);
  const cx = Math.round(c.pos.x / 4) * 4, cz = Math.round(c.pos.z / 4) * 4, by = Math.floor((c.pos.y + .2) / 4) * 4;
  const key = type + cx + ',' + cz + ',' + by + ',' + dx + ',' + dz; if (builtKeys.has(key)) return;
  const p = newPiece(150, false); p.key = key;
  if (type === 'wall') {
    const x = cx + dx * 2, z = cz + dz * 2; box(x, by, z, dx ? .4 : 4, 4, dx ? 4 : .4, 0xc59a5a, { piece: p });
    if (dx && Math.abs(c.pos.x - x) < .8) c.pos.x = x - dx * .8; if (dz && Math.abs(c.pos.z - z) < .8) c.pos.z = z - dz * .8;
  } else if (type === 'floor') box(cx + dx * 4, by, cz + dz * 4, 4, .3, 4, 0xb58a4a, { piece: p });
  else for (let i = 0; i < 8; i++) {
    const off = -2 + (i + .5) * .5; box(cx + dx * 4 + dx * off, by, cz + dz * 4 + dz * off, dx ? .5 : 4, (i + 1) * .5, dx ? 4 : .5, 0xd9b06a, { piece: p });
  }
  c.wood -= 10; builtKeys.add(key);
}

/* ---------- world generation ---------- */
for (const po of POIS) {
  let n = 0, tries = 0;
  while (n < po[3] && tries++ < 60) {
    const a = R(0, 6.28), rad = R(0, po[4]), x = po[1] + Math.cos(a) * rad, z = po[2] + Math.sin(a) * rad;
    const w = R(8, 13), d = R(8, 13);
    if (!free(x, z, 8) || Math.abs(x) > MAP - 15 || Math.abs(z) > MAP - 15) continue;
    house(x, z, w, d, po[5] ? pick([2, 3, 4]) : pick([1, 1, 2]), pick(HOUSE_COLS)); n++;
  }
}
for (let i = 0; i < 190; i++) { const x = R(-MAP, MAP), z = R(-MAP, MAP); if (free(x, z, 4)) tree(x, z); }
for (let i = 0; i < 70; i++) { const x = R(-MAP, MAP), z = R(-MAP, MAP); if (free(x, z, 1)) spawnItem(randType(), x, z, rt()); }

/* ---------- bus, zone ---------- */
const ang = R(0, 6.28), bdir = V(Math.cos(ang), 0, Math.sin(ang)), perp = V(-bdir.z, 0, bdir.x).multiplyScalar(R(-60, 60));
const bus = { pos: bdir.clone().multiplyScalar(-MAP * 1.1).add(perp).setY(90), dir: bdir, t: 0, dur: 660 / 45, mesh: new THREE.Group() };
{ const b = new THREE.Mesh(UB, mat(0x3a8dff)); b.scale.set(6, 3, 14); const ba = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), mat(0xffd23f)); ba.position.y = 9; bus.mesh.add(b, ba); scene.add(bus.mesh); bus.mesh.rotation.y = Math.atan2(bdir.x, bdir.z); }
const PH = [{ r: 250, wait: 50, shrink: 35, dps: 1 }, { r: 160, wait: 35, shrink: 30, dps: 2 }, { r: 90, wait: 30, shrink: 25, dps: 4 }, { r: 40, wait: 25, shrink: 20, dps: 7 }, { r: 10, wait: 20, shrink: 20, dps: 10 }, { r: 0, wait: 5, shrink: 20, dps: 10 }];
const Z = { x: 0, z: 0, r: 340, i: 0, t: 0, shr: false, nx: 0, nz: 0, fx: 0, fz: 0, fr: 0, tick: 0 };
function nextZone() { const ph = PH[Z.i]; if (!ph) return; const a = R(0, 6.28), rad = R(0, Math.max(0, Z.r - ph.r)) * .8; Z.nx = Z.x + Math.cos(a) * rad; Z.nz = Z.z + Math.sin(a) * rad; }
nextZone();
const storm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 220, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0x8a2be2, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
scene.add(storm);
function updateZone(dt) {
  const ph = PH[Z.i]; if (!ph) return; Z.t += dt;
  if (!Z.shr) { if (Z.t >= ph.wait) { Z.shr = true; Z.t = 0; Z.fx = Z.x; Z.fz = Z.z; Z.fr = Z.r; } }
  else { const k = Math.min(1, Z.t / ph.shrink); Z.x = Z.fx + (Z.nx - Z.fx) * k; Z.z = Z.fz + (Z.nz - Z.fz) * k; Z.r = Z.fr + (ph.r - Z.fr) * k; if (k >= 1) { Z.i++; Z.t = 0; Z.shr = false; nextZone(); } }
  Z.tick += dt;
  if (Z.tick >= 1) { Z.tick = 0; const dps = PH[Math.min(Z.i, PH.length - 1)].dps; for (const c of chars) if (c.alive && c.mode === 'ground' && Math.hypot(c.pos.x - Z.x, c.pos.z - Z.z) > Z.r) damage(c, dps, null); }
  storm.scale.set(Z.r, 1, Z.r); storm.position.set(Z.x, 100, Z.z);
  const left = Math.max(0, Math.ceil((Z.shr ? ph.shrink : ph.wait) - Z.t));
  $('zone').textContent = Z.shr ? `Storm closing  ${left}s` : `Storm shrinks in ${left}s`;
}

/* ---------- audio ---------- */
let ac; function beep(f, d, v = .05, type = 'square') {
  if (!ac) return; const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f; g.gain.value = v; g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + d);
  o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d);
}

/* ---------- bots ---------- */
const eye = c => V(c.pos.x, c.pos.y + 1.4, c.pos.z);
function pickWP() { const a = R(0, 6.28), rad = R(0, Z.r * .85); return { x: clamp(Z.x + Math.cos(a) * rad, -MAP + 5, MAP - 5), z: clamp(Z.z + Math.sin(a) * rad, -MAP + 5, MAP - 5) }; }
function botAI(b, dt, time) {
  if (b.mode === 'bus') { b.pos.copy(bus.pos); b.dropT -= dt; if (b.dropT <= 0) { b.mode = 'glide'; b.pos.x += R(-6, 6); b.pos.z += R(-6, 6); } return; }
  if (b.mode === 'glide') {
    const dx = b.land.x - b.pos.x, dz = b.land.z - b.pos.z, d = Math.hypot(dx, dz), sp = d > 3 ? 22 : 0;
    b.vel.x = dx / (d || 1) * sp; b.vel.z = dz / (d || 1) * sp; b.vel.y = -clamp(b.pos.y / (d / 22 + .3), 8, 45); b.yaw = Math.atan2(-dx, -dz);
    physics(b, dt); if (b.onGround) { b.mode = 'ground'; b.lootT = R(3, 10); } return;
  }
  b.cool -= dt; b.react -= dt; tickReload(b, dt);
  if (b.lootT > 0) { b.lootT -= dt; if (b.lootT <= 0) { const t = pick(['pistol', 'ar', 'ar', 'shotgun']); b.inv[0] = { type: t, tier: rt(), ammo: WEAP[t].mag }; b.slot = 1; setGun(b); } }
  b.think -= dt;
  if (b.think <= 0) {
    b.think = R(.25, .5); let best = null, bd = 70;
    for (const c of chars) {
      if (c === b || !c.alive || c.mode !== 'ground') continue;
      const d = Math.hypot(c.pos.x - b.pos.x, c.pos.z - b.pos.z); if (d >= bd) continue;
      const o = eye(b), t = V(c.pos.x, c.pos.y + 1, c.pos.z).sub(o), L = t.length(); t.divideScalar(L);
      if (cast(o, t, L + 1, b).ch === c) { best = c; bd = d; }
    }
    if (best && b.tgt !== best) b.react = R(.3, .8); b.tgt = best;
  }
  const w = b.inv[0]; let fw = 0, st = 0, sp = 6.5;
  if (b.tgt && b.tgt.alive && b.tgt.mode === 'ground') {
    const t = b.tgt, dx = t.pos.x - b.pos.x, dz = t.pos.z - b.pos.z, d = Math.hypot(dx, dz);
    b.yaw = Math.atan2(-dx, -dz); st = Math.sin(time * 1.3 + b.seed) > 0 ? .8 : -.8; fw = d > 22 ? 1 : d < 9 ? -1 : 0; if (b.hp < 35) fw = -1;
    if (w && b.react <= 0 && b.rel <= 0 && b.cool <= 0 && d < WEAP[w.type].rng * .8) {
      if (w.ammo <= 0) startReload(b, w);
      else {
        w.ammo--; b.cool = WEAP[w.type].rate * 1.5; const o = eye(b), dir = V(t.pos.x, t.pos.y + 1.1, t.pos.z).sub(o).normalize(), e = .02 + d * .0016;
        dir.x += R(-e, e); dir.y += R(-e, e); dir.z += R(-e, e); shoot(b, o, dir.normalize(), w);
      }
    }
  } else {
    b.tgt = null;
    if (Math.hypot(b.pos.x - Z.x, b.pos.z - Z.z) > Z.r - 6) b.wp = { x: Z.x + R(-5, 5), z: Z.z + R(-5, 5) };
    if (!b.wp || (b.wpT -= dt) <= 0) { b.wp = pickWP(); b.wpT = R(10, 25); }
    const dx = b.wp.x - b.pos.x, dz = b.wp.z - b.pos.z; if (Math.hypot(dx, dz) < 3) b.wpT = 0;
    b.yaw = Math.atan2(-dx, -dz); fw = 1; sp = 7.5;
  }
  const f = [-Math.sin(b.yaw), -Math.cos(b.yaw)], r = [Math.cos(b.yaw), -Math.sin(b.yaw)];
  b.vel.x = (f[0] * fw + r[0] * st) * sp; b.vel.z = (f[1] * fw + r[1] * st) * sp;
  if (b.blocked && b.onGround) { b.vel.y = 9.5; b.stuck += dt; if (b.stuck > 1.2) { b.wp = pickWP(); b.stuck = 0; } }
  physics(b, dt);
}

/* ---------- player ---------- */
const K = {}; let mouse = false, started = false, over = false;
function updatePlayer(dt) {
  const p = player;
  if (p.mode === 'bus') { p.pos.copy(bus.pos); if (K.Space || bus.t > bus.dur) { p.mode = 'glide'; p.pos.y -= 2; } return; }
  const f = [-Math.sin(p.yaw), -Math.cos(p.yaw)], r = [Math.cos(p.yaw), -Math.sin(p.yaw)];
  let ix = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0), iz = (K.KeyW ? 1 : 0) - (K.KeyS ? 1 : 0); const l = Math.hypot(ix, iz) || 1; ix /= l; iz /= l;
  if (p.mode === 'glide') {
    const sp = K.KeyW ? 22 : 12; p.vel.x = f[0] * sp + r[0] * ix * 8; p.vel.z = f[1] * sp + r[1] * ix * 8; p.vel.y = (K.KeyW && p.pitch < -.3) ? -30 : -10;
    physics(p, dt); if (p.onGround) { p.mode = 'ground'; p.vel.y = 0; } return;
  }
  const sp = K.ShiftLeft ? 9.5 : 6.2; p.vel.x = (f[0] * iz + r[0] * ix) * sp; p.vel.z = (f[1] * iz + r[1] * ix) * sp;
  if (K.Space && p.onGround) p.vel.y = 9.5;
  physics(p, dt);
}
function playerFire(dt) {
  const p = player; p.cool -= dt; tickReload(p, dt);
  if (!mouse || p.mode !== 'ground' || p.cool > 0 || !document.pointerLockElement) return;
  const fwd = V(0, 0, -1).applyEuler(cam.rotation);
  if (p.slot === 0) {
    p.cool = .5; const o = V(p.pos.x, p.pos.y + 1.2, p.pos.z), h = cast(o, fwd, 3.6, p);
    if (h.ch) damage(h.ch, 20, p); else if (h.s) { const pc = hitSolid(h.s, 34); if (pc && pc.wood) { p.wood = Math.min(999, p.wood + 10); beep(300, .05, .05, 'triangle'); } }
    return;
  }
  const w = p.inv[p.slot - 1]; if (!w || p.rel > 0) return;
  if (w.ammo <= 0) { startReload(p, w); return; }
  w.ammo--; p.cool = WEAP[w.type].rate; p.pitch = Math.min(1.2, p.pitch + .012);
  const a = cast(cam.position, fwd, 300, p), pt = cam.position.clone().addScaledVector(fwd, a.t), o = V(p.pos.x, p.pos.y + 1.4, p.pos.z);
  shoot(p, o, pt.sub(o).normalize(), w);
}

/* ---------- input ---------- */
addEventListener('keydown', e => {
  K[e.code] = true; const p = player; if (!started || over || !p.alive) return;
  if (e.code === 'KeyQ') build(p, 'wall'); if (e.code === 'KeyF') build(p, 'floor'); if (e.code === 'KeyC') build(p, 'ramp');
  if (/^Digit[1-4]$/.test(e.code)) { p.slot = +e.code[5] - 1; setGun(p); }
  if (e.code === 'KeyR' && p.slot) { const w = p.inv[p.slot - 1]; if (w) startReload(p, w); }
  if (e.code === 'KeyE' && p.mode === 'ground') { const it = pickup(p); if (it) take(p, it); }
});
addEventListener('keyup', e => K[e.code] = false);
addEventListener('mousedown', e => { if (e.button === 0) mouse = true; });
addEventListener('mouseup', () => mouse = false);
addEventListener('mousemove', e => { if (!document.pointerLockElement || over) return; player.yaw -= e.movementX * .0022; player.pitch = clamp(player.pitch - e.movementY * .0022, -1.3, 1.3); });
addEventListener('wheel', e => { player.slot = (player.slot + (e.deltaY > 0 ? 1 : 3)) % 4; setGun(player); });
$('play').onclick = () => {
  ac = new (window.AudioContext || window.webkitAudioContext)(); ren.domElement.requestPointerLock();
  $('overlay').style.display = 'none'; started = true; player.yaw = Math.atan2(-bdir.x, -bdir.z) - 1.2 * 0;
};
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && started && !over) { $('overlay').style.display = 'flex'; $('play').textContent = 'RESUME'; started = false; } });
$('play').addEventListener('click', () => { started = true; });
function end(win, place) {
  over = true; document.exitPointerLock();
  $('overlay').style.display = 'flex'; $('overlay').querySelector('h1').textContent = win ? 'VICTORY ROYALE' : `#${place} / ${BOTS + 1}`;
  $('overlay').querySelector('h2').textContent = `${player.elims} ELIMINATIONS`; $('overlay').querySelector('pre').textContent = win ? 'Last one standing.' : 'You were eliminated.';
  $('play').textContent = 'PLAY AGAIN'; $('play').onclick = () => location.reload();
}

/* ---------- HUD ---------- */
const mini = $('mini').getContext('2d'), SC = 150 / (MAP * 2);
const mx = x => (x + MAP) * SC;
function drawMini() {
  mini.fillStyle = '#4f9a3f'; mini.fillRect(0, 0, 150, 150);
  mini.fillStyle = '#2e8fd8'; mini.beginPath(); mini.arc(mx(LAKE.x), mx(LAKE.z), LAKE.r * SC, 0, 6.3); mini.fill();
  mini.fillStyle = '#fff'; mini.font = '8px sans-serif'; POIS.forEach(p => mini.fillText(p[0], mx(p[1]) - 18, mx(p[2])));
  mini.fillStyle = 'rgba(138,43,226,.45)'; mini.beginPath(); mini.rect(0, 0, 150, 150); mini.arc(mx(Z.x), mx(Z.z), Z.r * SC, 0, 6.3, true); mini.fill('evenodd');
  const ph = PH[Z.i]; if (ph && !Z.shr) { mini.strokeStyle = '#fff'; mini.beginPath(); mini.arc(mx(Z.nx), mx(Z.nz), ph.r * SC, 0, 6.3); mini.stroke(); }
  if (bus.t < bus.dur + 1) { mini.fillStyle = '#ffd23f'; mini.fillRect(mx(bus.pos.x) - 3, mx(bus.pos.z) - 3, 6, 6); }
  mini.save(); mini.translate(mx(player.pos.x), mx(player.pos.z)); mini.rotate(-player.yaw + Math.PI); mini.fillStyle = '#fff'; mini.beginPath(); mini.moveTo(0, -6); mini.lineTo(4, 4); mini.lineTo(-4, 4); mini.fill(); mini.restore();
}
function drawHUD() {
  const p = player; $('hp').style.width = Math.max(0, p.hp) + '%'; $('sh').style.width = p.sh + '%'; $('wood').textContent = 'Wood ' + p.wood;
  const w = p.slot ? p.inv[p.slot - 1] : null;
  $('ammo').innerHTML = w ? `<span style="color:#${RAR[w.tier][1].toString(16)}">${WEAP[w.type].n}</span> ${p.rel > 0 && p.relW === w ? 'Reloading...' : w.ammo + ' / ' + WEAP[w.type].mag}` : p.slot ? 'Empty' : 'Pickaxe';
  $('slots').innerHTML = [0, 1, 2, 3].map(i => { const it = i ? p.inv[i - 1] : null; return `<div class="slot ${p.slot === i ? 'on' : ''}">${i + 1}<br>${i === 0 ? 'Pickaxe' : it ? WEAP[it.type].n : ''}</div>`; }).join('');
  $('msg').textContent = p.mode === 'bus' ? 'Press SPACE to jump from the bus' : p.mode === 'glide' ? 'Steer with the mouse. Hold W + look down to dive' : '';
  const it = p.alive && p.mode === 'ground' ? pickup(p) : null; $('prompt').textContent = it ? `[E] ${itemName(it)}` : '';
}

/* ---------- main loop ---------- */
let last = performance.now(), time = 0, hudT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (started && !over) {
    time += dt; bus.t += dt; bus.pos.addScaledVector(bus.dir, 45 * dt); bus.mesh.position.copy(bus.pos); bus.mesh.visible = bus.t < bus.dur + 4;
    for (const c of chars) if (c.alive) { c.bot ? botAI(c, dt, time) : updatePlayer(dt); }
    if (player.alive) playerFire(dt);
    for (const it of items) it.mesh.rotation.y += dt;
    if (time > 8) updateZone(dt);
    for (const c of chars) if (c.alive) { c.mesh.position.copy(c.pos); c.mesh.rotation.y = c.yaw; c.mesh.visible = c.mode !== 'bus'; c.glider.visible = c.mode === 'glide'; }
    hudT += dt; if (hudT > .1) { hudT = 0; drawHUD(); drawMini(); }
  }
  const p = player, tgt = V(p.pos.x, p.pos.y + 1.6, p.pos.z);
  cam.rotation.set(p.pitch, p.yaw, 0, 'YXZ');
  const off = V(1, .4, p.mode === 'ground' ? 3.6 : 8).applyEuler(cam.rotation), L = off.length(), dir = off.clone().normalize();
  const h = cast(tgt, dir, L, p, true); cam.position.copy(tgt).addScaledVector(dir, Math.min(L, Math.max(.6, h.t - .3)));
  ren.render(scene, cam);
}
setGun(player); drawHUD(); drawMini(); $('alive').textContent = BOTS + 1;
requestAnimationFrame(loop);
})();
