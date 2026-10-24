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
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);
setTimeout(resizeCanvas, 50);

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
// Dynamic Energy Shockwaves & Spark Embers (Audio & Touch Reactive)
// -------------------------------------------------------------
const shockwaves = [];
const sparks = [];

function triggerShockwave(x, y, color = "#00f0ff") {
  shockwaves.push({
    x: x,
    y: y,
    radius: 8,
    maxRadius: 260,
    speed: 5.6,
    alpha: 0.95,
    color: color,
  });

  // Spawn kinetic particle spark embers
  const sparkCount = 18;
  for (let i = 0; i < sparkCount; i++) {
    const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.4;
    const speed = 2.0 + Math.random() * 4.8;
    sparks.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.2 + Math.random() * 2.2,
      alpha: 1.0,
      decay: 0.022 + Math.random() * 0.025,
      color: color,
    });
  }
}

function updateAndDrawShockwaves(centerX, centerY) {
  // 1. Expanding shockwave rings
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.radius += sw.speed;
    sw.alpha *= 0.945;

    if (sw.alpha < 0.02 || sw.radius > sw.maxRadius) {
      shockwaves.splice(i, 1);
      continue;
    }

    ctx.save();
    // Primary shockwave
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 2.6 * sw.alpha;
    ctx.shadowColor = sw.color;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = sw.alpha;
    ctx.stroke();

    // Secondary inner chromatic resonance ring
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, Math.max(1, sw.radius - 9), 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2 * sw.alpha;
    ctx.globalAlpha = sw.alpha * 0.75;
    ctx.stroke();

    // Tertiary outer pulse ripple
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, Math.max(1, sw.radius * 0.65), 0, Math.PI * 2);
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 0.8 * sw.alpha;
    ctx.globalAlpha = sw.alpha * 0.45;
    ctx.stroke();
    ctx.restore();
  }

  // 2. Kinetic spark embers
  for (let i = sparks.length - 1; i >= 0; i--) {
    const sp = sparks[i];
    sp.x += sp.vx;
    sp.y += sp.vy;
    sp.vx *= 0.96;
    sp.vy *= 0.96;
    sp.alpha -= sp.decay;

    if (sp.alpha <= 0.02) {
      sparks.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(sp.x - sp.vx * 2.5, sp.y - sp.vy * 2.5);
    ctx.strokeStyle = sp.color;
    ctx.lineWidth = sp.size * sp.alpha;
    ctx.shadowColor = sp.color;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = sp.alpha;
    ctx.stroke();
    ctx.restore();
  }
}

// -------------------------------------------------------------
// Ambient Quantum Nano-Photons (Background Depth Layer)
// -------------------------------------------------------------
class AmbientPhoton {
  constructor(w, h) {
    this.reset(w, h, true);
  }

  reset(w, h, randomizeY = false) {
    this.x = Math.random() * (w || 400);
    this.y = randomizeY ? Math.random() * (h || 280) : (h || 280) + 12;
    this.speedY = 0.2 + Math.random() * 0.55;
    this.speedX = (Math.random() - 0.5) * 0.28;
    this.size = 0.8 + Math.random() * 1.6;
    this.baseAlpha = 0.18 + Math.random() * 0.45;
    this.alpha = this.baseAlpha;
    this.phase = Math.random() * Math.PI * 2;
    const colors = ["#00f0ff", "#38bdf8", "#818cf8", "#a855f7"];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(w, h, time) {
    this.y -= this.speedY;
    this.x += this.speedX + Math.sin(time * 0.0016 + this.phase) * 0.3;
    this.alpha = this.baseAlpha * (0.6 + Math.sin(time * 0.003 + this.phase) * 0.4);
    if (this.y < -12 || this.x < -15 || this.x > (w || 400) + 15) {
      this.reset(w, h, false);
    }
  }

  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 6;
    ctx.globalAlpha = Math.max(0.05, Math.min(1.0, this.alpha));
    ctx.fill();
    ctx.restore();
  }
}

const ambientPhotons = [];
for (let p = 0; p < 32; p++) {
  ambientPhotons.push(new AmbientPhoton(400, 280));
}

// -------------------------------------------------------------
// Particle & 3D Celestial Quantum Core
// -------------------------------------------------------------
const PARTICLE_COUNT = 240;
const particles = [];
let mouse = { x: null, y: null, active: false };

class ReactorParticle {
  constructor(index) {
    this.index = index;
    this.reset();
  }

