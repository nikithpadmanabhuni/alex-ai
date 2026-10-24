// -------------------------------------------------------------
// ALEX QUANTUM HUD & WAKE WORD ENGINE
// -------------------------------------------------------------

const canvas = document.getElementById("particleCanvas");
const ctx = canvas.getContext("2d");

// System States
let appState = "listening"; // 'listening', 'recognizing', 'speaking'
let coreFrequency = 84.2;
let micEnabled = true;
let liveAudioLevel = 0.0;
let audioFrequencies = new Uint8Array(32);

// Real Mac Telemetry History
const telemetryHistory = {
  cpu: [20, 25, 30, 22, 28, 25],
  ram: [55, 55, 56, 56, 57, 57],
  labels: ["-50s", "-40s", "-30s", "-20s", "-10s", "NOW"]
};

// Canvas Resolution
function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}
window.addEventListener("resize", resizeCanvas);

// -------------------------------------------------------------
// Web Audio API: Live Microphone Audio Level & Reactive Core
// -------------------------------------------------------------
let audioCtx = null;
let analyser = null;

function initWebAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") {
      try { audioCtx.resume(); } catch (e) {}
    }
    return;
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
  } catch (e) {
    console.warn("AudioContext init:", e);
  }
}

// Synthesize Sci-Fi UI Beeps
function playSciFiBeep(type = "activate") {
  if (!audioCtx) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    } catch (e) { return; }
  }
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === "wake") {
      // Alex Wake Chime (pleasant two-tone chime)
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(1150, now + 0.12);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "activate") {
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === "execute") {
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.07);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch (e) {}
}

// -------------------------------------------------------------
// -------------------------------------------------------------
// 3D Tilt Perspective & Gyroscope Physics
// -------------------------------------------------------------
let tilt = { x: 0, y: 0, targetX: 0, targetY: 0 };
window.addEventListener("mousemove", (e) => {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  tilt.targetX = (e.clientX - cx) / cx;
  tilt.targetY = (e.clientY - cy) / cy;
});

window.addEventListener("deviceorientation", (e) => {
  if (e.gamma !== null && e.beta !== null) {
    tilt.targetX = Math.max(-1, Math.min(1, e.gamma / 35));
    tilt.targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
  }
});

// -------------------------------------------------------------
// Dynamic Energy Shockwaves (Audio & Command Reactive)
// -------------------------------------------------------------
const shockwaves = [];
function triggerShockwave(x, y, color = "#00f0ff") {
  shockwaves.push({
    x: x,
    y: y,
    radius: 10,
    maxRadius: 240,
    speed: 5.2,
    alpha: 0.95,
    color: color,
  });
}

function updateAndDrawShockwaves(centerX, centerY) {
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += sw.speed;
    sw.alpha *= 0.94;

    if (sw.alpha < 0.02 || sw.radius > sw.maxRadius) {
      shockwaves.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 2.5 * sw.alpha;
    ctx.shadowColor = sw.color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = sw.alpha;
    ctx.stroke();

    // Inner chromatic resonance ring
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, Math.max(1, sw.radius - 8), 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.0 * sw.alpha;
    ctx.globalAlpha = sw.alpha * 0.7;
    ctx.stroke();
    ctx.restore();
  }
}

// -------------------------------------------------------------
// Particle & 3D Celestial Quantum Core
// -------------------------------------------------------------
const PARTICLE_COUNT = 280;
const particles = [];
let mouse = { x: null, y: null, active: false };

class ReactorParticle {
  constructor(index) {
    this.index = index;
    this.reset();
  }

  reset() {
    this.angle = Math.random() * Math.PI * 2;
    this.baseRadius = 50 + Math.random() * 95;
    this.radius = this.baseRadius;
    this.speed = (0.007 + Math.random() * 0.014) * (Math.random() < 0.5 ? 1 : -1);
    this.size = 1.2 + Math.random() * 2.6;
    this.alpha = 0.35 + Math.random() * 0.65;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.z = Math.random() * 2 - 1; // 3D depth layer

    const colors = ["#00f0ff", "#38bdf8", "#818cf8", "#a855f7", "#ffffff", "#10b981"];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(time, centerX, centerY, autoScale = 1.0) {
    let currentSpeed = this.speed;
    if (appState === "recognizing") {
      currentSpeed *= 4.0;
    } else if (appState === "speaking") {
      currentSpeed *= 2.2;
    }
    this.angle += currentSpeed;

    let targetRadius = this.baseRadius * autoScale;

    if (liveAudioLevel > 0.05) {
      targetRadius += liveAudioLevel * 50 * autoScale;
    } else {
      if (appState === "listening") {
        targetRadius += Math.sin(time * 0.003 + this.pulsePhase) * 12 * autoScale;
      } else if (appState === "recognizing") {
        targetRadius = (32 + Math.sin(time * 0.01 + this.index) * 25) * autoScale;
      } else if (appState === "speaking") {
        targetRadius += Math.sin(time * 0.008 + this.baseRadius * 0.05) * 28 * autoScale;
      }
    }

    // Shockwave particle physical displacement
    shockwaves.forEach((sw) => {
      const d = Math.abs(this.radius - sw.radius);
      if (d < 30 * autoScale) {
        targetRadius += (30 * autoScale - d) * 1.6;
      }
    });

    // Magnetic mouse attractor / repulsor
    if (mouse.active && mouse.x !== null) {
      const px = centerX + Math.cos(this.angle) * this.radius;
      const py = centerY + Math.sin(this.angle) * this.radius;
      const dx = mouse.x - px;
      const dy = mouse.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90) {
        targetRadius += (90 - dist) * 0.32;
      }
    }

    this.radius += (targetRadius - this.radius) * 0.12;
  }

