// Kuramoto Sync Lab — coupled phase oscillator simulation on Canvas 2D
"use strict";

const cvs = document.getElementById("sim");
const ctx = cvs.getContext("2d");
const chart = document.getElementById("rChart");
const cctx = chart.getContext("2d");

const W = cvs.width, H = cvs.height;
const CX = W / 2, CY = H / 2, RADIUS = Math.min(W, H) * 0.40;

// ---- State ----
let N = 300;
let theta = new Float64Array(N);
let omega = new Float64Array(N);
let K = 1.2, sigma = 0.15, speed = 1.0, gamma = 1.0;
let topology = "global", dist = "gauss";
let paused = false;

// neighbor lists (per topology)
let neighbors = null; // null = global coupling
let zdeg = new Float64Array(N); // degree normalization

// r history for chart
const rHistory = new Array(450).fill(0);

// K-sweep state
let sweep = null; // { i, Ks, rs, running } while active

// ---- RNG helpers ----
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleOmega() {
  for (let i = 0; i < N; i++) {
    let w;
    if (dist === "gauss") w = gauss();
    else if (dist === "uniform") w = (Math.random() * 2 - 1) * Math.sqrt(3);
    else { // bimodal: two lobes at ±1
      w = (Math.random() < 0.5 ? -1 : 1) + gauss() * 0.25;
    }
    omega[i] = w * gamma;
  }
}

// ---- Topologies ----
function buildTopology() {
  neighbors = null;
  zdeg.fill(1);
  if (topology === "global") return;
  const nb = new Array(N);
  if (topology === "ring") {
    for (let i = 0; i < N; i++) nb[i] = [(i + 1) % N, (i - 1 + N) % N];
  } else if (topology === "grid") {
    const side = Math.ceil(Math.sqrt(N));
    for (let i = 0; i < N; i++) {
      const x = i % side, y = (i / side) | 0;
      const list = [];
      if (x > 0) list.push(i - 1);
      if (x < side - 1 && i + 1 < N) list.push(i + 1);
      if (y > 0) list.push(i - side);
      if (y < side - 1 && i + side < N) list.push(i + side);
      nb[i] = list;
    }
  } else if (topology === "smallworld") {
    // ring lattice rewiring (Watts–Strogatz-lite)
    const deg = 4;
    for (let i = 0; i < N; i++) {
      const s = new Set();
      for (let d = 1; d <= deg; d++) {
        if (Math.random() < 0.15) s.add((Math.random() * N) | 0);
        else { s.add((i + d) % N); s.add((i - d + N) % N); }
      }
      s.delete(i);
      nb[i] = [...s];
    }
  }
  for (let i = 0; i < N; i++) zdeg[i] = Math.max(1, nb[i].length);
  neighbors = nb;
}

function reset() {
  for (let i = 0; i < N; i++) theta[i] = Math.random() * 2 * Math.PI;
  sampleOmega();
  buildTopology();
  rHistory.fill(0);
  drawChart();
}

// ---- Physics ----
function step(dt) {
  const dtheta = new Float64Array(N);
  // global order parameter
  let sx = 0, sy = 0;
  if (topology === "global" || topology === "smallworld") {
    for (let i = 0; i < N; i++) { sx += Math.cos(theta[i]); sy += Math.sin(theta[i]); }
  }
  const rX = sx / N, rY = sy / N, rMean = Math.hypot(rX, rY);
  const psi = Math.atan2(rY, rX);

  for (let i = 0; i < N; i++) {
    let coupling = 0;
    if (topology === "global") {
      coupling = K * rMean * Math.sin(psi - theta[i]);
    } else {
      // local mean field over neighbors
      const nb = neighbors[i];
      let cx = 0, cy = 0;
      for (const j of nb) { cx += Math.cos(theta[j]); cy += Math.sin(theta[j]); }
      coupling = K * (Math.sin(Math.atan2(cy, cx) - theta[i]));
    }
    const noise = sigma > 0 ? sigma * Math.sqrt(dt) * gauss() : 0;
    dtheta[i] = omega[i] + coupling + noise;
  }
  for (let i = 0; i < N; i++) theta[i] = (theta[i] + dtheta[i] * dt) % (2 * Math.PI);
}

function orderParameter() {
  let sx = 0, sy = 0;
  for (let i = 0; i < N; i++) { sx += Math.cos(theta[i]); sy += Math.sin(theta[i]); }
  return Math.hypot(sx, sy) / N;
}

