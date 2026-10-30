// Headless verification of the K-sweep feature in sim.js (stubbed DOM/canvas)
const fs = require("fs");
const vm = require("vm");
const stub = { clearRect(){}, beginPath(){}, arc(){}, fill(){}, stroke(){}, moveTo(){}, lineTo(){}, fillText(){}, setLineDash(){} };
const vals = { kSlider: "1.2", sigmaSlider: "0.15", speedSlider: "1", nSlider: "300", gammaSlider: "1" };
const els = {};
function mk(id) { return { id, value: vals[id] || "1", textContent: "", style: {}, width: 900, height: 120, addEventListener(){}, getContext(){ return stub; } }; }
["sim","rChart","kSlider","sigmaSlider","speedSlider","nSlider","gammaSlider","kVal","sigmaVal","speedVal","nVal","gammaVal","topoSelect","distSelect","reshuffleBtn","sweepBtn","kickBtn","pauseBtn","pngBtn","rVal","rBar"].forEach(i => els[i] = mk(i));
const sb = { document: { getElementById: i => els[i], createElement: () => ({ click(){} }) }, performance: { now: () => Date.now() }, requestAnimationFrame: () => 0, console, Math, Float64Array, Set, parseFloat, isNaN, Number, String };
vm.createContext(sb);
vm.runInContext("globalThis.Math=Math; globalThis.Number=Number; globalThis.String=String; globalThis.Float64Array=Float64Array; globalThis.Set=Set;", sb);
vm.runInContext(fs.readFileSync("sim.js", "utf8"), sb, { filename: "sim.js" });

const fail = (m) => { console.error("FAIL:", m); process.exit(1); };

const t0 = Date.now();
const out = vm.runInContext(
  "(() => { startSweep(); const pts=[]; for (let k=0; k<41 && sweep; k++) { sweepStep(0.02); pts.push([sweep.Ks[sweep.i-1], sweep.rs[sweep.i-1]]); } return { pts, kc: estimateKc() }; })()",
  sb
);
console.log("full sweep ms:", Date.now() - t0, "points:", out.pts.length, "Kc est:", out.kc);

if (out.pts.length !== 41) fail("expected 41 sweep points, got " + out.pts.length);
if (!out.pts.every(p => isFinite(p[1]) && p[1] >= 0 && p[1] <= 1)) fail("r out of [0,1]");
const low = out.pts.slice(0, 5).every(p => p[1] < 0.5);
const high = out.pts.slice(-5).every(p => p[1] > 0.5);
if (!low) fail("r should be low at small K: " + JSON.stringify(out.pts.slice(0, 5)));
if (!high) fail("r should be high at large K: " + JSON.stringify(out.pts.slice(-5)));
const r04 = out.pts[4][1], r40 = out.pts[40][1];
if (!(r40 > r04 + 0.2)) fail("r(4.0)=" + r40 + " not > r(0.4)=" + r04);
console.log("transition region:", out.pts.filter(p => p[0] >= 1.5 && p[0] <= 2.4).map(p => p[0].toFixed(1) + ":" + p[1].toFixed(2)).join(" "));
console.log("ALL CHECKS PASSED");