  draw(centerX, centerY, autoScale = 1.0) {
    // 3D perspective projection based on gyro/mouse tilt & depth Z
    const projX = centerX + Math.cos(this.angle) * this.radius + (tilt.x * this.z * 26 * autoScale);
    const projY = centerY + Math.sin(this.angle) * this.radius * (0.84 + this.z * 0.16) + (tilt.y * this.z * 20 * autoScale);

    ctx.save();
    ctx.beginPath();
    ctx.arc(projX, projY, (this.size + (liveAudioLevel * 1.6)) * autoScale, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = appState === "speaking" || liveAudioLevel > 0.2 ? 16 : 8;
    ctx.globalAlpha = Math.min(1.0, this.alpha + (liveAudioLevel * 0.4));
    ctx.fill();
    ctx.restore();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new ReactorParticle(i));
}

// -------------------------------------------------------------
// Concentric Rotating Sci-Fi Rings with 3D Depth
// -------------------------------------------------------------
let ringRotation1 = 0;
let ringRotation2 = 0;
let ringRotation3 = 0;
let ringRotation4 = 0;

function drawHoloRings(centerX, centerY, time, autoScale = 1.0) {
  const voiceBoost = 1.0 + (liveAudioLevel * 2.2);
  ringRotation1 += 0.005 * voiceBoost;
  ringRotation2 -= 0.007 * voiceBoost;
  ringRotation3 += 0.003 * voiceBoost;
  ringRotation4 -= 0.002 * voiceBoost;

  // Center perspective offset
  const offX = tilt.x * 12 * autoScale;
  const offY = tilt.y * 8 * autoScale;

  // 1. Central Core Singularity
  ctx.save();
  const grad = ctx.createRadialGradient(centerX + offX, centerY + offY, 0, centerX + offX, centerY + offY, (48 + (liveAudioLevel * 24)) * autoScale);
  if (appState === "recognizing") {
    grad.addColorStop(0, "rgba(245, 158, 11, 0.95)");
    grad.addColorStop(0.5, "rgba(234, 88, 12, 0.45)");
    grad.addColorStop(1, "transparent");
  } else if (appState === "speaking") {
    grad.addColorStop(0, "rgba(168, 85, 247, 0.95)");
    grad.addColorStop(0.5, "rgba(0, 240, 255, 0.55)");
    grad.addColorStop(1, "transparent");
  } else {
    grad.addColorStop(0, "rgba(0, 240, 255, 0.92)");
    grad.addColorStop(0.5, "rgba(2, 132, 199, 0.38)");
    grad.addColorStop(1, "transparent");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX + offX, centerY + offY, (48 + Math.sin(time * 0.005) * 4 + (liveAudioLevel * 20)) * autoScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Inner Dashed Rotating Arc
  ctx.save();
  ctx.translate(centerX + offX * 1.3, centerY + offY * 1.3);
  ctx.rotate(ringRotation1);
  ctx.beginPath();
  ctx.arc(0, 0, (56 + (liveAudioLevel * 12)) * autoScale, 0, Math.PI * 1.6);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
  ctx.lineWidth = 1.8 + (liveAudioLevel * 2);
  ctx.setLineDash([8, 12]);
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 10 + (liveAudioLevel * 14);
  ctx.stroke();
  ctx.restore();

  // 3. Middle Ticked Segment Ring
  ctx.save();
  ctx.translate(centerX + offX * 0.9, centerY + offY * 0.9);
  ctx.rotate(ringRotation2);
  const tickCount = 40;
  const tickRadius = (92 + (liveAudioLevel * 14)) * autoScale;
  for (let i = 0; i < tickCount; i++) {
    const angle = (i * Math.PI * 2) / tickCount;
    const len = (i % 4 === 0 ? 10 : 5) * autoScale;
    const x1 = Math.cos(angle) * tickRadius;
    const y1 = Math.sin(angle) * tickRadius;
    const x2 = Math.cos(angle) * (tickRadius + len);
    const y2 = Math.sin(angle) * (tickRadius + len);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = i % 4 === 0 ? "rgba(0, 240, 255, 0.9)" : "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = (i % 4 === 0 ? 2.2 : 1) * autoScale;
    ctx.stroke();
  }
  ctx.restore();

  // 4. Outer Holographic Boundary with Compass Ticks
  ctx.save();
  ctx.translate(centerX + offX * 0.6, centerY + offY * 0.6);
  ctx.rotate(ringRotation3);
  ctx.beginPath();
  ctx.arc(0, 0, (140 + (liveAudioLevel * 14)) * autoScale, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 18]);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, (140 + (liveAudioLevel * 14)) * autoScale, 0, Math.PI * 0.45);
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2.8;
  ctx.setLineDash([]);
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 12 + (liveAudioLevel * 12);
  ctx.stroke();
  ctx.restore();
}

// -------------------------------------------------------------
// Quantum Synaptic Lightning Tendrils
// -------------------------------------------------------------
function drawQuantumTendrils(centerX, centerY, autoScale = 1.0) {
  const arcChance = appState === "speaking" ? 0.85 : (appState === "recognizing" ? 0.7 : (liveAudioLevel > 0.15 ? 0.65 : 0.28));
  if (Math.random() > arcChance) return;

  const count = appState === "speaking" ? 3 : (liveAudioLevel > 0.2 ? 2 : 1);
  const ringRadius = (94 + (liveAudioLevel * 20)) * autoScale;

  for (let c = 0; c < count; c++) {
    const targetAngle = Math.random() * Math.PI * 2;
    const targetX = centerX + (Math.cos(targetAngle) * ringRadius) + (tilt.x * 16 * autoScale);
    const targetY = centerY + (Math.sin(targetAngle) * ringRadius * 0.85) + (tilt.y * 16 * autoScale);

    const segments = 6;
    let currX = centerX + (tilt.x * 10 * autoScale);
    let currY = centerY + (tilt.y * 10 * autoScale);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(currX, currY);

    for (let s = 1; s <= segments; s++) {
      const frac = s / segments;
      const baseX = centerX + (targetX - centerX) * frac;
      const baseY = centerY + (targetY - centerY) * frac;
      const jitter = (Math.random() - 0.5) * 16 * autoScale * (1 - frac * 0.4);

      currX = baseX + jitter;
      currY = baseY + jitter;
      ctx.lineTo(currX, currY);
    }

    const arcColor = appState === "recognizing" ? "#f59e0b" : (appState === "speaking" ? "#a855f7" : "#00f0ff");
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = (1.4 + Math.random() * 1.4) * autoScale;
    ctx.shadowColor = arcColor;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.8 + Math.random() * 0.2;
    ctx.stroke();
    ctx.restore();
  }
}

// -------------------------------------------------------------
// Rotating Holographic Radar Sweep
// -------------------------------------------------------------
let radarAngle = 0;
function drawRadarSweep(centerX, centerY, autoScale = 1.0) {
  radarAngle += 0.022 * (1 + liveAudioLevel * 2);
  const radarRadius = (142 + (liveAudioLevel * 15)) * autoScale;

  ctx.save();
  ctx.translate(centerX + (tilt.x * 8 * autoScale), centerY + (tilt.y * 8 * autoScale));

  const sweepGrad = ctx.createRadialGradient(0, 0, 10 * autoScale, 0, 0, radarRadius);
  sweepGrad.addColorStop(0, "rgba(0, 240, 255, 0)");
  sweepGrad.addColorStop(1, "rgba(0, 240, 255, 0.14)");

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radarRadius, radarAngle - 0.48, radarAngle);
  ctx.closePath();
  ctx.fillStyle = sweepGrad;
  ctx.fill();

  const beamX = Math.cos(radarAngle) * radarRadius;
  const beamY = Math.sin(radarAngle) * (radarRadius * 0.86);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(beamX, beamY);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
  ctx.lineWidth = 1.6 * autoScale;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 10;
  ctx.stroke();

  ctx.restore();
}

// -------------------------------------------------------------
// Target Lock Reticle on Mouse / Touch
// -------------------------------------------------------------
function drawTargetLock(time) {
  if (!mouse.active || mouse.x === null) return;

  ctx.save();
  ctx.translate(mouse.x, mouse.y);
  ctx.rotate(time * 0.002);

  ctx.strokeStyle = "rgba(0, 240, 255, 0.7)";
  ctx.lineWidth = 1.2;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 8;

  const r = 24;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 0.85); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, Math.PI * 1.35); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r, Math.PI * 1.5, Math.PI * 1.85); ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "#00f0ff";
  ctx.fill();

  ctx.rotate(-time * 0.002);
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(0, 240, 255, 0.85)";
  ctx.fillText(`TARGET: [${Math.round(mouse.x)}, ${Math.round(mouse.y)}]`, 32, -8);
  ctx.fillText(`LOCK: ACTIVE`, 32, 6);

  ctx.restore();
}

// -------------------------------------------------------------
// Holographic Digital HUD Brackets on Canvas Corners
// -------------------------------------------------------------
function drawHUDOverlays(width, height, time) {
  ctx.save();
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(0, 240, 255, 0.55)";

  ctx.fillText(`[NEURAL CORE: ${appState.toUpperCase()}]`, 14, 20);
  ctx.fillText(`[FREQUENCY: ${(82.0 + Math.sin(time * 0.002) * 5).toFixed(1)} GHz]`, 14, 34);

  ctx.textAlign = "right";
  ctx.fillText(`[TILT: X${(tilt.x * 10).toFixed(0)} Y${(tilt.y * 10).toFixed(0)}]`, width - 14, 20);
  ctx.fillText(`[COHERENCE: 99.4%]`, width - 14, 34);

  // Corner HUD tick brackets
  ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
  ctx.lineWidth = 1.2;
  // Top-left
  ctx.beginPath(); ctx.moveTo(8, 22); ctx.lineTo(8, 8); ctx.lineTo(22, 8); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(width - 22, 8); ctx.lineTo(width - 8, 8); ctx.lineTo(width - 8, 22); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(8, height - 22); ctx.lineTo(8, height - 8); ctx.lineTo(22, height - 8); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(width - 22, height - 8); ctx.lineTo(width - 8, height - 8); ctx.lineTo(width - 8, height - 22); ctx.stroke();

  ctx.restore();
}