// ---- Rendering ----
function hueFor(i) {
  return (omega[i] / (3 * gamma + 1e-9)) * 120 + 240; // slow=blue, fast=red-ish
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  // faint unit circle
  ctx.strokeStyle = "rgba(120,140,180,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(CX, CY, RADIUS, 0, 2 * Math.PI);
  ctx.stroke();

  const r = orderParameter();
  // mean-field vector
  let sx = 0, sy = 0;
  for (let i = 0; i < N; i++) { sx += Math.cos(theta[i]); sy += Math.sin(theta[i]); }
  const psi = Math.atan2(sy, sx);

  for (let i = 0; i < N; i++) {
    const x = CX + RADIUS * Math.cos(theta[i]);
    const y = CY + RADIUS * Math.sin(theta[i]);
    // trail: point toward phase angle
    const tx = CX + (RADIUS + 26) * Math.cos(theta[i]);
    const ty = CY + (RADIUS + 26) * Math.sin(theta[i]);
    const hue = hueFor(i);
    ctx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.35)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.fillStyle = `hsla(${hue}, 90%, 62%, 0.95)`;
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, 2 * Math.PI);
    ctx.fill();
  }

  // mean field arrow
  const ax = CX + (RADIUS + 44) * r * Math.cos(psi);
  const ay = CY + (RADIUS + 44) * r * Math.sin(psi);
  ctx.strokeStyle = "rgba(255,159,67,0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(CX, CY);
  ctx.lineTo(ax, ay);
  ctx.stroke();
  ctx.fillStyle = "#ff9f43";
  ctx.beginPath();
  ctx.arc(ax, ay, 4, 0, 2 * Math.PI);
  ctx.fill();

  // frequency histogram (ring center label)
  ctx.fillStyle = "rgba(120,140,180,0.7)";
  ctx.font = "13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`r = ${r.toFixed(3)}`, CX, CY - 6);
  ctx.fillText(topology + " · N=" + N, CX, CY + 14);
}

function drawChart() {
  const w = chart.width, h = chart.height;
  cctx.clearRect(0, 0, w, h);
  cctx.strokeStyle = "rgba(120,140,180,0.25)";
  cctx.beginPath();
  cctx.moveTo(0, h / 2); cctx.lineTo(w, h / 2);
  cctx.stroke();
  cctx.strokeStyle = "#4ecdc4";
  cctx.lineWidth = 1.5;
  cctx.beginPath();
  for (let i = 0; i < rHistory.length; i++) {
    const x = (i / (rHistory.length - 1)) * w;
    const y = h - rHistory[i] * (h - 8) - 4;
    i === 0 ? cctx.moveTo(x, y) : cctx.lineTo(x, y);
  }
  cctx.stroke();
  cctx.fillStyle = "rgba(120,140,180,0.6)";
  cctx.font = "10px monospace";
  cctx.textAlign = "left";
  cctx.fillText("r(t) — last ~450 frames", 8, 12);
}

// ---- K sweep: measure steady-state r(t) at each K to find Kc empirically ----
// Per sweep point: settle for settleSteps frames at fixed dt, then average r
// over avgSteps frames. Speed is temporarily frozen so timing is deterministic.
function sweepStep(dt) {
  const Ksaved = K;
  const sw = sweep;
  K = sw.Ks[sw.i];
  for (let s = 0; s < sw.settleSteps; s++) step(dt);
  let acc = 0;
  for (let s = 0; s < sw.avgSteps; s++) { step(dt); acc += orderParameter(); }
  K = Ksaved;
  sw.rs[sw.i] = acc / sw.avgSteps;
  sw.i++;
}

function startSweep() {
  const Ks = [];
  for (let k = 0; k <= 4.0001; k += 0.1) Ks.push(Math.round(k * 100) / 100);
  // randomize phases again so every sweep starts from incoherence
  for (let i = 0; i < N; i++) theta[i] = Math.random() * 2 * Math.PI;
  rHistory.fill(0);
  sweep = { Ks, rs: new Array(Ks.length).fill(NaN), i: 0, settleSteps: 60, avgSteps: 60 };
}

function estimateKc() {
  const sw = sweep;
  const n = sw.Ks.length;
  // Kc = first K where r exceeds 0.35 and stays above for 3 consecutive points
  for (let i = 1; i < n - 2; i++) {
    if (sw.rs[i] > 0.35 && sw.rs[i + 1] > 0.35 && sw.rs[i + 2] > 0.35) return sw.Ks[i];
  }
  return null;
}