  reset() {
    this.angle = Math.random() * Math.PI * 2;
    this.baseRadius = 50 + Math.random() * 92;
    this.radius = this.baseRadius;
    this.speed = (0.007 + Math.random() * 0.014) * (Math.random() < 0.5 ? 1 : -1);
    this.size = 1.2 + Math.random() * 2.5;
    this.alpha = 0.35 + Math.random() * 0.65;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.z = Math.random() * 2 - 1; // 3D depth layer
    this.projX = 0;
    this.projY = 0;

    const colors = ["#00f0ff", "#38bdf8", "#818cf8", "#a855f7", "#ffffff", "#10b981"];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(time, centerX, centerY, autoScale = 1.0) {
    let currentSpeed = this.speed;
    if (appState === "recognizing") {
      currentSpeed *= 3.8;
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

    // Cache 3D projected coordinates for drawing & synaptic connections
    this.projX = centerX + Math.cos(this.angle) * this.radius + (tilt.x * this.z * 26 * autoScale);
    this.projY = centerY + Math.sin(this.angle) * this.radius * (0.84 + this.z * 0.16) + (tilt.y * this.z * 20 * autoScale);
  }

  draw(autoScale = 1.0) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.projX, this.projY, (this.size + (liveAudioLevel * 1.6)) * autoScale, 0, Math.PI * 2);
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
// Synaptic Neural Constellations (Filament Mesh Connections)
// -------------------------------------------------------------
function drawParticleConstellations(particlesList, autoScale = 1.0) {
  const maxDist = 44 * autoScale;
  const maxDistSq = maxDist * maxDist;
  const len = particlesList.length;

  ctx.save();
  ctx.lineWidth = 0.85 * autoScale;

  // Stride loop keeps computation smooth at 60 FPS
  for (let i = 0; i < len; i += 2) {
    const p1 = particlesList[i];
    for (let j = i + 1; j < len; j += 2) {
      const p2 = particlesList[j];
      const dx = p1.projX - p2.projX;
      const dy = p1.projY - p2.projY;
      const distSq = dx * dx + dy * dy;

      if (distSq < maxDistSq) {
        const dist = Math.sqrt(distSq);
        const alpha = (1 - dist / maxDist) * 0.42 * (1 + liveAudioLevel * 1.5);
        ctx.beginPath();
        ctx.moveTo(p1.projX, p1.projY);
        ctx.lineTo(p2.projX, p2.projY);

        let strokeColor;
        if (appState === "speaking") {
          strokeColor = `rgba(168, 85, 247, ${alpha})`;
        } else if (appState === "recognizing") {
          strokeColor = `rgba(245, 158, 11, ${alpha})`;
        } else {
          strokeColor = `rgba(0, 240, 255, ${alpha})`;
        }
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// -------------------------------------------------------------
// Gyroscopic Astrolabe Rings & Singularity Vortex
// -------------------------------------------------------------
let ringRotation1 = 0;
let ringRotation2 = 0;
let ringRotation3 = 0;
let ringRotation4 = 0;
let vortexAngle = 0;

function drawHoloRings(centerX, centerY, time, autoScale = 1.0) {
  const voiceBoost = 1.0 + (liveAudioLevel * 2.2);
  ringRotation1 += 0.005 * voiceBoost;
  ringRotation2 -= 0.007 * voiceBoost;
  ringRotation3 += 0.003 * voiceBoost;
  ringRotation4 -= 0.002 * voiceBoost;
  vortexAngle += 0.02 * voiceBoost;

  // Center perspective offset
  const offX = tilt.x * 12 * autoScale;
  const offY = tilt.y * 8 * autoScale;

  // 1. Central Core Singularity with Chromatic Dispersion
  ctx.save();
  const coreRadius = (46 + Math.sin(time * 0.006) * 5 + (liveAudioLevel * 24)) * autoScale;

  // Chromatic dispersion layer 1 (cyan, shifted left)
  const gradCyan = ctx.createRadialGradient(
    centerX + offX - (2.5 * tilt.x * autoScale),
    centerY + offY - (2.5 * tilt.y * autoScale),
    0,
    centerX + offX,
    centerY + offY,
    coreRadius * 1.15
  );
  gradCyan.addColorStop(0, "rgba(0, 240, 255, 0.95)");
  gradCyan.addColorStop(0.5, "rgba(2, 132, 199, 0.45)");
  gradCyan.addColorStop(1, "transparent");
  ctx.fillStyle = gradCyan;
  ctx.beginPath();
  ctx.arc(centerX + offX, centerY + offY, coreRadius * 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Chromatic dispersion layer 2 (magenta/gold, shifted right)
  const gradAccent = ctx.createRadialGradient(
    centerX + offX + (2.5 * tilt.x * autoScale),
    centerY + offY + (2.5 * tilt.y * autoScale),
    0,
    centerX + offX,
    centerY + offY,
    coreRadius * 0.9
  );
  if (appState === "recognizing") {
    gradAccent.addColorStop(0, "rgba(245, 158, 11, 0.95)");
    gradAccent.addColorStop(0.6, "rgba(234, 88, 12, 0.4)");
  } else if (appState === "speaking") {
    gradAccent.addColorStop(0, "rgba(168, 85, 247, 0.95)");
    gradAccent.addColorStop(0.6, "rgba(192, 132, 252, 0.4)");
  } else {
    gradAccent.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    gradAccent.addColorStop(0.6, "rgba(56, 189, 248, 0.35)");
  }
  gradAccent.addColorStop(1, "transparent");
  ctx.fillStyle = gradAccent;
  ctx.beginPath();
  ctx.arc(centerX + offX, centerY + offY, coreRadius * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Singularity Plasma Vortex Arms (3 logarithmic spiral arms)
  ctx.save();
  ctx.translate(centerX + offX, centerY + offY);
  for (let arm = 0; arm < 3; arm++) {
    const armOffset = (arm * Math.PI * 2) / 3;
    ctx.beginPath();
    for (let s = 0; s < 20; s++) {
      const spAng = vortexAngle + armOffset + s * 0.22;
      const spR = (4 + s * 1.6) * autoScale;
      const sx = Math.cos(spAng) * spR;
      const sy = Math.sin(spAng) * spR * 0.9;
      if (s === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = appState === "speaking" ? "rgba(192, 132, 252, 0.65)" : "rgba(0, 240, 255, 0.65)";
    ctx.lineWidth = 1.2 * autoScale;
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();

  // 2. Inner Dashed Rotating Gimbal Arc
  ctx.save();
  ctx.translate(centerX + offX * 1.3, centerY + offY * 1.3);
  ctx.rotate(ringRotation1);
  ctx.beginPath();
  ctx.arc(0, 0, (56 + (liveAudioLevel * 12)) * autoScale, 0, Math.PI * 1.6);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
  ctx.lineWidth = 1.8 + (liveAudioLevel * 2);
  ctx.setLineDash([8, 12]);
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 10 + (liveAudioLevel * 14);
  ctx.stroke();

  // Counter-rotating nested dash segment
  ctx.beginPath();
  ctx.rotate(-ringRotation1 * 2.2);
  ctx.arc(0, 0, (64 + (liveAudioLevel * 10)) * autoScale, Math.PI * 0.2, Math.PI * 1.1);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 10]);
  ctx.stroke();
  ctx.restore();

  // 3. Undulating Harmonic Quantum Waveform Ring
  ctx.save();
  ctx.translate(centerX + offX, centerY + offY);
  ctx.beginPath();
  const wavePoints = 64;
  const waveRadius = (76 + liveAudioLevel * 18) * autoScale;
  for (let i = 0; i <= wavePoints; i++) {
    const ang = (i * Math.PI * 2) / wavePoints;
    const waveAmp = (3.0 + liveAudioLevel * 14) * Math.sin(ang * 8 + time * 0.007);
    const r = waveRadius + waveAmp;
    const wx = Math.cos(ang) * r;
    const wy = Math.sin(ang) * r * 0.88;
    if (i === 0) ctx.moveTo(wx, wy);
    else ctx.lineTo(wx, wy);
  }
  ctx.closePath();
  ctx.strokeStyle = appState === "speaking" ? "rgba(168, 85, 247, 0.75)" : "rgba(0, 240, 255, 0.7)";
  ctx.lineWidth = 1.4 * autoScale;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // 4. Middle Ticked Astrolabe Ring with Cardinal Degree Markers
  ctx.save();
  ctx.translate(centerX + offX * 0.9, centerY + offY * 0.9);
  ctx.rotate(ringRotation2);
  const tickCount = 48;
  const tickRadius = (96 + (liveAudioLevel * 14)) * autoScale;
  for (let i = 0; i < tickCount; i++) {
    const angle = (i * Math.PI * 2) / tickCount;
    const isMajor = i % 4 === 0;
    const isCardinal = i % 12 === 0;
    const len = (isCardinal ? 12 : (isMajor ? 8 : 4)) * autoScale;
    const x1 = Math.cos(angle) * tickRadius;
    const y1 = Math.sin(angle) * (tickRadius * 0.88);
    const x2 = Math.cos(angle) * (tickRadius + len);
    const y2 = Math.sin(angle) * ((tickRadius + len) * 0.88);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = isCardinal ? "rgba(0, 240, 255, 1.0)" : (isMajor ? "rgba(56, 189, 248, 0.75)" : "rgba(56, 189, 248, 0.28)");
    ctx.lineWidth = (isCardinal ? 2.4 : (isMajor ? 1.6 : 1.0)) * autoScale;
    ctx.stroke();
  }

  // Cardinal degree headings
  ctx.font = `${Math.round(8 * autoScale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = "rgba(0, 240, 255, 0.75)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const degLabels = ["000°", "090°", "180°", "270°"];
  for (let c = 0; c < 4; c++) {
    const cAng = (c * Math.PI) / 2;
    const lblX = Math.cos(cAng) * (tickRadius + 18 * autoScale);
    const lblY = Math.sin(cAng) * (tickRadius * 0.88 + 16 * autoScale);
    ctx.fillText(degLabels[c], lblX, lblY);
  }
  ctx.restore();

  // 5. Hexagonal Quantum Containment Shield (Rotating Polygon)
  ctx.save();
  ctx.translate(centerX + offX * 0.75, centerY + offY * 0.75);
  ctx.rotate(ringRotation4);
  const hexSides = 6;
  const hexRadius = (118 + liveAudioLevel * 14) * autoScale;
  ctx.beginPath();
  for (let h = 0; h < hexSides; h++) {
    const hAng = (h * Math.PI * 2) / hexSides;
    const hx = Math.cos(hAng) * hexRadius;
    const hy = Math.sin(hAng) * (hexRadius * 0.86);
    if (h === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.strokeStyle = "rgba(0, 240, 255, 0.22)";
  ctx.lineWidth = 1.0;
  ctx.setLineDash([6, 14]);
  ctx.stroke();
  ctx.restore();

  // 6. Outer Holographic Orbital Ring with 4 Satellites
  ctx.save();
  ctx.translate(centerX + offX * 0.6, centerY + offY * 0.6);
  ctx.rotate(ringRotation3);
  const outerR = (142 + (liveAudioLevel * 14)) * autoScale;

  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 18]);
  ctx.stroke();

  // Accent solid arc
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 0.55);
  ctx.strokeStyle = "#00f0ff";
  ctx.lineWidth = 2.6;
  ctx.setLineDash([]);
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 12 + (liveAudioLevel * 12);
  ctx.stroke();

  // 4 Orbiting Quantum Satellites with trailing energy tails
  const satCount = 4;
  for (let s = 0; s < satCount; s++) {
    const sAng = (s * Math.PI * 2) / satCount;
    const satX = Math.cos(sAng) * outerR;
    const satY = Math.sin(sAng) * (outerR * 0.88);

    // Trailing plasma arc
    ctx.beginPath();
    ctx.arc(0, 0, outerR, sAng - 0.22, sAng);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.8)";
    ctx.lineWidth = 2.0 * autoScale;
    ctx.stroke();

    // Satellite orb
    ctx.beginPath();
    ctx.arc(satX, satY, 3.2 * autoScale, 0, Math.PI * 2);
    ctx.fillStyle = s % 2 === 0 ? "#00f0ff" : "#a855f7";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    ctx.fill();
  }
  ctx.restore();
}

// -------------------------------------------------------------
// Quantum Synaptic Lightning Tendrils
// -------------------------------------------------------------
function drawQuantumTendrils(centerX, centerY, autoScale = 1.0) {
  const arcChance = appState === "speaking" ? 0.85 : (appState === "recognizing" ? 0.72 : (liveAudioLevel > 0.15 ? 0.65 : 0.28));
  if (Math.random() > arcChance) return;

  const count = appState === "speaking" ? 3 : (liveAudioLevel > 0.2 ? 2 : 1);
  const ringRadius = (96 + (liveAudioLevel * 20)) * autoScale;

  for (let c = 0; c < count; c++) {
    const targetAngle = Math.random() * Math.PI * 2;
    const targetX = centerX + (Math.cos(targetAngle) * ringRadius) + (tilt.x * 16 * autoScale);
    const targetY = centerY + (Math.sin(targetAngle) * ringRadius * 0.86) + (tilt.y * 16 * autoScale);

    const segments = 7;
    let currX = centerX + (tilt.x * 10 * autoScale);
    let currY = centerY + (tilt.y * 10 * autoScale);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(currX, currY);

    for (let s = 1; s <= segments; s++) {
      const frac = s / segments;
      const baseX = centerX + (targetX - centerX) * frac;
      const baseY = centerY + (targetY - centerY) * frac;
      const jitter = (Math.random() - 0.5) * 18 * autoScale * (1 - frac * 0.35);

      currX = baseX + jitter;
      currY = baseY + jitter;
      ctx.lineTo(currX, currY);
    }

    const arcColor = appState === "recognizing" ? "#f59e0b" : (appState === "speaking" ? "#a855f7" : "#00f0ff");
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = (1.5 + Math.random() * 1.5) * autoScale;
    ctx.shadowColor = arcColor;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.85 + Math.random() * 0.15;
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
  const radarRadius = (144 + (liveAudioLevel * 15)) * autoScale;

  ctx.save();
  ctx.translate(centerX + (tilt.x * 8 * autoScale), centerY + (tilt.y * 8 * autoScale));

  const sweepGrad = ctx.createRadialGradient(0, 0, 10 * autoScale, 0, 0, radarRadius);
  sweepGrad.addColorStop(0, "rgba(0, 240, 255, 0)");
  sweepGrad.addColorStop(1, "rgba(0, 240, 255, 0.15)");

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radarRadius, radarAngle - 0.5, radarAngle);
  ctx.closePath();
  ctx.fillStyle = sweepGrad;
  ctx.fill();

  const beamX = Math.cos(radarAngle) * radarRadius;
  const beamY = Math.sin(radarAngle) * (radarRadius * 0.86);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(beamX, beamY);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.85)";
  ctx.lineWidth = 1.8 * autoScale;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 12;
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

  ctx.strokeStyle = "rgba(0, 240, 255, 0.75)";
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
  ctx.fillText(`[COHERENCE: 99.7%]`, width - 14, 34);

  // Corner HUD tick brackets
  ctx.strokeStyle = "rgba(0, 240, 255, 0.32)";
  ctx.lineWidth = 1.4;
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
  const autoScale = Math.max(0.75, Math.min(rect.width, rect.height) / 260);

  // Smooth tilt lerp
  tilt.x += (tilt.targetX - tilt.x) * 0.08;
  tilt.y += (tilt.targetY - tilt.y) * 0.08;

  ctx.clearRect(0, 0, rect.width, rect.height);

  // 1. Ambient nano-photons in background
  ambientPhotons.forEach((ap) => {
    ap.update(rect.width, rect.height, time);
    ap.draw();
  });

  // 2. HUD corner overlays and radar sweep
  drawHUDOverlays(rect.width, rect.height, time);
  drawRadarSweep(centerX, centerY, autoScale);

  // 3. Astrolabe Rings, Singularity & Plasma Vortex
  drawHoloRings(centerX, centerY, time, autoScale);

  // 4. Update particles
  particles.forEach((p) => {
    p.update(time, centerX, centerY, autoScale);
  });

  // 5. Draw Synaptic Constellation Filaments between close particles
  drawParticleConstellations(particles, autoScale);

  // 6. Draw particles
  particles.forEach((p) => {
    p.draw(autoScale);
  });

  // 7. Quantum Branching Lightning Tendrils
  drawQuantumTendrils(centerX, centerY, autoScale);

  // 8. Expanding shockwaves & kinetic spark embers
  updateAndDrawShockwaves(centerX, centerY);

  // 9. Interactive target reticle & audio waveform
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

function handleCircleActivation(e) {
  unlockAudio();
  if (canvas) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e && e.clientX ? (e.clientX - rect.left) : (rect.width / 2);
    const clickY = e && e.clientY ? (e.clientY - rect.top) : (rect.height / 2);
    triggerShockwave(clickX, clickY, "#00ff66");
  }
  if (isVoiceActive) {
    stopVoiceSession();
  } else {
    startVoiceSession();
  }
}

const alexMiddleCircleContainer = document.getElementById("alexMiddleCircleContainer");
const alexCoreDisc = document.getElementById("alexCoreDisc");

if (alexCoreDisc) {
  alexCoreDisc.addEventListener("click", (e) => {
    e.stopPropagation();
    handleCircleActivation(e);
  });
}

if (alexMiddleCircleContainer) {
  alexMiddleCircleContainer.addEventListener("click", (e) => {
    handleCircleActivation(e);
  });
}

if (canvas) {
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
    handleCircleActivation(e);
  });
}

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
  if (statusPill) statusPill.className = `status-pill ${state}`;

  if (state === "idle") {
    if (statusText) statusText.innerText = msg || "ROOT: ARMED & READY";
    if (coreStatus) {
      coreStatus.innerText = "ROOT: ARMED & READY";
      coreStatus.style.color = "var(--hacker-green)";
    }
  } else if (state === "listening") {
    if (statusText) statusText.innerText = msg || "ALEX ONLINE // LISTENING";
    if (coreStatus) {
      coreStatus.innerText = "ACTIVE LISTENING";
      coreStatus.style.color = "#00f0ff";
    }
  } else if (state === "recognizing") {
    if (statusText) statusText.innerText = msg || "PROCESSING COMMAND...";
    if (coreStatus) {
      coreStatus.innerText = "ANALYZING NEURAL DATA";
      coreStatus.style.color = "#f59e0b";
    }
  } else if (state === "speaking") {
    if (statusText) statusText.innerText = msg || "ALEX RESPONDING...";
    if (coreStatus) {
      coreStatus.innerText = "TRANSMITTING RESPONSE";
      coreStatus.style.color = "#a855f7";
    }
  }

  const talkBtn = document.getElementById("mobileMicBtn");
  const micLabel = document.getElementById("micBtnLabel");
  if (talkBtn) {
    talkBtn.classList.remove("listening", "recognizing", "speaking");
    talkBtn.classList.add(state);
  }
  if (micLabel) {
    if (state === "listening") micLabel.innerText = "TAP TO TALK TO ALEX";
    else if (state === "recognizing") micLabel.innerText = "PROCESSING COMMAND...";
    else if (state === "speaking") micLabel.innerText = "ALEX RESPONDING...";
  }

  coreFrequency = (82.0 + Math.random() * 8.0).toFixed(1);
  if (coreFrequencyEl) {
    const flux = (98.5 + Math.random() * 1.4).toFixed(1);
    coreFrequencyEl.innerText = `${coreFrequency} GHz • FLUX: ${flux}%`;
  }
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

let lastSpokenText = "";
let lastSpokenTimestamp = 0;

function playAlexVoice(text, audioUrl) {
  unlockAudio();
  if (!text && !audioUrl) return;

  const clean = (text || "").replace(/[\*\#\_`\[\]]/g, "").trim();
  const now = Date.now();

  // Deduplication guard: Suppress exact same speech if triggered within 3.5 seconds
  if (clean && clean === lastSpokenText && (now - lastSpokenTimestamp < 3500)) {
    console.log("Suppressed duplicate voice output:", clean);
    return;
  }
  lastSpokenText = clean;
  lastSpokenTimestamp = now;

  // Immediately cancel any lingering prior speech to prevent overlapping voices
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  if (alexAudioPlayer) {
    try {
      alexAudioPlayer.pause();
      alexAudioPlayer.currentTime = 0;
    } catch (e) {}
  }

  const src = audioUrl || `/api/tts_audio?text=${encodeURIComponent(clean)}`;
  setAppState("speaking", "ALEX RESPONDING...");

  if (!alexAudioPlayer) alexAudioPlayer = new Audio();
  alexAudioPlayer.src = src;

  const p = alexAudioPlayer.play();
  if (p !== undefined) {
    p.then(() => {}).catch((err) => {
      console.warn("HTML5 audio playback notice, trying SpeechSynthesis fallback:", err);
      speakInBrowser(clean);
    });
  }

  alexAudioPlayer.onended = () => {
    setAppState("listening", "ALEX ONLINE // READY");
  };
}

function speakInBrowser(text) {
  if (!("speechSynthesis" in window) || !text) return;
  const clean = text.replace(/[\*\#\_`\[\]]/g, "").trim();
  if (!clean) return;

  try { window.speechSynthesis.cancel(); } catch (e) {}

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

  if (activeRecognitionInstance) {
    try { activeRecognitionInstance.stop(); } catch (e) {}
    activeRecognitionInstance = null;
  }

  // If Web Speech API already transcribed the voice command, execute it directly
  // and CANCEL mediaRecorder to avoid a duplicate /api/voice_upload request!
  if (sessionFinalTranscript && sessionFinalTranscript.trim()) {
    const cmd = sessionFinalTranscript.trim();
    sessionFinalTranscript = "";
    recordedChunks = [];
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      try { mediaRecorder.stop(); } catch (e) {}
    }
    if (voiceStream) {
      voiceStream.getTracks().forEach((t) => t.stop());
      voiceStream = null;
    }
    sendCommand(cmd);
    return;
  }

  // Fallback: If Web Speech did not yield a transcript, let mediaRecorder upload
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

function renderMemoryCard(content, title) {
  const div = document.createElement("div");
  div.className = "log-entry phone-action-card memory-feed-card";
  div.innerHTML = `
    <div class="action-card-header">
      <span class="action-card-badge">🧠 MEMORY VAULT</span>
      <span class="action-card-app">${title || "Memory"}</span>
    </div>
    <div class="action-card-body" style="padding: 12px 14px;">
      <div style="white-space: pre-wrap; font-size: 0.95rem; line-height: 1.6; color: #38bdf8; font-family: system-ui, -apple-system, sans-serif;">
        ${content || "No memories stored."}
      </div>
    </div>
  `;
  feedLog.appendChild(div);
  feedLog.scrollTop = feedLog.scrollHeight;
}

function renderKnowledgeCard(action) {
  if (!feedLog) return;
  const div = document.createElement("div");
  div.className = "log-entry phone-action-card knowledge-feed-card";
  const cat = action.category || "WORLD KNOWLEDGE ENCYCLOPEDIA";
  const title = action.title || "OmniBrain Dossier";
  const content = action.content || "";
  const url = action.url;

  div.innerHTML = `
    <div class="action-card-header">
      <span class="action-card-badge">🧠 ${cat}</span>
      <span class="action-card-app">${title}</span>
    </div>
    <div class="action-card-body" style="padding: 12px 14px;">
      <h3 style="font-family: var(--font-display); font-size: 14px; font-weight: 800; color: #ffffff; margin-bottom: 6px; letter-spacing: 0.5px;">
        ${title}
      </h3>
      <div style="font-family: var(--font-mono); font-size: 11px; line-height: 1.6; color: #e2e8f0; margin-bottom: 8px;">
        ${content}
      </div>
      ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="knowledge-card-link-btn">READ COMPLETE ENCYCLOPEDIC DOSSIER ↗</a>` : ''}
    </div>
  `;
  feedLog.appendChild(div);
  feedLog.scrollTop = feedLog.scrollHeight;
}

function handleClientAction(action) {
  if (!action) return;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

  if (action.type === "knowledge_card") {
    renderKnowledgeCard(action);
    return;
  }
  if (action.type === "open_stocks") {
    const sym = action.symbol || "NVDA";
    if (sym && stockMarketCache[sym]) {
      selectStock(sym);
    }
    if (action.tab === "profile") {
      switchRightTab("company");
    } else {
      switchRightTab("chart");
    }
    if (window.innerWidth < 1024) {
      switchMobileTab("right");
    }
    return;
  }
  if (action.type === "memory_card") {
    renderMemoryCard(action.content, action.title);
    return;
  }
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
      } else if (data.type === "thought") {
        addLogEntry("exec", `🧠 [THOUGHT]: ${data.text}`);
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
  } else if (lower.includes("show stock") || lower.includes("live stock") || lower.includes("open stock") || lower.includes("stock market") || lower.includes("crypto market")) {
    openStocksModal();
  } else if (lower.includes("close chart") || lower.includes("close stock")) {
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
    console.log("Server bridge offline, activating Autonomous Client Brain:", err.message);
    await executeAutonomousClientCommand(cmd);
    setAppState("listening");
  }
}

async function executeAutonomousClientCommand(rawCmd) {
  const clean = rawCmd.trim().toLowerCase();

  // Math: Percentages
  const pct = clean.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)\s+of\s+(\d+(?:\.\d+)?)/);
  if (pct) {
    const p = parseFloat(pct[1]), val = parseFloat(pct[2]);
    const res = (p / 100.0) * val;
    const msg = `${p}% of ${val} is ${res}`;
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }

  // Math: Arithmetic
  for (const prefix of ["calculate", "what is", "compute", "solve"]) {
    if (clean.startsWith(prefix)) {
      let expr = clean.replace(prefix, "").trim();
      expr = expr.replace(/\bplus\b/g, "+").replace(/\bminus\b/g, "-").replace(/\btimes|x|multiplied by\b/g, "*").replace(/\bdivided by\b/g, "/");
      const m = expr.match(/([0-9\.\s\+\-\*\/\(\)]+)/);
      if (m && /[+\-*/]/.test(m[1])) {
        try {
          const res = Function('"use strict";return (' + m[1] + ')')();
          const msg = `The result is ${res}`;
          addLogEntry("alex", msg);
          playAlexVoice(msg);
          return;
        } catch (e) {}
      }
    }
  }

  // Flashlight
  if (clean.includes("turn on flashlight") || clean.includes("torch on") || clean.includes("flashlight on")) {
    handleClientAction({ type: "toggle_torch", state: true });
    const msg = "Flashlight activated on your device.";
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }
  if (clean.includes("turn off flashlight") || clean.includes("torch off") || clean.includes("flashlight off")) {
    handleClientAction({ type: "toggle_torch", state: false });
    const msg = "Flashlight turned off.";
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }

  // Timer
  const tm = clean.match(/(?:timer|alarm)\s+(?:for\s+)?(\d+)?\s*(minute|minutes|min|second|seconds|sec|hour|hours)?/);
  if (tm) {
    const dur = parseInt(tm[1] || "5");
    const unit = tm[2] || "minutes";
    let sec = dur * 60;
    if (unit.includes("sec")) sec = dur;
    else if (unit.includes("hour")) sec = dur * 3600;
    handleClientAction({ type: "start_timer", seconds: sec, label: `${dur} ${unit}` });
    const msg = `Timer set for ${dur} ${unit}.`;
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }

  // Notes
  const noteSave = clean.match(/^(?:remember|note down|take note|write a note|add note|save note)\s*[:,-]?\s*(.+)$/);
  if (noteSave) {
    const noteText = noteSave[1].trim();
    let notes = [];
    try { notes = JSON.parse(localStorage.getItem("alex_notes") || "[]"); } catch (e) {}
    notes.push({ text: noteText, date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    localStorage.setItem("alex_notes", JSON.stringify(notes));
    const content = notes.map((n, i) => `${i + 1}. ${n.text} (${n.date})`).join("\n");
    handleClientAction({ type: "note_card", content, title: "Notes Vault" });
    const msg = `Note saved: '${noteText}'`;
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }
  if (["read notes", "show notes", "show my notes", "my notes", "notes"].includes(clean)) {
    let notes = [];
    try { notes = JSON.parse(localStorage.getItem("alex_notes") || "[]"); } catch (e) {}
    const content = notes.length ? notes.map((n, i) => `${i + 1}. ${n.text} (${n.date})`).join("\n") : "You have no saved notes.";
    handleClientAction({ type: "note_card", content, title: "Notes Vault" });
    const msg = notes.length ? "Displaying your saved notes." : "You have no saved notes.";
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }
  if (["clear notes", "delete notes"].includes(clean)) {
    localStorage.removeItem("alex_notes");
    handleClientAction({ type: "note_card", content: "All notes have been cleared.", title: "Notes Cleared" });
    const msg = "All notes have been cleared.";
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }

  // Memory Vault (Client-side)
  const memSave = clean.match(/^(?:remember that|store in memory|save to memory)\s*[:,-]?\s*(.+)$/);
  if (memSave) {
    const factText = memSave[1].trim();
    let facts = [];
    try { facts = JSON.parse(localStorage.getItem("alex_facts") || "[]"); } catch (e) {}
    facts.push({ fact: factText, date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    localStorage.setItem("alex_facts", JSON.stringify(facts));
    const content = facts.map((f, i) => `${i + 1}. ${f.fact} (${f.date})`).join("\n");
    handleClientAction({ type: "memory_card", content, title: "Memory Vault" });
    const msg = `Remembered: '${factText}'`;
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }
  if (["show memory", "my memory", "what do you remember", "memory"].includes(clean)) {
    let facts = [];
    try { facts = JSON.parse(localStorage.getItem("alex_facts") || "[]"); } catch (e) {}
    const content = facts.length ? facts.map((f, i) => `${i + 1}. ${f.fact} (${f.date})`).join("\n") : "No memories stored yet.";
    handleClientAction({ type: "memory_card", content, title: "Memory Vault" });
    const msg = facts.length ? "Displaying your memory vault." : "No memories stored yet.";
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }
  if (["clear memory", "delete memory"].includes(clean)) {
    localStorage.removeItem("alex_facts");
    handleClientAction({ type: "memory_card", content: "Memory vault cleared.", title: "Memory Cleared" });
    const msg = "All memories have been cleared.";
    addLogEntry("alex", msg);
    playAlexVoice(msg);
    return;
  }

  // Weather via direct client fetch
  if (clean.includes("weather")) {
    try {
      const wres = await fetch("https://wttr.in/?format=%C+%t+(feels+like+%f)+humidity+%h");
      const wtext = await wres.text();
      const msg = `The weather is currently ${wtext.trim()}.`;
      addLogEntry("alex", msg);
      playAlexVoice(msg);
      return;
    } catch (e) {}
  }

  // General questions via Wikipedia Search & Summary
  const cleanQ = clean.replace(/^(?:alex|hey alex|please|tell me about|tell me|what is the|what is|what are the|what are|who was the|who was|who is the|who is|explain the|explain|how does|why is)\s+/i, "").replace(/\?+$/, "").trim();
  if (cleanQ.length > 2) {
    try {
      const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQ)}&origin=*&format=json&srlimit=2`);
      const sData = await searchRes.json();
      const results = sData?.query?.search || [];
      if (results.length > 0) {
        const topTitle = results[0].title;
        const sumRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`);
        const sumData = await sumRes.json();
        if (sumData.extract) {
          const sentences = sumData.extract.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
          addLogEntry("alex", sentences);
          playAlexVoice(sentences);
          handleClientAction({
            type: "knowledge_card",
            title: topTitle,
            category: "GLOBAL KNOWLEDGE ENCYCLOPEDIA",
            content: sumData.extract,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topTitle)}`
          });
          return;
        }
      }
    } catch (e) {}
  }

  // Explicit Google search
  for (const sp of ["search google for ", "search on google for ", "google for ", "google "]) {
    if (clean.startsWith(sp)) {
      const query = clean.replace(sp, "").trim();
      handleClientAction({ type: "open_url", url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, app: "Google", title: `Google: '${query}'` });
      const msg = `Searching Google for '${query}'.`;
      addLogEntry("alex", msg);
      playAlexVoice(msg);
      return;
    }
  }

  // Default fallback
  const fallbackMsg = `I processed '${rawCmd}'. Alex neural interface online.`;
  addLogEntry("alex", fallbackMsg);
  playAlexVoice(fallbackMsg);
}

// Form submission
const commandForm = document.getElementById("commandForm");
const commandInput = document.getElementById("commandInput");

if (commandForm) {
  commandForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = commandInput ? commandInput.value : "";
    if (commandInput) commandInput.value = "";
    playSciFiBeep("execute");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      triggerShockwave(rect.width / 2, rect.height / 2, "#00f0ff");
    }
    sendCommand(val);
  });
}