// -------------------------------------------------------------
// Master Render Loop
// -------------------------------------------------------------
function animate(time) {
  const rect = canvas.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const autoScale = Math.max(0.65, Math.min(1.0, Math.min(rect.width, rect.height) / 280));

  // Smooth tilt lerp
  tilt.x += (tilt.targetX - tilt.x) * 0.08;
  tilt.y += (tilt.targetY - tilt.y) * 0.08;

  ctx.clearRect(0, 0, rect.width, rect.height);

  drawHUDOverlays(rect.width, rect.height, time);
  drawRadarSweep(centerX, centerY, autoScale);
  drawHoloRings(centerX, centerY, time, autoScale);
  drawQuantumTendrils(centerX, centerY, autoScale);

  particles.forEach((p) => {
    p.update(time, centerX, centerY, autoScale);
    p.draw(centerX, centerY, autoScale);
  });

  updateAndDrawShockwaves(centerX, centerY);
  drawTargetLock(time);
  animateWaveform(time);

  requestAnimationFrame(animate);
}

// -------------------------------------------------------------
// Interactive Soundwave Bars
// -------------------------------------------------------------
const waveBars = document.querySelectorAll(".wave-bar");

function animateWaveform(time) {
  waveBars.forEach((bar, index) => {
    let h = 4;
    if (audioFrequencies && audioFrequencies.length > index) {
      const val = audioFrequencies[index * 2] || 0;
      h = Math.max(4, Math.min(26, (val / 255) * 26));
    } else {
      let scale = 0.5 + Math.sin(time * 0.008 + index * 0.6) * 0.5;
      h = Math.max(4, Math.min(26, scale * 22));
    }
    bar.style.height = `${h}px`;
    if (liveAudioLevel > 0.2) {
      bar.style.background = "#38bdf8";
      bar.style.boxShadow = "0 0 10px #00f0ff";
    } else {
      bar.style.background = "#00f0ff";
    }
  });
}

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
  mouse.active = true;
});
canvas.addEventListener("mouseleave", () => {
  mouse.active = false;
});

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  triggerShockwave(clickX, clickY, "#00f0ff");
  unlockAudio();
  if (isVoiceActive) {
    stopVoiceSession();
  } else {
    startVoiceSession();
  }
});

// -------------------------------------------------------------
// State Management & Telemetry UI Updates
// -------------------------------------------------------------
const statusPill = document.getElementById("statusPill");
const statusText = document.getElementById("statusText");
const coreStatus = document.getElementById("coreStatus");
const coreFrequencyEl = document.getElementById("coreFrequency");
const feedLog = document.getElementById("feedLog");

function setAppState(state, msg) {
  appState = state;
  statusPill.className = `status-pill ${state}`;

  if (state === "listening") {
    statusText.innerText = msg || "ALEX ONLINE // LISTENING";
    coreStatus.innerText = "ACTIVE";
    coreStatus.style.color = "#00f0ff";
  } else if (state === "recognizing") {
    statusText.innerText = msg || "PROCESSING COMMAND...";
    coreStatus.innerText = "ANALYZING";
    coreStatus.style.color = "#f59e0b";
  } else if (state === "speaking") {
    statusText.innerText = msg || "ALEX RESPONDING...";
    coreStatus.innerText = "SPEAKING";
    coreStatus.style.color = "#a855f7";
  }

  coreFrequency = (82.0 + Math.random() * 8.0).toFixed(1);
  coreFrequencyEl.innerText = `${coreFrequency} GHz`;
}

function addLogEntry(role, text) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${role}`;

  const ts = document.createElement("span");
  ts.className = "timestamp";
  const now = new Date();
  ts.innerText = `[${now.toTimeString().split(" ")[0]}]`;

  const body = document.createElement("span");
  body.className = "text";
  if (role === "user") {
    body.innerText = `YOU: ${text}`;
  } else if (role === "alex" || role === "jarvis") {
    body.innerText = `ALEX: ${text}`;
  } else if (role === "exec") {
    body.innerText = `⚡ ${text}`;
  } else {
    body.innerText = text;
  }

  entry.appendChild(ts);
  entry.appendChild(body);
  feedLog.appendChild(entry);
  feedLog.scrollTop = feedLog.scrollHeight;
}

// -------------------------------------------------------------
// Universal Audio & Speech Engine (Mobile Phones & Desktop)
// -------------------------------------------------------------
let audioUnlocked = false;
let alexAudioPlayer = new Audio();

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch (e) {}
  try {
    alexAudioPlayer.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    alexAudioPlayer.play().catch(() => {});
  } catch (e) {}
  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const dummy = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(dummy);
    }
  } catch (e) {}
}

window.addEventListener("touchstart", unlockAudio, { passive: true });
window.addEventListener("click", unlockAudio);

function playAlexVoice(text, audioUrl) {
  unlockAudio();
  if (!text && !audioUrl) return;

  const clean = (text || "").replace(/[\*\#\_`\[\]]/g, "").trim();
  const src = audioUrl || `/api/tts_audio?text=${encodeURIComponent(clean)}`;

  setAppState("speaking", "ALEX RESPONDING...");

  if (!alexAudioPlayer) alexAudioPlayer = new Audio();
  alexAudioPlayer.src = src;

  let played = false;
  const p = alexAudioPlayer.play();
  if (p !== undefined) {
    p.then(() => {
      played = true;
    }).catch((err) => {
      console.warn("HTML5 audio playback error, trying SpeechSynthesis fallback:", err);
      speakInBrowser(clean);
    });
  }

  alexAudioPlayer.onended = () => {
    setAppState("listening", "ALEX ONLINE // READY");
  };
}