function drawSweep() {
  const w = chart.width, h = chart.height;
  const sw = sweep;
  // axes
  cctx.strokeStyle = "rgba(120,140,180,0.35)";
  cctx.lineWidth = 1;
  cctx.beginPath();
  cctx.moveTo(30, h - 20); cctx.lineTo(w - 10, h - 20); // x axis
  cctx.moveTo(30, 10); cctx.lineTo(30, h - 20);         // y axis
  cctx.stroke();
  cctx.fillStyle = "rgba(120,140,180,0.8)";
  cctx.font = "10px monospace";
  cctx.textAlign = "left";
  cctx.fillText("r̄(K) — steady state vs coupling  (sweep running: " + (sw.i) + "/" + sw.Ks.length + ")", 36, 14);
  cctx.textAlign = "center";
  for (const k of [0, 1, 2, 3, 4]) {
    const x = 30 + (k / 4) * (w - 40);
    cctx.fillText(String(k), x, h - 6);
  }
  // curve
  cctx.strokeStyle = "#ff9f43";
  cctx.lineWidth = 2;
  cctx.beginPath();
  let started = false;
  for (let i = 0; i < sw.i; i++) {
    const x = 30 + (sw.Ks[i] / 4) * (w - 40);
    const y = h - 20 - sw.rs[i] * (h - 40);
    if (!started) { cctx.moveTo(x, y); started = true; } else cctx.lineTo(x, y);
  }
  cctx.stroke();
  // dots
  cctx.fillStyle = "#4ecdc4";
  for (let i = 0; i < sw.i; i++) {
    const x = 30 + (sw.Ks[i] / 4) * (w - 40);
    const y = h - 20 - sw.rs[i] * (h - 40);
    cctx.beginPath();
    cctx.arc(x, y, 2.5, 0, 2 * Math.PI);
    cctx.fill();
  }
  // Kc marker
  const kc = estimateKc();
  if (kc !== null) {
    const x = 30 + (kc / 4) * (w - 40);
    cctx.strokeStyle = "rgba(255,80,80,0.9)";
    cctx.setLineDash([4, 4]);
    cctx.beginPath();
    cctx.moveTo(x, 10); cctx.lineTo(x, h - 20);
    cctx.stroke();
    cctx.setLineDash([]);
    cctx.fillStyle = "#ff5050";
    cctx.textAlign = "left";
    cctx.fillText("Kc ≈ " + kc.toFixed(1), x + 5, 26);
  }
}

// ---- UI wiring ----
const $ = (id) => document.getElementById(id);
function bindSlider(id, label, fmt, apply) {
  const el = $(id);
  const update = () => {
    $(label).textContent = fmt(parseFloat(el.value));
    apply(parseFloat(el.value));
  };
  el.addEventListener("input", update);
  update();
}
bindSlider("kSlider", "kVal", v => v.toFixed(2), v => K = v);
bindSlider("sigmaSlider", "sigmaVal", v => v.toFixed(2), v => sigma = v);
bindSlider("speedSlider", "speedVal", v => v.toFixed(1) + "×", v => speed = v);
bindSlider("nSlider", "nVal", v => String(v), v => { if (v !== N) { N = v | 0; reset(); } });
bindSlider("gammaSlider", "gammaVal", v => v.toFixed(2), v => { gamma = v; sampleOmega(); });

$("topoSelect").addEventListener("change", e => { topology = e.target.value; buildTopology(); });
$("distSelect").addEventListener("change", e => { dist = e.target.value; sampleOmega(); });
$("reshuffleBtn").addEventListener("click", () => { sampleOmega(); rHistory.fill(0); sweep = null; });
$("sweepBtn").addEventListener("click", () => {
  startSweep();
  $("sweepBtn").textContent = "Sweeping…";
});
$("kickBtn").addEventListener("click", () => {
  for (let i = 0; i < N; i++) theta[i] += (Math.random() - 0.5) * 3;
});
$("pauseBtn").addEventListener("click", e => {
  paused = !paused;
  e.target.textContent = paused ? "Resume" : "Pause";
});
$("pngBtn").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "kuramoto-sync-lab.png";
  a.href = cvs.toDataURL("image/png");
  a.click();
});

// ---- Main loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (sweep) {
    // fixed dt, no noise-free shortcut — one sweep point per frame
    sweepStep(0.02);
    drawSweep();
    $("rVal").textContent = "sweep";
    $("rBar").style.width = ((sweep.i / sweep.Ks.length) * 100).toFixed(1) + "%";
    if (sweep.i >= sweep.Ks.length) {
      sweep = null;
      $("sweepBtn").textContent = "Sweep K";
      const kc2 = estimateKc();
      $("rVal").textContent = kc2 !== null ? "Kc≈" + kc2.toFixed(1) : "–";
    }
  } else if (!paused) {
    step(dt * speed);
    rHistory.push(orderParameter());
    rHistory.shift();
    drawChart();
    const r = rHistory[rHistory.length - 1];
    $("rVal").textContent = r.toFixed(3);
    $("rBar").style.width = (r * 100).toFixed(1) + "%";
  }
  draw();
  requestAnimationFrame(frame);
}

reset();
requestAnimationFrame(frame);