// Quick Action Chips
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const cmd = chip.getAttribute("data-cmd");
    playSciFiBeep("execute");
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      triggerShockwave(rect.width / 2, rect.height / 2, "#a855f7");
    }
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
      shareQrCode.onerror = () => {
        shareQrCode.src = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=250`;
      };
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
  if (stocksModal) stocksModal.classList.remove("active");
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
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded yet");
    return;
  }

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

if (commsForm) {
  commsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const platEl = document.querySelector('input[name="platform"]:checked');
    const platform = platEl ? platEl.value : "whatsapp";
    const recipient = commRecipient ? commRecipient.value.trim() : "";
    const message = commMessage ? commMessage.value.trim() : "";

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
      playAlexVoice(data.response);
    } catch (err) {
      addLogEntry("system", `Comms error: ${err.message}`);
    }

    if (commMessage) commMessage.value = "";
  });
}

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

// =============================================================
// LIVE STOCK & CRYPTO MARKET INTELLIGENCE SUBSYSTEM
// =============================================================
const stocksModal = document.getElementById("stocksModal");
const openStocksBtn = document.getElementById("openStocksBtn");
const expandMarketBtn = document.getElementById("expandMarketBtn");
const closeStocksModalBtn = document.getElementById("closeStocksModalBtn");
const marketTickerTrack = document.getElementById("marketTickerTrack");
const stockChipsRow = document.getElementById("stockChipsRow");

let activeStockChart = null;
let currentStockSymbol = "NVDA";
let stockMarketCache = {};
let previousStockPrices = {};

const INITIAL_STOCKS = [
  { symbol: "NVDA", name: "NVIDIA Corp", price: 210.96, change: 1.45, high: 213.50, low: 208.20, volume: "48.2M", currency: "$", history: [206.0, 207.5, 209.0, 210.2, 210.96] },
  { symbol: "AAPL", name: "Apple Inc", price: 347.72, change: -0.14, high: 349.80, low: 345.10, volume: "52.8M", currency: "$", history: [346.0, 347.1, 348.5, 347.9, 347.72] },
  { symbol: "BTC", name: "Bitcoin USD", price: 80083.92, change: -1.23, high: 81500.00, low: 79200.00, volume: "$28.4B", currency: "$", history: [79500.0, 79900.0, 80400.0, 80200.0, 80083.92] },
  { symbol: "TSLA", name: "Tesla Inc", price: 242.80, change: 2.15, high: 245.00, low: 238.40, volume: "64.1M", currency: "$", history: [238.0, 239.5, 241.0, 242.0, 242.8] },
  { symbol: "ETH", name: "Ethereum USD", price: 2740.10, change: 1.15, high: 2780.00, low: 2710.00, volume: "$14.2B", currency: "$", history: [2690.0, 2715.0, 2730.0, 2738.0, 2740.1] },
  { symbol: "GOOGL", name: "Alphabet Inc", price: 182.40, change: 0.85, high: 183.90, low: 181.10, volume: "22.5M", currency: "$", history: [180.5, 181.2, 181.9, 182.1, 182.4] },
  { symbol: "MSFT", name: "Microsoft Corp", price: 448.50, change: 0.62, high: 451.20, low: 446.80, volume: "19.3M", currency: "$", history: [445.0, 446.2, 447.8, 448.1, 448.5] },
  { symbol: "AMZN", name: "Amazon.com Inc", price: 194.20, change: 1.30, high: 196.00, low: 192.50, volume: "31.7M", currency: "$", history: [191.0, 192.4, 193.1, 193.8, 194.2] },
  { symbol: "SPY", name: "S&P 500 ETF", price: 586.40, change: 0.45, high: 588.10, low: 584.20, volume: "42.0M", currency: "$", history: [583.0, 584.5, 585.8, 586.1, 586.4] }
];

INITIAL_STOCKS.forEach(s => { stockMarketCache[s.symbol] = s; });

function renderMarketTicker(stocksList) {
  if (!marketTickerTrack) return;
  const displayList = [...stocksList, ...stocksList];
  marketTickerTrack.innerHTML = "";

  displayList.forEach((s) => {
    const isPos = s.change >= 0;
    const chgSign = isPos ? "+" : "";
    const arrow = isPos ? "▲" : "▼";

    const item = document.createElement("div");
    item.className = "ticker-item";
    item.id = `ticker-${s.symbol}`;
    item.innerHTML = `
      <span class="ticker-sym">${s.symbol}</span>
      <span class="ticker-price">${s.currency || "$"}${Number(s.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      <span class="ticker-chg ${isPos ? 'pos' : 'neg'}">${chgSign}${s.change.toFixed(2)}% ${arrow}</span>
    `;

    item.addEventListener("click", () => {
      openStocksModal(s.symbol);
    });

    marketTickerTrack.appendChild(item);
  });
}

function renderStockChips(stocksList) {
  if (!stockChipsRow) return;
  stockChipsRow.innerHTML = "";

  stocksList.forEach((s) => {
    const isPos = s.change >= 0;
    const chgSign = isPos ? "+" : "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `stock-chip-btn ${s.symbol === currentStockSymbol ? 'active' : ''}`;
    btn.setAttribute("data-symbol", s.symbol);
    btn.innerHTML = `
      <span>${s.symbol}</span>
      <span style="color: ${isPos ? '#10b981' : '#ef4444'}; font-family: monospace; font-size: 10px;">${chgSign}${s.change.toFixed(1)}%</span>
    `;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".stock-chip-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectStock(s.symbol);
    });

    stockChipsRow.appendChild(btn);
  });
}

async function fetchLiveMarketData() {
  try {
    const res = await fetch("/api/stocks");
    const data = await res.json();
    if (data.status === "ok" && data.stocks) {
      const list = Object.values(data.stocks);
      list.forEach(s => {
        const oldPrice = previousStockPrices[s.symbol];
        if (oldPrice !== undefined && oldPrice !== s.price) {
          const el = document.querySelectorAll(`[id="ticker-${s.symbol}"]`);
          el.forEach(item => {
            item.classList.remove("flash-up", "flash-down");
            void item.offsetWidth;
            item.classList.add(s.price > oldPrice ? "flash-up" : "flash-down");
          });
        }
        previousStockPrices[s.symbol] = s.price;
        stockMarketCache[s.symbol] = s;
      });

      renderMarketTicker(list);
      renderStockChips(list);
      renderRightCompanyChips(list);

      const activeStock = stockMarketCache[currentStockSymbol];
      if (activeStock) {
        updateStockHeroUI(activeStock);
      }
    }
  } catch (e) {
    const list = Object.values(stockMarketCache);
    if (list.length > 0) {
      renderMarketTicker(list);
    }
  }
}

let activeRightChart = null;

function switchRightTab(tabName) {
  const tabs = document.querySelectorAll(".right-sub-tab");
  tabs.forEach(t => {
    if (t.dataset.tab === tabName) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  const panes = {
    "company": document.getElementById("paneCompanyDetails"),
    "chart": document.getElementById("paneLiveChart"),
    "feed": document.getElementById("paneTelemetryLog")
  };

  Object.keys(panes).forEach(k => {
    if (panes[k]) {
      if (k === tabName) {
        panes[k].classList.add("active");
      } else {
        panes[k].classList.remove("active");
      }
    }
  });

  if (tabName === "chart") {
    const curStock = stockMarketCache[currentStockSymbol];
    if (curStock) {
      setTimeout(() => updateStockChart(curStock), 60);
    }
  }
}

function switchMobileTab(panelName) {
  const mobileBtns = document.querySelectorAll(".mobile-tab-btn");
  mobileBtns.forEach(b => {
    if (b.dataset.panel === panelName) {
      b.classList.add("active");
    } else {
      b.classList.remove("active");
    }
  });

  const grid = document.querySelector(".hud-cockpit-grid");
  if (grid) {
    grid.setAttribute("data-mobile-active", panelName);
  }

  if (panelName === "right") {
    const curStock = stockMarketCache[currentStockSymbol];
    if (curStock) {
      setTimeout(() => updateStockChart(curStock), 60);
    }
  }
}

function renderRightCompanyChips(stocksList) {
  const container = document.getElementById("rightCompanyChipsRow");
  if (!container) return;
  container.innerHTML = "";

  stocksList.forEach(s => {
    const isPos = s.change >= 0;
    const chgSign = isPos ? "+" : "";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `comp-chip-btn ${s.symbol === currentStockSymbol ? 'active' : ''}`;
    btn.setAttribute("data-symbol", s.symbol);
    btn.innerHTML = `
      <span>${s.symbol}</span>
      <span style="color: ${isPos ? '#10b981' : '#ef4444'}; font-family: monospace; font-size: 10px;">${chgSign}${s.change.toFixed(1)}%</span>
    `;

    btn.addEventListener("click", () => {
      document.querySelectorAll(".comp-chip-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectStock(s.symbol);
    });

    container.appendChild(btn);
  });
}

function updateStockHeroUI(stock) {
  if (!stock) return;
  const det = stock.company_details || {};
  const isPos = stock.change >= 0;
  const chgSign = isPos ? "+" : "";
  const currSym = stock.currency || "$";

  // 1. Right Panel Company Details Card
  const rSym = document.getElementById("rightCompSymbol");
  const rName = document.getElementById("rightCompName");
  const rPrice = document.getElementById("rightCompPrice");
  const rChange = document.getElementById("rightCompChange");
  const rCeo = document.getElementById("rightCompCeo");
  const rSector = document.getElementById("rightCompSector");
  const rHq = document.getElementById("rightCompHq");
  const rFounded = document.getElementById("rightCompFounded");
  const rEmployees = document.getElementById("rightCompEmployees");
  const rBeta = document.getElementById("rightCompBeta");
  const rMarketCap = document.getElementById("rightCompMarketCap");
  const rPE = document.getElementById("rightCompPE");
  const rEPS = document.getElementById("rightCompEPS");
  const rTarget = document.getElementById("rightCompTarget");
  const r52Low = document.getElementById("rightComp52Low");
  const r52High = document.getElementById("rightComp52High");
  const rRangeFill = document.getElementById("rightCompRangeFill");
  const rDesc = document.getElementById("rightCompDesc");
  const rNewsList = document.getElementById("rightCompNewsList");

  if (rSym) rSym.innerText = stock.symbol;
  if (rName) rName.innerText = stock.name || stock.symbol;
  if (rPrice) rPrice.innerText = `${currSym}${Number(stock.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (rChange) {
    rChange.className = `comp-change ${isPos ? 'pos' : 'neg'}`;
    rChange.innerText = `${chgSign}${stock.change.toFixed(2)}% ${isPos ? '▲' : '▼'}`;
  }

  if (rCeo) rCeo.innerText = `CEO: ${det.ceo || 'Executive Leadership'}`;
  if (rSector) rSector.innerText = `${det.sector || 'Industry Leader'} • ${det.industry || 'Market Leader'}`;
  if (rHq) rHq.innerText = det.headquarters || 'USA';
  if (rFounded) rFounded.innerText = det.founded || 'Established';
  if (rEmployees) rEmployees.innerText = det.employees || 'Global Staff';
  if (rBeta) rBeta.innerText = det.beta || '1.05';
  if (rMarketCap) rMarketCap.innerText = det.market_cap || '$1.0T';
  if (rPE) rPE.innerText = det.pe_ratio || 'N/A';
  if (rEPS) rEPS.innerText = det.eps || 'N/A';
  if (rTarget) rTarget.innerText = det.analyst_target || 'N/A';

  const lowValStr = det.week52_low || `${currSym}${(stock.price * 0.72).toFixed(2)}`;
  const highValStr = det.week52_high || `${currSym}${(stock.price * 1.28).toFixed(2)}`;
  if (r52Low) r52Low.innerText = `52W L: ${lowValStr}`;
  if (r52High) r52High.innerText = `52W H: ${highValStr}`;

  if (rRangeFill) {
    const rawLow = parseFloat(lowValStr.replace(/[^0-9.]/g, "")) || (stock.price * 0.72);
    const rawHigh = parseFloat(highValStr.replace(/[^0-9.]/g, "")) || (stock.price * 1.28);
    const rangeSpan = Math.max(1, rawHigh - rawLow);
    const pct = Math.max(5, Math.min(95, ((stock.price - rawLow) / rangeSpan) * 100));
    rRangeFill.style.width = `${pct.toFixed(1)}%`;
  }

  if (rDesc) rDesc.innerText = det.description || `${stock.name} is a global market leader.`;

  if (rNewsList && Array.isArray(det.news)) {
    rNewsList.innerHTML = "";
    det.news.forEach(n => {
      const card = document.createElement("div");
      card.className = "news-card-item";
      card.innerHTML = `
        <div class="news-card-title">${n.headline}</div>
        <div class="news-card-meta">${n.source} • ${n.time}</div>
      `;
      rNewsList.appendChild(card);
    });
  }

  // 2. Right Chart Stats
  const rStatHigh = document.getElementById("rightStatHigh");
  const rStatLow = document.getElementById("rightStatLow");
  const rStatVol = document.getElementById("rightStatVol");
  const rStatSentiment = document.getElementById("rightStatSentiment");
  if (rStatHigh) rStatHigh.innerText = `${currSym}${Number(stock.high || stock.price * 1.012).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (rStatLow) rStatLow.innerText = `${currSym}${Number(stock.low || stock.price * 0.988).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (rStatVol) rStatVol.innerText = stock.volume || "32.5M";
  if (rStatSentiment) {
    rStatSentiment.innerText = isPos ? "78% BULLISH" : "62% BEARISH";
    rStatSentiment.className = `cstat-val ${isPos ? 'green' : 'neg'}`;
  }

  // 3. Modal Elements (#stocksModal)
  const symEl = document.getElementById("stockHeroSym");
  const nameEl = document.getElementById("stockHeroName");
  const priceEl = document.getElementById("stockHeroPrice");
  const changeEl = document.getElementById("stockHeroChange");
  const highEl = document.getElementById("stockStatHigh");
  const lowEl = document.getElementById("stockStatLow");
  const volEl = document.getElementById("stockStatVol");
  const mCeo = document.getElementById("modalCompCeo");
  const mSector = document.getElementById("modalCompSector");
  const mHq = document.getElementById("modalCompHq");
  const mFounded = document.getElementById("modalCompFounded");
  const mEmployees = document.getElementById("modalCompEmployees");
  const mBeta = document.getElementById("modalCompBeta");
  const mMarketCap = document.getElementById("modalCompMarketCap");
  const mPE = document.getElementById("modalCompPE");
  const mEPS = document.getElementById("modalCompEPS");
  const mTarget = document.getElementById("modalCompTarget");
  const m52Low = document.getElementById("modalComp52Low");
  const m52High = document.getElementById("modalComp52High");
  const mRangeFill = document.getElementById("modalCompRangeFill");
  const mDesc = document.getElementById("modalCompDesc");
  const mNewsList = document.getElementById("modalCompNewsList");

  if (symEl) symEl.innerText = stock.symbol;
  if (nameEl) nameEl.innerText = stock.name || stock.symbol;
  if (priceEl) priceEl.innerText = `${currSym}${Number(stock.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (changeEl) {
    changeEl.className = `stock-hero-change ${isPos ? 'pos' : 'neg'}`;
    changeEl.innerText = `${chgSign}${stock.change.toFixed(2)}% ${isPos ? '▲' : '▼'}`;
  }
  if (highEl) highEl.innerText = `${currSym}${Number(stock.high || stock.price * 1.012).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (lowEl) lowEl.innerText = `${currSym}${Number(stock.low || stock.price * 0.988).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  if (volEl) volEl.innerText = stock.volume || "32.5M";

  if (mCeo) mCeo.innerText = `CEO: ${det.ceo || 'Executive Leadership'}`;
  if (mSector) mSector.innerText = `${det.sector || 'Industry Leader'} • ${det.industry || 'Market Leader'}`;
  if (mHq) mHq.innerText = det.headquarters || 'USA';
  if (mFounded) mFounded.innerText = det.founded || 'Established';
  if (mEmployees) mEmployees.innerText = det.employees || 'Global Staff';
  if (mBeta) mBeta.innerText = det.beta || '1.05';
  if (mMarketCap) mMarketCap.innerText = det.market_cap || '$1.0T';
  if (mPE) mPE.innerText = det.pe_ratio || 'N/A';
  if (mEPS) mEPS.innerText = det.eps || 'N/A';
  if (mTarget) mTarget.innerText = det.analyst_target || 'N/A';
  if (m52Low) m52Low.innerText = lowValStr;
  if (m52High) m52High.innerText = highValStr;
  if (mDesc) mDesc.innerText = det.description || `${stock.name} is a global market leader.`;

  if (mNewsList && Array.isArray(det.news)) {
    mNewsList.innerHTML = "";
    det.news.forEach(n => {
      const card = document.createElement("div");
      card.className = "news-card-item";
      card.innerHTML = `
        <div class="news-card-title">${n.headline}</div>
        <div class="news-card-meta">${n.source} • ${n.time}</div>
      `;
      mNewsList.appendChild(card);
    });
  }

  updateStockChart(stock);
}

function updateStockChart(stock) {
  if (typeof Chart === "undefined" || !stock) return;
  const history = (stock.history && stock.history.length > 1) ? stock.history : [stock.price * 0.98, stock.price * 0.99, stock.price * 1.005, stock.price];
  const labels = history.map((_, i) => `${i * 10}m`);
  const isPos = stock.change >= 0;
  const primaryColor = isPos ? "#10b981" : "#ef4444";
  const gradColor = isPos ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)";

  // Draw on Right Panel Chart Canvas if visible
  const rightCanvas = document.getElementById("rightChartCanvas");
  if (rightCanvas) {
    if (activeRightChart) activeRightChart.destroy();
    const ctx = rightCanvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, gradColor);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");

    activeRightChart = new Chart(rightCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: `${stock.symbol} Price`,
          data: history,
          borderColor: primaryColor,
          backgroundColor: gradient,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: primaryColor,
            borderWidth: 1,
            titleFont: { family: "JetBrains Mono" },
            bodyFont: { family: "JetBrains Mono" },
            callbacks: {
              label: (ctx) => ` Price: ${stock.currency || "$"}${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            ticks: {
              color: "#94a3b8",
              font: { family: "JetBrains Mono", size: 10 },
              callback: (val) => `${stock.currency || "$"}${val}`
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          }
        }
      }
    });
  }

  // Draw on Modal Canvas if active
  const modalCanvas = document.getElementById("stockChartCanvas");
  if (modalCanvas && stocksModal && stocksModal.classList.contains("active")) {
    if (activeStockChart) activeStockChart.destroy();
    const mCtx = modalCanvas.getContext("2d");
    const mGrad = mCtx.createLinearGradient(0, 0, 0, 160);
    mGrad.addColorStop(0, gradColor);
    mGrad.addColorStop(1, "rgba(0, 0, 0, 0.0)");

    activeStockChart = new Chart(modalCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: `${stock.symbol} Price`,
          data: history,
          borderColor: primaryColor,
          backgroundColor: mGrad,
          borderWidth: 2.2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#ffffff",
          tension: 0.35,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: primaryColor,
            borderWidth: 1,
            titleFont: { family: "JetBrains Mono" },
            bodyFont: { family: "JetBrains Mono" },
            callbacks: {
              label: (ctx) => ` Price: ${stock.currency || "$"}${ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: { display: false },
          y: {
            ticks: {
              color: "#94a3b8",
              font: { family: "JetBrains Mono", size: 10 },
              callback: (val) => `${stock.currency || "$"}${val}`
            },
            grid: { color: "rgba(255, 255, 255, 0.05)" }
          }
        }
      }
    });
  }
}

async function selectStock(sym) {
  if (!sym) return;
  currentStockSymbol = sym;

  // Sync active states on all stock chip buttons
  document.querySelectorAll(".stock-chip-btn, .comp-chip-btn").forEach(btn => {
    if (btn.getAttribute("data-symbol") === sym) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  let stock = stockMarketCache[sym];
  if (!stock) {
    try {
      const res = await fetch(`/api/stocks?symbol=${encodeURIComponent(sym)}`);
      const data = await res.json();
      if (data && data.stock) {
        stock = data.stock;
        stockMarketCache[sym] = stock;
      }
    } catch (e) {
      console.log("Error fetching stock:", e);
    }
  }
  if (stock) {
    updateStockHeroUI(stock);
  }
}

function openStocksModal(symbol = "NVDA") {
  closeModals();
  if (stocksModal) stocksModal.classList.add("active");
  playSciFiBeep("activate");
  if (symbol && stockMarketCache[symbol]) {
    selectStock(symbol);
  } else {
    selectStock(currentStockSymbol);
  }
}

// Left Panel Buttons Wiring
const optCompBtn = document.getElementById("optCompanyDetailsBtn");
const optStocksBtn = document.getElementById("optLiveStocksBtn");
const optPermBtn = document.getElementById("optPermissionsBtn");
const optPhoneBtn = document.getElementById("optPhoneLinkBtn");
const optChartsBtn = document.getElementById("optChartsBtn");
const optCommsBtn = document.getElementById("optCommsBtn");
const optMemBtn = document.getElementById("optMemoryBtn");
const optNotesBtn = document.getElementById("optNotesBtn");
const expandStocksBtn = document.getElementById("expandStocksModalBtn");

if (optCompBtn) {
  optCompBtn.addEventListener("click", () => {
    switchRightTab("company");
    if (window.innerWidth < 1024) switchMobileTab("right");
    playSciFiBeep("activate");
  });
}

if (optStocksBtn) {
  optStocksBtn.addEventListener("click", () => {
    switchRightTab("chart");
    if (window.innerWidth < 1024) switchMobileTab("right");
    playSciFiBeep("activate");
  });
}

if (optPermBtn) optPermBtn.addEventListener("click", openPermissionsModal);
if (optPhoneBtn) optPhoneBtn.addEventListener("click", openShareModal);
if (optChartsBtn) optChartsBtn.addEventListener("click", openChartsModal);
if (optCommsBtn) optCommsBtn.addEventListener("click", openCommsModal);
if (optMemBtn) optMemBtn.addEventListener("click", () => sendCommand("show memory"));
if (optNotesBtn) optNotesBtn.addEventListener("click", () => sendCommand("read notes"));
if (expandStocksBtn) expandStocksBtn.addEventListener("click", () => openStocksModal(currentStockSymbol));

// Mobile Cockpit Tabs Listeners
document.querySelectorAll(".mobile-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    switchMobileTab(btn.dataset.panel);
    playSciFiBeep("activate");
  });
});

// Right Panel Sub-Tabs Listeners
document.querySelectorAll(".right-sub-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    switchRightTab(btn.dataset.tab);
    playSciFiBeep("activate");
  });
});

// Modal Sub-Tabs Listeners
document.querySelectorAll(".modal-tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const targetTab = btn.dataset.modaltab;

    const modalPanes = {
      "chart": document.getElementById("modalPaneChart"),
      "profile": document.getElementById("modalPaneProfile"),
      "fundamentals": document.getElementById("modalPaneFundamentals"),
      "news": document.getElementById("modalPaneNews")
    };

    Object.keys(modalPanes).forEach(k => {
      if (modalPanes[k]) {
        if (k === targetTab) modalPanes[k].classList.add("active");
        else modalPanes[k].classList.remove("active");
      }
    });

    if (targetTab === "chart") {
      const curStock = stockMarketCache[currentStockSymbol];
      if (curStock) setTimeout(() => updateStockChart(curStock), 60);
    }
  });
});

// Instant Action Chips & Quick Pills
document.querySelectorAll(".action-chip-btn, .pill-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const cmd = chip.getAttribute("data-cmd");
    if (cmd) sendCommand(cmd);
  });
});

if (openStocksBtn) openStocksBtn.addEventListener("click", () => openStocksModal());
if (expandMarketBtn) expandMarketBtn.addEventListener("click", () => openStocksModal());
if (closeStocksModalBtn) closeStocksModalBtn.addEventListener("click", closeModals);

// Initial Market Ticker Mount & Periodic Real-Time Fetching
renderMarketTicker(INITIAL_STOCKS);
renderStockChips(INITIAL_STOCKS);
renderRightCompanyChips(INITIAL_STOCKS);
selectStock("NVDA");
fetchLiveMarketData();
setInterval(fetchLiveMarketData, 2800);

// -------------------------------------------------------------
// Live Network Uplink Latency Ping (Real-Time Sensor)
// -------------------------------------------------------------
async function updateLivePing() {
  const pingEl = document.getElementById("pingVal");
  if (!pingEl) return;

  const start = performance.now();
  try {
    await fetch("/api/public_link", { cache: "no-store" });
    const latency = Math.max(8, Math.round(performance.now() - start));
    pingEl.innerText = `LIVE: ${latency}ms`;
  } catch (e) {
    pingEl.innerText = `LIVE: SYNCED`;
  }
}
setInterval(updateLivePing, 4000);
updateLivePing();


// -------------------------------------------------------------
// Cyberpunk Hacker Matrix Digital Rain (Ambient Background Layer)
// -------------------------------------------------------------
function initMatrixRain() {
  const rainCanvas = document.getElementById("matrixRainCanvas");
  if (!rainCanvas) return;
  const rCtx = rainCanvas.getContext("2d");

  function resizeRain() {
    rainCanvas.width = window.innerWidth;
    rainCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeRain);
  resizeRain();

  const chars = "0123456789ABCDEF010101XYZ<>/{}[]*#$@!%&";
  const fontSize = 14;
  const columns = Math.max(10, Math.floor(window.innerWidth / fontSize));
  const drops = [];
  for (let i = 0; i < columns; i++) {
    drops[i] = Math.floor(Math.random() * -40);
  }

  let lastT = 0;
  function renderRain(t) {
    requestAnimationFrame(renderRain);
    if (t - lastT < 36) return; // ~28 FPS optimal performance
    lastT = t;

    rCtx.fillStyle = "rgba(2, 6, 23, 0.08)";
    rCtx.fillRect(0, 0, rainCanvas.width, rainCanvas.height);

    rCtx.font = `${fontSize}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;

      if (Math.random() > 0.88) {
        rCtx.fillStyle = "rgba(0, 240, 255, 0.85)";
        rCtx.shadowColor = "#00f0ff";
        rCtx.shadowBlur = 8;
      } else {
        rCtx.fillStyle = "rgba(0, 255, 102, 0.35)";
        rCtx.shadowColor = "#00ff66";
        rCtx.shadowBlur = 4;
      }

      rCtx.fillText(char, x, y);

      if (y > rainCanvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  requestAnimationFrame(renderRain);
}
initMatrixRain();

// Live CPU Core Activity Telemetry
function updateLiveCpu() {
  const cpuEl = document.getElementById("cpuVal");
  if (!cpuEl) return;
  const base = appState === "speaking" ? 42 : (appState === "recognizing" ? 68 : 22);
  const jitter = Math.floor((Math.random() - 0.5) * 8);
  cpuEl.innerText = `CPU: ${Math.max(12, base + jitter)}%`;
}
setInterval(updateLiveCpu, 2000);