function speakInBrowser(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const clean = text.replace(/[\*\#\_`\[\]]/g, "");
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes("Samantha") || v.name.includes("Daniel") || v.name.includes("Google US English") || (v.lang === "en-US" && !v.name.includes("Bad")));
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => {
    setAppState("speaking", "ALEX RESPONDING...");
  };
  utterance.onend = () => {
    setAppState("listening", "ALEX ONLINE // READY");
  };

  window.speechSynthesis.speak(utterance);
}

// -------------------------------------------------------------
// Interactive Voice Engine: Tap-to-Talk & Universal Phone Fallback
// -------------------------------------------------------------
const listeningOverlay = document.getElementById("listeningOverlay");
const listeningTranscript = document.getElementById("listeningTranscript");
const listeningStopBtn = document.getElementById("listeningStopBtn");
const listeningCancelBtn = document.getElementById("listeningCancelBtn");
const mobileMicBtn = document.getElementById("mobileMicBtn");
const inlineMicBtn = document.getElementById("inlineMicBtn");
const micBtnLabel = document.getElementById("micBtnLabel");

let isVoiceActive = false;
let mediaRecorder = null;
let recordedChunks = [];
let voiceStream = null;
let activeRecognitionInstance = null;
let sessionFinalTranscript = "";

function startVoiceSession() {
  unlockAudio();
  playSciFiBeep("wake");
  isVoiceActive = true;
  sessionFinalTranscript = "";

  if (listeningOverlay) listeningOverlay.classList.add("active");
  if (listeningTranscript) listeningTranscript.innerText = "Listening... Speak your command clearly now.";
  if (mobileMicBtn) {
    mobileMicBtn.classList.add("listening");
    if (micBtnLabel) micBtnLabel.innerText = "LISTENING... (TAP TO SEND)";
  }
  if (inlineMicBtn) inlineMicBtn.classList.add("listening");
  setAppState("recognizing", "ALEX IS LISTENING TO YOU...");

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Primary: Native Web Speech Recognition directly inside the user tap gesture
  if (SpeechRec) {
    try {
      if (activeRecognitionInstance) {
        try { activeRecognitionInstance.abort(); } catch (e) {}
      }
      activeRecognitionInstance = new SpeechRec();
      activeRecognitionInstance.continuous = false;
      activeRecognitionInstance.interimResults = true;
      activeRecognitionInstance.lang = "en-US";

      activeRecognitionInstance.onresult = (e) => {
        let interim = "";
        let finalStr = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalStr += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        const text = (finalStr || interim).trim();
        if (text && listeningTranscript) {
          listeningTranscript.innerText = `"${text}"`;
        }
        if (finalStr.trim()) {
          sessionFinalTranscript = finalStr.trim();
        }
      };

      activeRecognitionInstance.onerror = (e) => {
        console.warn("SpeechRec error notice:", e.error);
        if (!mediaRecorder && isVoiceActive) {
          startMediaRecorderFallback();
        }
      };

      activeRecognitionInstance.onend = () => {
        if (isVoiceActive) {
          stopVoiceSession();
        }
      };

      activeRecognitionInstance.start();
      return;
    } catch (err) {
      console.warn("SpeechRec start notice:", err);
    }
  }

  // Fallback: MediaRecorder audio stream (100% universal across all mobile browsers)
  startMediaRecorderFallback();
}

function startMediaRecorderFallback() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (listeningTranscript) listeningTranscript.innerText = "Microphone is unavailable or blocked on this device.";
    return;
  }

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    voiceStream = stream;
    recordedChunks = [];
    
    let mime = "";
    if (typeof MediaRecorder !== "undefined") {
      if (MediaRecorder.isTypeSupported("audio/mp4")) mime = "audio/mp4";
      else if (MediaRecorder.isTypeSupported("audio/webm")) mime = "audio/webm";
      else if (MediaRecorder.isTypeSupported("audio/aac")) mime = "audio/aac";
    }

    mediaRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      if (voiceStream) {
        voiceStream.getTracks().forEach((t) => t.stop());
        voiceStream = null;
      }
      if (recordedChunks.length > 0) {
        const audioBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/mp4" });
        uploadVoiceAudio(audioBlob);
      }
    };

    mediaRecorder.start(250);
  }).catch((err) => {
    console.warn("getUserMedia error:", err);
    if (listeningTranscript) listeningTranscript.innerText = "⚠️ Microphone access was blocked. Tap allow in browser settings.";
  });
}

function stopVoiceSession() {
  if (!isVoiceActive) return;
  isVoiceActive = false;

  playSciFiBeep("execute");
  if (listeningOverlay) listeningOverlay.classList.remove("active");
  if (mobileMicBtn) {
    mobileMicBtn.classList.remove("listening");
    if (micBtnLabel) micBtnLabel.innerText = "TAP TO TALK TO ALEX";
  }
  if (inlineMicBtn) inlineMicBtn.classList.remove("listening");

  if (sessionFinalTranscript && sessionFinalTranscript.trim()) {
    const cmd = sessionFinalTranscript.trim();
    sessionFinalTranscript = "";
    sendCommand(cmd);
  } else if (activeRecognitionInstance) {
    try { activeRecognitionInstance.stop(); } catch (e) {}
    activeRecognitionInstance = null;
  }

  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
}

function cancelVoiceSession() {
  isVoiceActive = false;
  sessionFinalTranscript = "";
  if (listeningOverlay) listeningOverlay.classList.remove("active");
  if (mobileMicBtn) {
    mobileMicBtn.classList.remove("listening");
    if (micBtnLabel) micBtnLabel.innerText = "TAP TO TALK TO ALEX";
  }
  if (inlineMicBtn) inlineMicBtn.classList.remove("listening");

  if (activeRecognitionInstance) {
    try { activeRecognitionInstance.abort(); } catch (e) {}
    activeRecognitionInstance = null;
  }
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onstop = null;
    mediaRecorder.stop();
  }
  if (voiceStream) {
    voiceStream.getTracks().forEach((t) => t.stop());
    voiceStream = null;
  }
  setAppState("listening", "ALEX ONLINE // READY");
}

// -------------------------------------------------------------
// Target Device Management (Phone vs Laptop Execution Routing)
// -------------------------------------------------------------
const isDeviceMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
let currentTargetDevice = isDeviceMobile ? "phone" : "laptop";

const targetDeviceBtn = document.getElementById("targetDeviceBtn");
const targetDeviceIcon = document.getElementById("targetDeviceIcon");
const targetDeviceLabel = document.getElementById("targetDeviceLabel");
const targetPhoneBtn = document.getElementById("targetPhoneBtn");
const targetLaptopBtn = document.getElementById("targetLaptopBtn");

function setTargetDevice(device) {
  currentTargetDevice = device === "phone" ? "phone" : "laptop";
  updateTargetDeviceUI();
}

function updateTargetDeviceUI() {
  const isPhone = currentTargetDevice === "phone";
  if (targetDeviceIcon) targetDeviceIcon.innerText = isPhone ? "📱" : "💻";
  if (targetDeviceLabel) targetDeviceLabel.innerText = isPhone ? "IN PHONE" : "IN LAPTOP";
  if (targetDeviceBtn) {
    targetDeviceBtn.title = isPhone ? "Executing in Phone (Tap to switch to Laptop)" : "Executing on Laptop (Tap to switch to Phone)";
    if (isPhone) {
      targetDeviceBtn.style.borderColor = "rgba(16, 185, 129, 0.6)";
      targetDeviceBtn.style.color = "#10b981";
    } else {
      targetDeviceBtn.style.borderColor = "rgba(0, 240, 255, 0.6)";
      targetDeviceBtn.style.color = "#00f0ff";
    }
  }
  if (targetPhoneBtn) {
    if (isPhone) targetPhoneBtn.classList.add("active");
    else targetPhoneBtn.classList.remove("active");
  }
  if (targetLaptopBtn) {
    if (!isPhone) targetLaptopBtn.classList.add("active");
    else targetLaptopBtn.classList.remove("active");
  }
}

if (targetDeviceBtn) {
  targetDeviceBtn.addEventListener("click", () => {
    setTargetDevice(currentTargetDevice === "phone" ? "laptop" : "phone");
    playSciFiBeep("switch");
    addLogEntry("system", `⚙️ Task execution target switched to: ${currentTargetDevice.toUpperCase()}`);
  });
}

if (targetPhoneBtn) {
  targetPhoneBtn.addEventListener("click", () => {
    setTargetDevice("phone");
    playSciFiBeep("switch");
    addLogEntry("system", "📱 Task execution target set to: THIS PHONE");
  });
}

if (targetLaptopBtn) {
  targetLaptopBtn.addEventListener("click", () => {
    setTargetDevice("laptop");
    playSciFiBeep("switch");
    addLogEntry("system", "💻 Task execution target set to: LAPTOP");
  });
}

// Initialize on page load
updateTargetDeviceUI();

async function uploadVoiceAudio(blob) {
  setAppState("recognizing", "ANALYZING AUDIO...");
  addLogEntry("system", "🎙️ Transmitting mobile voice snippet to Alex...");

  const formData = new FormData();
  formData.append("audio", blob, "voice.m4a");
  formData.append("target_device", currentTargetDevice);

  try {
    const res = await fetch("/api/voice_upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.status === "ok") {
      addLogEntry("user", data.transcript);
      addLogEntry("alex", data.response);
      playAlexVoice(data.response, data.audio_url);
      if (data.action) handleClientAction(data.action);
    } else {
      addLogEntry("system", data.response || "Audio could not be transcribed.");
      playAlexVoice(data.response, data.audio_url);
    }
  } catch (err) {
    console.error("Voice upload error:", err);
    addLogEntry("system", `Voice upload notice: ${err.message}`);
    setAppState("listening", "ALEX ONLINE // READY");
  }
}

// -------------------------------------------------------------
// Interactive Actions Handlers (Autonomous Phone & Desktop Features)
// -------------------------------------------------------------
let currentTorchStream = null;
let currentTorchTrack = null;

async function toggleFlashlight(state) {
  try {
    if (state) {
      if (!currentTorchTrack) {
        currentTorchStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        currentTorchTrack = currentTorchStream.getVideoTracks()[0];
      }
      const caps = currentTorchTrack.getCapabilities ? currentTorchTrack.getCapabilities() : {};
      if (caps.torch) {
        await currentTorchTrack.applyConstraints({ advanced: [{ torch: true }] });
        addFeedActionCard("Flashlight", null, "Flashlight hardware active.");
      } else {
        triggerScreenTorch(true);
      }
    } else {
      if (currentTorchTrack) {
        try {
          await currentTorchTrack.applyConstraints({ advanced: [{ torch: false }] });
          currentTorchTrack.stop();
        } catch (e) {}
        currentTorchTrack = null;
        currentTorchStream = null;
      }
      triggerScreenTorch(false);
      addFeedActionCard("Flashlight", null, "Flashlight turned off.");
    }
  } catch (e) {
    console.warn("Hardware torch error, using screen brightness overlay:", e);
    triggerScreenTorch(state);
    addFeedActionCard("Flashlight", null, state ? "Screen flashlight activated." : "Flashlight turned off.");
  }
}

function triggerScreenTorch(enable) {
  let overlay = document.getElementById("screenTorchOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "screenTorchOverlay";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:#ffffff; z-index:999999; display:none; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;";
    overlay.innerHTML = `<div style="color:#000; font-family:sans-serif; font-size:1.2rem; font-weight:bold; background:rgba(255,255,255,0.85); padding:12px 24px; border-radius:30px; box-shadow:0 4px 20px rgba(0,0,0,0.3);">💡 FLASHLIGHT ACTIVE (TAP ANYWHERE TO CLOSE)</div>`;
    overlay.addEventListener("click", () => triggerScreenTorch(false));
    document.body.appendChild(overlay);
  }
  overlay.style.display = enable ? "flex" : "none";
}

function playAlarmChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {}
}

function formatTimerSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderTimerCard(seconds, label) {
  const div = document.createElement("div");
  div.className = "log-entry phone-action-card timer-active-card";
  const timerId = "timer_" + Date.now();
  let remaining = seconds || 60;

  div.innerHTML = `
    <div class="action-card-header">
      <span class="action-card-badge">⏱️ ACTIVE TIMER</span>
      <span class="action-card-app">${label || "Timer"}</span>
    </div>
    <div class="action-card-body" style="text-align:center; padding: 14px 8px;">
      <div id="${timerId}_display" style="font-size: 2.2rem; font-weight: 800; font-family: monospace; color: #00f0ff; text-shadow: 0 0 16px rgba(0,240,255,0.6); margin: 6px 0;">
        ${formatTimerSeconds(remaining)}
      </div>
      <div id="${timerId}_sub" style="font-size: 0.8rem; color: #94a3b8; letter-spacing: 1px;">ALEX QUANTUM TIMER // RUNNING</div>
    </div>
  `;
  feedLog.appendChild(div);
  feedLog.scrollTop = feedLog.scrollHeight;

  const timerInterval = setInterval(() => {
    remaining--;
    const disp = document.getElementById(`${timerId}_display`);
    if (disp) disp.innerText = formatTimerSeconds(Math.max(0, remaining));
    if (remaining <= 0) {
      clearInterval(timerInterval);
      if (disp) {
        disp.innerText = "TIME'S UP!";
        disp.style.color = "#ef4444";
        disp.style.textShadow = "0 0 20px rgba(239,68,68,0.8)";
      }
      const sub = document.getElementById(`${timerId}_sub`);
      if (sub) {
        sub.innerText = "ALARM COMPLETED";
        sub.style.color = "#f87171";
      }
      playAlarmChime();
      if (navigator.vibrate) {
        try { navigator.vibrate([300, 150, 300, 150, 500]); } catch (e) {}
      }
    }
  }, 1000);
}

function renderNotesCard(content, title) {
  const div = document.createElement("div");
  div.className = "log-entry phone-action-card";
  div.innerHTML = `
    <div class="action-card-header">
      <span class="action-card-badge">📝 NOTES VAULT</span>
      <span class="action-card-app">${title || "Notes"}</span>
    </div>
    <div class="action-card-body" style="padding: 12px 14px;">
      <div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif;">
        ${content || "No notes available."}
      </div>
    </div>
  `;
  feedLog.appendChild(div);
  feedLog.scrollTop = feedLog.scrollHeight;
}

function handleClientAction(action) {
  if (!action) return;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  if (action.type === "toggle_torch") {
    toggleFlashlight(action.state);
    return;
  }
  if (action.type === "start_timer") {
    renderTimerCard(action.seconds, action.label);
    return;
  }
  if (action.type === "note_card") {
    renderNotesCard(action.content, action.title);
    return;
  }
  if (action.type === "open_camera") {
    addFeedActionCard("Camera", null, "Camera opened. Tap button below to snap photo.");
    setTimeout(() => {
      const camInput = document.getElementById("phoneCameraInput");
      if (camInput) camInput.click();
    }, 250);
    return;
  }

  if (action.type === "open_url" && action.url) {
    addFeedActionCard(action.app || "Action", action.url, action.title);

    // Check for native mobile deep links
    const isDirectProtocol = action.url.startsWith("tel:") ||
                             action.url.startsWith("sms:") ||
                             action.url.startsWith("mailto:") ||
                             action.url.includes("api.whatsapp.com") ||
                             action.url.includes("wa.me") ||
                             action.url.startsWith("whatsapp:");

    if (isDirectProtocol) {
      setTimeout(() => {
        try {
          window.location.href = action.url;
        } catch (e) {
          console.log("Direct protocol launch error:", e);
        }
      }, 300);
    } else if (isMobile || currentTargetDevice === "phone") {
      setTimeout(() => {
        try {
          window.open(action.url, "_blank");
        } catch (e) {
          console.log("Auto-open notice (use action card):", e);
        }
      }, 350);
    }
  }
}

function addFeedActionCard(appName, url, title) {
  const div = document.createElement("div");
  div.className = "log-entry phone-action-card";
  
  let icon = "📱";
  const lowerApp = (appName || "").toLowerCase();
  if (lowerApp.includes("whatsapp")) icon = "💬";
  else if (lowerApp.includes("youtube")) icon = "▶️";
  else if (lowerApp.includes("google")) icon = "🔍";
  else if (lowerApp.includes("music") || lowerApp.includes("spotify")) icon = "🎵";
  else if (lowerApp.includes("chrome") || lowerApp.includes("browser")) icon = "🌐";
  else if (lowerApp.includes("mail") || lowerApp.includes("email")) icon = "✉️";
  else if (lowerApp.includes("message") || lowerApp.includes("sms")) icon = "💬";
  else if (lowerApp.includes("phone") || lowerApp.includes("call")) icon = "📞";
  else if (lowerApp.includes("camera")) icon = "📸";
  else if (lowerApp.includes("maps") || lowerApp.includes("navigate")) icon = "🗺️";
  else if (lowerApp.includes("weather")) icon = "☀️";
  else if (lowerApp.includes("timer")) icon = "⏱️";

  let actionButtonHtml = "";
  if (appName.toLowerCase() === "camera") {
    actionButtonHtml = `<button type="button" class="action-card-launch-btn" onclick="const c = document.getElementById('phoneCameraInput'); if(c) c.click();">📸 OPEN PHONE CAMERA ↗</button>`;
  } else if (url) {
    actionButtonHtml = `<a href="${url}" target="_blank" rel="noopener" class="action-card-launch-btn">🚀 TAP TO OPEN IN ${appName.toUpperCase()} ↗</a>`;
  }

  div.innerHTML = `
    <div class="action-card-header">
      <span class="action-card-badge">${icon} PHONE ACTION</span>
      <span class="action-card-app">${appName}</span>
    </div>
    <div class="action-card-body">
      <div class="action-card-title">${title || appName}</div>
      ${actionButtonHtml}
    </div>
  `;
  feedLog.appendChild(div);
  feedLog.scrollTop = feedLog.scrollHeight;
}

if (mobileMicBtn) {
  mobileMicBtn.addEventListener("click", () => {
    if (isVoiceActive) stopVoiceSession();
    else startVoiceSession();
  });
}

if (inlineMicBtn) {
  inlineMicBtn.addEventListener("click", () => {
    if (isVoiceActive) stopVoiceSession();
    else startVoiceSession();
  });
}

if (listeningStopBtn) listeningStopBtn.addEventListener("click", stopVoiceSession);
if (listeningCancelBtn) listeningCancelBtn.addEventListener("click", cancelVoiceSession);

// Universal Continuous Hands-Free Wake Word Engine ("Alex") for Phone & Desktop
let continuousWakeRec = null;
let wakeRecActive = false;
let lastWakeWordDetectionTime = 0;

function initContinuousWakeWordListener() {
  if (wakeRecActive || !micEnabled || isVoiceActive) return;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return;

  try {
    if (continuousWakeRec) {
      try { continuousWakeRec.abort(); } catch (e) {}
    }
    continuousWakeRec = new SpeechRec();
    continuousWakeRec.continuous = true;
    continuousWakeRec.interimResults = true;
    continuousWakeRec.lang = "en-US";

    continuousWakeRec.onstart = () => {
      wakeRecActive = true;
      setAppState("listening", "ALEX LISTENING // CALL 'ALEX' OR SPEAK");
      console.log("Alex hands-free wake word listener active (mobile + desktop)");
    };

    continuousWakeRec.onresult = (event) => {
      let interim = "";
      let finalCmd = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalCmd += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      const text = (finalCmd || interim).toLowerCase();

      // Wake chime on "alex"
      if (text.includes("alex")) {
        const now = Date.now();
        if (now - lastWakeWordDetectionTime > 3000) {
          lastWakeWordDetectionTime = now;
          playSciFiBeep("wake");
          triggerShockwave(canvas.getBoundingClientRect().width / 2, canvas.getBoundingClientRect().height / 2, "#00f0ff");
        }
      }

      if (interim.trim()) {
        setAppState("recognizing", `HEARING: "${interim.trim().toUpperCase()}"`);
      }
      if (finalCmd.trim()) {
        playSciFiBeep("execute");
        sendCommand(finalCmd.trim());
      }
    };

    continuousWakeRec.onerror = (event) => {
      console.warn("Continuous wake-word notice:", event.error);
      wakeRecActive = false;
    };

    continuousWakeRec.onend = () => {
      wakeRecActive = false;
      if (micEnabled && !isVoiceActive) {
        setTimeout(() => {
          if (micEnabled && !isVoiceActive && !wakeRecActive) {
            try { continuousWakeRec.start(); } catch (e) {}
          }
        }, 500);
      }
    };

    continuousWakeRec.start();
  } catch (e) {
    wakeRecActive = false;
  }
}

// -------------------------------------------------------------
// Server-Sent Events (Live Telemetry & Python Backend Sync)
// -------------------------------------------------------------
function connectEvents() {
  const eventSource = new EventSource("/api/events");

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "status") {
        setAppState(data.state, data.message);
      } else if (data.type === "transcript") {
        addLogEntry(data.role, data.text);
      } else if (data.type === "telemetry") {
        if (data.battery) {
          document.getElementById("batteryVal").innerText = `BAT: ${data.battery}`;
        }
        if (data.cpu !== undefined && data.ram !== undefined) {
          telemetryHistory.cpu.shift();
          telemetryHistory.cpu.push(data.cpu);
          telemetryHistory.ram.shift();
          telemetryHistory.ram.push(data.ram);
          if (activeChart && activeChartType === "system") {
            activeChart.data.datasets[0].data = telemetryHistory.cpu;
            activeChart.data.datasets[1].data = telemetryHistory.ram;
            activeChart.update("none");
          }
        }
      } else if (data.type === "public_link") {
        setPublicLink(data.url, data.local_ip);
      } else if (data.type === "ui_action") {
        if (data.action === "open_charts") {
          openChartsModal();
        } else if (data.action === "open_comms") {
          openCommsModal();
        } else if (data.action === "open_share") {
          openShareModal();
        } else if (data.action === "open_permissions") {
          openPermissionsModal();
        } else if (data.action === "close_modals") {
          closeModals();
        }
      }
    } catch (e) {
      console.error("SSE parse error", e);
    }
  };

  eventSource.onerror = () => {
    eventSource.close();
    setTimeout(connectEvents, 2000);
  };
}

// -------------------------------------------------------------
// Command Execution (With Client-Side Debounce & Single-Voice Routing)
// -------------------------------------------------------------
let lastClientCmd = "";
let lastClientCmdTime = 0;

async function sendCommand(commandText) {
  if (!commandText || !commandText.trim()) return;
  const cmd = commandText.trim();

  // Client-side debounce to prevent duplicate submissions
  const norm = cmd.toLowerCase().replace(/^(?:hey|hi|hello|ok|okay)?\s*alex\b[,:\s]*/i, "").trim() || "alex";
  const now = Date.now();
  if (norm === lastClientCmd && (now - lastClientCmdTime < 2200)) {
    console.log("Suppressed duplicate client trigger:", cmd);
    return;
  }
  lastClientCmd = norm;
  lastClientCmdTime = now;

  addLogEntry("user", cmd);
  setAppState("recognizing", "EXECUTING COMMAND...");

  const lower = cmd.toLowerCase();
  if (lower.includes("permission") || lower.includes("access") || lower.includes("authorize")) {
    openPermissionsModal();
  } else if (lower.includes("phone link") || lower.includes("share link") || lower.includes("qr code") || lower.includes("mobile link") || lower.includes("remote link")) {
    openShareModal();
  } else if (lower.includes("show chart") || lower.includes("open chart")) {
    openChartsModal();
  } else if (lower.includes("close chart")) {
    closeModals();
  } else if (lower.includes("open text") || lower.includes("text others") || lower.includes("messaging")) {
    openCommsModal();
  }

  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  try {
    const res = await fetch("/api/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: cmd,
        target_device: currentTargetDevice,
        is_remote: !isLocal
      }),
    });
    const data = await res.json();
    if (data.response) {
      addLogEntry("alex", data.response);
      playAlexVoice(data.response, data.audio_url);
      if (data.action) handleClientAction(data.action);
    }
  } catch (err) {
    addLogEntry("system", `Execution error: ${err.message}`);
    setAppState("listening");
  }
}

// Form submission
const commandForm = document.getElementById("commandForm");
const commandInput = document.getElementById("commandInput");

commandForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = commandInput.value;
  commandInput.value = "";
  playSciFiBeep("execute");
  sendCommand(val);
});

// Quick Action Chips
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const cmd = chip.getAttribute("data-cmd");
    playSciFiBeep("execute");
    sendCommand(cmd);
  });
});

// Clock Telemetry
function updateClock() {
  const now = new Date();
  document.getElementById("clockVal").innerText = now.toTimeString().split(" ")[0];
}
setInterval(updateClock, 1000);
updateClock();

// Mic Toggle Button
const micBtn = document.getElementById("micToggleBtn");
if (micBtn) {
  micBtn.addEventListener("click", async () => {
    micEnabled = !micEnabled;
    micBtn.style.opacity = micEnabled ? "1" : "0.4";
    playSciFiBeep("activate");

    if (micEnabled) {
      initContinuousWakeWordListener();
    } else {
      if (continuousWakeRec) {
        try { continuousWakeRec.stop(); } catch (e) {}
      }
      if (isVoiceActive) {
        cancelVoiceSession();
      }
    }

    await fetch("/api/toggle_mic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: micEnabled }),
    });
  });
}

// =============================================================
// MODAL MANAGERS: CHARTS, TEXTING, PUBLIC LINK & SYSTEM ACCESS
// =============================================================
const chartsModal = document.getElementById("chartsModal");
const commsModal = document.getElementById("commsModal");
const shareModal = document.getElementById("shareModal");
const permissionsModal = document.getElementById("permissionsModal");

const openChartsBtn = document.getElementById("openChartsBtn");
const openCommsBtn = document.getElementById("openCommsBtn");
const openShareBtn = document.getElementById("openShareBtn");
const openPermissionsBtn = document.getElementById("openPermissionsBtn");

const closeChartsBtn = document.getElementById("closeChartsBtn");
const closeCommsBtn = document.getElementById("closeCommsBtn");
const closeShareBtn = document.getElementById("closeShareBtn");
const closePermissionsBtn = document.getElementById("closePermissionsBtn");

const permBtnText = document.getElementById("permBtnText");
const grantMicBtn = document.getElementById("grantMicBtn");
const grantAudioBtn = document.getElementById("grantAudioBtn");
const grantAccessibilityBtn = document.getElementById("grantAccessibilityBtn");
const grantScreenBtn = document.getElementById("grantScreenBtn");
const grantAllPermsBtn = document.getElementById("grantAllPermsBtn");

const tagMicStatus = document.getElementById("tagMicStatus");
const tagAudioStatus = document.getElementById("tagAudioStatus");
const tagAccessStatus = document.getElementById("tagAccessStatus");
const tagScreenStatus = document.getElementById("tagScreenStatus");

const permCardMic = document.getElementById("permCardMic");
const permCardAudio = document.getElementById("permCardAudio");
const permCardAccessibility = document.getElementById("permCardAccessibility");
const permCardScreen = document.getElementById("permCardScreen");

const shareQrCode = document.getElementById("shareQrCode");
const sharePublicUrl = document.getElementById("sharePublicUrl");
const shareLocalUrl = document.getElementById("shareLocalUrl");
const copyPublicUrlBtn = document.getElementById("copyPublicUrlBtn");
const copyLocalUrlBtn = document.getElementById("copyLocalUrlBtn");
const openPhoneLinkAnchor = document.getElementById("openPhoneLinkAnchor");
const tunnelStatusText = document.getElementById("tunnelStatusText");

function setPublicLink(url, localIp) {
  if (url) {
    if (sharePublicUrl) sharePublicUrl.value = url;
    if (openPhoneLinkAnchor) openPhoneLinkAnchor.href = url;
    if (shareQrCode) {
      shareQrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&bgcolor=070d18&color=00f0ff&margin=1`;
    }
    if (tunnelStatusText) tunnelStatusText.innerText = "SECURE PUBLIC CLOUDFLARE HTTPS TUNNEL ACTIVE";
  }
  if (localIp && shareLocalUrl) {
    shareLocalUrl.value = `http://${localIp}:5005`;
  }
}

function openShareModal() {
  if (shareModal) shareModal.classList.add("active");
  playSciFiBeep("activate");
}

function openChartsModal() {
  if (chartsModal) chartsModal.classList.add("active");
  playSciFiBeep("activate");
  initChart("system");
}

function openCommsModal() {
  if (commsModal) commsModal.classList.add("active");
  playSciFiBeep("activate");
}

function openPermissionsModal() {
  if (permissionsModal) permissionsModal.classList.add("active");
  playSciFiBeep("activate");
}

function closeModals() {
  if (chartsModal) chartsModal.classList.remove("active");
  if (commsModal) commsModal.classList.remove("active");
  if (shareModal) shareModal.classList.remove("active");
  if (permissionsModal) permissionsModal.classList.remove("active");
}

function updatePermissionsButtonState(isGranted) {
  if (!openPermissionsBtn) return;
  if (isGranted) {
    openPermissionsBtn.classList.add("authorized");
    if (permBtnText) permBtnText.innerText = "ACCESS: 100%";
  } else {
    openPermissionsBtn.classList.remove("authorized");
    if (permBtnText) permBtnText.innerText = "VERIFY ACCESS";
  }
}

if (openPermissionsBtn) openPermissionsBtn.addEventListener("click", openPermissionsModal);
if (closePermissionsBtn) closePermissionsBtn.addEventListener("click", closeModals);
if (openShareBtn) openShareBtn.addEventListener("click", openShareModal);
if (closeShareBtn) closeShareBtn.addEventListener("click", closeModals);
if (openChartsBtn) openChartsBtn.addEventListener("click", openChartsModal);
if (openCommsBtn) openCommsBtn.addEventListener("click", openCommsModal);
if (closeChartsBtn) closeChartsBtn.addEventListener("click", closeModals);
if (closeCommsBtn) closeCommsBtn.addEventListener("click", closeModals);

// Individual Permission Actions
if (grantMicBtn) {
  grantMicBtn.addEventListener("click", async () => {
    initWebAudio();
    initBrowserSpeechRecognition();
    playSciFiBeep("activate");
    tagMicStatus.innerText = "ACTIVE ✓";
    tagMicStatus.classList.add("granted");
    grantMicBtn.innerText = "ACTIVE ✓";
    grantMicBtn.classList.add("granted");
    permCardMic.classList.add("granted");
  });
}

if (grantAudioBtn) {
  grantAudioBtn.addEventListener("click", () => {
    initWebAudio();
    playSciFiBeep("wake");
    tagAudioStatus.innerText = "ACTIVE ✓";
    tagAudioStatus.classList.add("granted");
    grantAudioBtn.innerText = "ACTIVE ✓";
    grantAudioBtn.classList.add("granted");
    permCardAudio.classList.add("granted");
  });
}

if (grantAccessibilityBtn) {
  grantAccessibilityBtn.addEventListener("click", async () => {
    playSciFiBeep("execute");
    try {
      await fetch("/api/request_permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "accessibility" }),
      });
      tagAccessStatus.innerText = "SETTINGS OPENED";
      grantAccessibilityBtn.innerText = "SETTINGS OPENED ↗";
    } catch (e) {}
  });
}

if (grantScreenBtn) {
  grantScreenBtn.addEventListener("click", async () => {
    playSciFiBeep("execute");
    try {
      await fetch("/api/request_permission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "screencapture" }),
      });
      tagScreenStatus.innerText = "SETTINGS OPENED";
      grantScreenBtn.innerText = "SETTINGS OPENED ↗";
    } catch (e) {}
  });
}

// Master Authorization Handler
if (grantAllPermsBtn) {
  grantAllPermsBtn.addEventListener("click", async () => {
    unlockAudio();
    playSciFiBeep("wake");
    triggerShockwave(canvas.getBoundingClientRect().width / 2, canvas.getBoundingClientRect().height / 2, "#10b981");

    // 1. Audio FX
    if (tagAudioStatus) { tagAudioStatus.innerText = "ACTIVE ✓"; tagAudioStatus.classList.add("granted"); }
    if (grantAudioBtn) { grantAudioBtn.innerText = "ACTIVE ✓"; grantAudioBtn.classList.add("granted"); }
    if (permCardAudio) permCardAudio.classList.add("granted");

    // 2. Microphone
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        if (tagMicStatus) { tagMicStatus.innerText = "ACTIVE ✓"; tagMicStatus.classList.add("granted"); }
        if (grantMicBtn) { grantMicBtn.innerText = "ACTIVE ✓"; grantMicBtn.classList.add("granted"); }
        if (permCardMic) permCardMic.classList.add("granted");
      }
    } catch (err) {
      console.warn("Mic permission:", err);
    }

    // 3. Screen & Automation
    if (tagScreenStatus) { tagScreenStatus.innerText = "READY ✓"; tagScreenStatus.classList.add("granted"); }
    if (permCardScreen) permCardScreen.classList.add("granted");

    // 4. Accessibility
    try {
      const res = await fetch("/api/permissions");
      const d = await res.json();
      if (d.accessibility) {
        if (tagAccessStatus) { tagAccessStatus.innerText = "GRANTED ✓"; tagAccessStatus.classList.add("granted"); }
        if (permCardAccessibility) permCardAccessibility.classList.add("granted");
      }
    } catch (e) {}

    localStorage.setItem("alex_system_authorized", "true");
    updatePermissionsButtonState(true);

    grantAllPermsBtn.innerHTML = "<span>✓ ALL SYSTEMS AUTHORIZED & ONLINE</span>";
    grantAllPermsBtn.style.background = "#10b981";

    addLogEntry("system", "🛡️ All system access granted. Alex Neural Core fully authorized.");
    initContinuousWakeWordListener();
    playAlexVoice("All systems authorized and online. Ready for your instructions.");

    setTimeout(() => {
      closeModals();
    }, 1400);
  });
}

// Copy link actions
if (copyPublicUrlBtn && sharePublicUrl) {
  copyPublicUrlBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(sharePublicUrl.value).then(() => {
      const orig = copyPublicUrlBtn.innerText;
      copyPublicUrlBtn.innerText = "COPIED! ✓";
      copyPublicUrlBtn.style.background = "#10b981";
      setTimeout(() => {
        copyPublicUrlBtn.innerText = orig;
        copyPublicUrlBtn.style.background = "";
      }, 2000);
    }).catch(() => {
      sharePublicUrl.select();
      document.execCommand("copy");
    });
  });
}

if (copyLocalUrlBtn && shareLocalUrl) {
  copyLocalUrlBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(shareLocalUrl.value).then(() => {
      const orig = copyLocalUrlBtn.innerText;
      copyLocalUrlBtn.innerText = "COPIED! ✓";
      setTimeout(() => {
        copyLocalUrlBtn.innerText = orig;
      }, 2000);
    });
  });
}

[chartsModal, commsModal, shareModal, permissionsModal].forEach((m) => {
  if (m) {
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModals();
    });
  }
});

// -------------------------------------------------------------
// Dynamic Holographic Chart.js Engine
// -------------------------------------------------------------
let activeChart = null;
let activeChartType = "system";

function initChart(type) {
  const chartCanvas = document.getElementById("analyticsChart");
  if (!chartCanvas) return;

  activeChartType = type;
  if (activeChart) {
    activeChart.destroy();
  }

  let chartData, chartOptions;

  if (type === "system") {
    chartData = {
      labels: telemetryHistory.labels,
      datasets: [
        {
          label: "Live Mac CPU Usage (%)",
          data: [...telemetryHistory.cpu],
          borderColor: "#00f0ff",
          backgroundColor: "rgba(0, 240, 255, 0.18)",
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
        },
        {
          label: "Live Mac RAM Used (%)",
          data: [...telemetryHistory.ram],
          borderColor: "#a855f7",
          backgroundColor: "rgba(168, 85, 247, 0.12)",
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  } else if (type === "market") {
    chartData = {
      labels: ["09:00", "12:00", "15:00", "18:00", "21:00", "CURRENT"],
      datasets: [
        {
          label: "Quantum Tech Index",
          data: [1420, 1465, 1440, 1510, 1580, 1620],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: "BTC / USD ($K)",
          data: [67.2, 67.8, 68.4, 67.9, 69.1, 70.4],
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  } else {
    chartData = {
      labels: ["Apps", "Web", "System", "Media", "Files", "Terminal"],
      datasets: [
        {
          label: "Tasks Handled Today",
          data: [14, 22, 9, 18, 7, 12],
          backgroundColor: [
            "rgba(0, 240, 255, 0.75)",
            "rgba(168, 85, 247, 0.75)",
            "rgba(16, 185, 129, 0.75)",
            "rgba(245, 158, 11, 0.75)",
            "rgba(236, 72, 153, 0.75)",
            "rgba(59, 130, 246, 0.75)",
          ],
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      ],
    };
  }

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: {
        labels: {
          color: "#94a3b8",
          font: { family: "JetBrains Mono", size: 11 },
        },
      },
    },
    scales: {
      x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(255, 255, 255, 0.05)" } },
      y: { 
        ticks: { color: "#94a3b8" }, 
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        min: type === "system" ? 0 : undefined,
        max: type === "system" ? 100 : undefined
      },
    },
  };

  activeChart = new Chart(chartCanvas, {
    type: type === "activity" ? "bar" : "line",
    data: chartData,
    options: chartOptions,
  });
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const chartType = btn.getAttribute("data-chart");
    initChart(chartType);
  });
});

// -------------------------------------------------------------
// Texting & Comms Form Handler
// -------------------------------------------------------------
const commsForm = document.getElementById("commsForm");
const commRecipient = document.getElementById("commRecipient");
const commMessage = document.getElementById("commMessage");

commsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const platform = document.querySelector('input[name="platform"]:checked').value;
  const recipient = commRecipient.value.trim();
  const message = commMessage.value.trim();

  if (!recipient || !message) return;

  closeModals();
  playSciFiBeep("execute");
  addLogEntry("exec", `Transmitting to ${recipient} via ${platform.toUpperCase()}...`);

  try {
    const res = await fetch("/api/send_message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, recipient, message }),
    });
    const data = await res.json();
    addLogEntry("alex", data.response);
    speakInBrowser(data.response);
  } catch (err) {
    addLogEntry("system", `Comms error: ${err.message}`);
  }

  commMessage.value = "";
});

// -------------------------------------------------------------
// Keyboard Shortcut Trigger: Space / Cmd+K
// -------------------------------------------------------------
window.addEventListener("keydown", (e) => {
  if (e.metaKey && e.key === "k") {
    e.preventDefault();
    commandInput.focus();
  }
});

// -------------------------------------------------------------
// Start Everything & Initialize Mic
// -------------------------------------------------------------
resizeCanvas();
requestAnimationFrame(animate);
connectEvents();

// Global gesture audio unlock & continuous wake-word listener initialization
function activateAlexListening() {
  unlockAudio();
  initContinuousWakeWordListener();
}

window.addEventListener("touchstart", activateAlexListening, { passive: true });
window.addEventListener("click", activateAlexListening);

// Fetch Initial Public Link & Local IP
fetch("/api/public_link")
  .then((res) => res.json())
  .then((data) => {
    if (data && (data.url || data.local_ip)) {
      setPublicLink(data.url, data.local_ip);
    }
  })
  .catch((err) => console.log("Public link init:", err));

// Check and prompt system permissions for every user
function checkAndPromptSystemPermissions() {
  const hasAuthorized = localStorage.getItem("alex_system_authorized");

  // Fetch real backend permissions status
  fetch("/api/permissions")
    .then((res) => res.json())
    .then((data) => {
      if (data && data.accessibility) {
        if (tagAccessStatus) { tagAccessStatus.innerText = "GRANTED ✓"; tagAccessStatus.classList.add("granted"); }
        if (grantAccessibilityBtn) { grantAccessibilityBtn.innerText = "VERIFIED ✓"; grantAccessibilityBtn.classList.add("granted"); }
        if (permCardAccessibility) permCardAccessibility.classList.add("granted");
      }
    })
    .catch((err) => console.log("Permissions API check:", err));

  if (hasAuthorized === "true") {
    updatePermissionsButtonState(true);
    if (tagMicStatus) { tagMicStatus.innerText = "ACTIVE ✓"; tagMicStatus.classList.add("granted"); }
    if (tagAudioStatus) { tagAudioStatus.innerText = "ACTIVE ✓"; tagAudioStatus.classList.add("granted"); }
    if (tagScreenStatus) { tagScreenStatus.innerText = "READY ✓"; tagScreenStatus.classList.add("granted"); }
  } else {
    // First time user: Prompt permissions immediately!
    setTimeout(() => {
      openPermissionsModal();
    }, 700);
  }
}
checkAndPromptSystemPermissions();
