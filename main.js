import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sound } from './sound.js';

gsap.registerPlugin(ScrollTrigger);

// =========================================================================
// 1. CONFIGURATION & CONSTANTS
// =========================================================================
const TOTAL_FRAMES = 300;
const INITIAL_PRELOAD_COUNT = 30;
const FRAME_PATH = (index) => {
  const pad = String(index).padStart(6, '0');
  return `/portfolio_frames_30fps/frame_${pad}.jpg`;
};

// State
const images = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let isInitialLoaded = false;
let currentFrame = 0;
let targetFrame = 0;
let activeSceneIndex = 0;

// DOM Elements
const canvas = document.getElementById('sequence-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const preloader = document.getElementById('preloader');
const preloadBar = document.getElementById('preload-bar');
const preloadStatus = document.getElementById('preload-status');
const preloadPct = document.getElementById('preload-pct');
const frameNumDisplay = document.getElementById('frame-num-display');
const radarButtons = document.querySelectorAll('.radar-btn');
const sceneStages = document.querySelectorAll('.scene-stage');
const soundBtn = document.getElementById('sound-btn');
const soundText = document.getElementById('sound-text');
const clockDisplay = document.getElementById('clock-display');
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
const cursorLabel = document.getElementById('cursor-label');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');

// =========================================================================
// 2. CANVAS RESOLUTION & ASPECT-RATIO COVER
// =========================================================================
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderFrame(Math.round(currentFrame));
}

function drawImageCover(ctx, img, targetWidth, targetHeight) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  const imgRatio = imgW / imgH;
  const canvasRatio = targetWidth / targetHeight;

  let renderW, renderH, offsetX, offsetY;

  if (canvasRatio > imgRatio) {
    renderW = targetWidth;
    renderH = targetWidth / imgRatio;
    offsetX = 0;
    offsetY = (targetHeight - renderH) / 2;
  } else {
    renderW = targetHeight * imgRatio;
    renderH = targetHeight;
    offsetX = (targetWidth - renderW) / 2;
    offsetY = 0;
  }

  ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
}

function renderFrame(index) {
  const boundedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, index));
  let imgToDraw = images[boundedIndex];

  // Fallback to nearest loaded frame if this specific frame is buffering
  if (!imgToDraw || !imgToDraw.complete) {
    for (let offset = 1; offset < 40; offset++) {
      if (images[boundedIndex - offset]?.complete) {
        imgToDraw = images[boundedIndex - offset];
        break;
      }
      if (images[boundedIndex + offset]?.complete) {
        imgToDraw = images[boundedIndex + offset];
        break;
      }
    }
  }

  if (imgToDraw && imgToDraw.complete) {
    drawImageCover(ctx, imgToDraw, window.innerWidth, window.innerHeight);
  }
}

// =========================================================================
// 3. PROGRESSIVE FRAME STREAMING & PRELOADER
// =========================================================================
function preloadSingleFrame(idx) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = FRAME_PATH(idx + 1);
    img.onload = () => {
      images[idx] = img;
      loadedCount++;
      updatePreloadProgress();
      resolve(img);
    };
    img.onerror = () => {
      loadedCount++;
      updatePreloadProgress();
      resolve(null);
    };
  });
}

function updatePreloadProgress() {
  const percent = Math.min(100, Math.round((loadedCount / TOTAL_FRAMES) * 100));
  preloadBar.style.width = `${percent}%`;
  preloadPct.textContent = `${percent}%`;
  preloadStatus.textContent = `STREAMING NEURAL FRAMES [${loadedCount}/${TOTAL_FRAMES}]`;

  // As soon as initial batch is ready, reveal the page
  if (loadedCount >= INITIAL_PRELOAD_COUNT && !isInitialLoaded) {
    isInitialLoaded = true;
    renderFrame(0);
    setTimeout(() => {
      preloader.classList.add('loaded');
      initLenisAndScroll();
    }, 400);
  }
}

async function streamAllFrames() {
  // Batch 1: Instant load first 30 frames
  const initialPromises = [];
  for (let i = 0; i < INITIAL_PRELOAD_COUNT; i++) {
    initialPromises.push(preloadSingleFrame(i));
  }
  await Promise.all(initialPromises);

  // Batch 2: Background concurrent streaming in waves
  const chunkSize = 15;
  for (let i = INITIAL_PRELOAD_COUNT; i < TOTAL_FRAMES; i += chunkSize) {
    const chunkPromises = [];
    for (let j = i; j < Math.min(TOTAL_FRAMES, i + chunkSize); j++) {
      chunkPromises.push(preloadSingleFrame(j));
    }
    await Promise.all(chunkPromises);
  }
}

// =========================================================================
// 4. LENIS SMOOTH SCROLL & GSAP SYNC
// =========================================================================
let lenis = null;

function initLenisAndScroll() {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Setup ScrollTrigger scrubbing
  const stage = document.getElementById('scroll-stage');

  ScrollTrigger.create({
    trigger: stage,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.1,
    onUpdate: (self) => {
      const progress = self.progress;
      targetFrame = Math.min(TOTAL_FRAMES - 1, Math.floor(progress * (TOTAL_FRAMES - 1)));
      updateActiveScene(progress);
      updateRadarIndicator(progress);
    },
  });

  updateActiveScene(0);

  // RAF render loop with smooth interpolation
  function loop() {
    // Lerp damping for silky frame motion
    const diff = targetFrame - currentFrame;
    if (Math.abs(diff) > 0.01) {
      currentFrame += diff * 0.16;
      renderFrame(Math.round(currentFrame));

      // Update frame counter display
      const currentInt = Math.min(TOTAL_FRAMES, Math.max(1, Math.round(currentFrame) + 1));
      frameNumDisplay.textContent = `${String(currentInt).padStart(3, '0')} / ${TOTAL_FRAMES}`;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// =========================================================================
// 5. SCENE MANAGEMENT & THRESHOLD DETECTION
// =========================================================================
const SCENE_RANGES = [
  { id: 'scene-hero', min: 0.0, max: 0.18, index: 0 },
  { id: 'scene-matrix', min: 0.19, max: 0.40, index: 1 },
  { id: 'scene-vault', min: 0.41, max: 0.66, index: 2 },
  { id: 'scene-lab', min: 0.67, max: 0.82, index: 3 },
  { id: 'scene-honors', min: 0.83, max: 0.93, index: 4 },
  { id: 'scene-contact', min: 0.94, max: 1.0, index: 5 },
];

function updateActiveScene(progress) {
  let matchedIndex = 0;
  for (let i = 0; i < SCENE_RANGES.length; i++) {
    const range = SCENE_RANGES[i];
    if (progress >= range.min && progress <= range.max) {
      matchedIndex = range.index;
      break;
    }
  }

  if (matchedIndex !== activeSceneIndex) {
    sound.playSectionTransition();
    activeSceneIndex = matchedIndex;
  }

  sceneStages.forEach((stage, idx) => {
    if (idx === activeSceneIndex) {
      stage.classList.add('active');
    } else {
      stage.classList.remove('active');
    }
  });

  // Radar button sync
  radarButtons.forEach((btn, idx) => {
    if (idx === activeSceneIndex) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function updateRadarIndicator(progress) {
  // Handled by active class on radar points
}

// Click radar button to scroll directly to scene
radarButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    sound.playClick();
    const targetProgress = parseFloat(btn.dataset.target);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (lenis) {
      lenis.scrollTo(targetProgress * maxScroll, { duration: 1.5 });
    } else {
      window.scrollTo({ top: targetProgress * maxScroll, behavior: 'smooth' });
    }
  });
});

// Hero enter button
document.getElementById('hero-enter-btn')?.addEventListener('click', () => {
  sound.playClick();
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  if (lenis) {
    lenis.scrollTo(0.24 * maxScroll, { duration: 1.4 });
  }
});

// =========================================================================
// 6. MAGNETIC CUSTOM CURSOR
// =========================================================================
let mouseX = -100, mouseY = -100;
let ringX = -100, ringY = -100;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  cursorDot.style.left = `${mouseX}px`;
  cursorDot.style.top = `${mouseY}px`;
});

function animateCursor() {
  ringX += (mouseX - ringX) * 0.15;
  ringY += (mouseY - ringY) * 0.15;
  cursorRing.style.left = `${ringX}px`;
  cursorRing.style.top = `${ringY}px`;
  requestAnimationFrame(animateCursor);
}
requestAnimationFrame(animateCursor);

// Cursor hover targets
document.querySelectorAll('[data-cursor]').forEach((el) => {
  el.addEventListener('mouseenter', () => {
    const label = el.dataset.cursor || '';
    cursorRing.classList.add('active');
    cursorLabel.textContent = label;
    sound.playHover();
  });
  el.addEventListener('mouseleave', () => {
    cursorRing.classList.remove('active');
    cursorLabel.textContent = '';
  });
});

// Add hover blip to all buttons & links
document.querySelectorAll('button, a, .matrix-card, .project-card, .honor-card, .chip-tech').forEach((el) => {
  if (!el.hasAttribute('data-cursor')) {
    el.addEventListener('mouseenter', () => sound.playHover());
  }
  el.addEventListener('click', () => sound.playClick());
});

// =========================================================================
// 7. AUDIO ENGINE TOGGLE
// =========================================================================
soundBtn?.addEventListener('click', () => {
  const isEnabled = sound.toggle();
  if (isEnabled) {
    soundBtn.classList.add('playing');
    soundText.textContent = 'AUDIO ON';
    showToast('Spatial Audio Feedback Enabled');
    sound.playSuccess();
  } else {
    soundBtn.classList.remove('playing');
    soundText.textContent = 'AUDIO OFF';
    showToast('Audio Muted');
  }
});

// =========================================================================
// 8. LIVE BANGALORE / IST CLOCK
// =========================================================================
function updateClock() {
  const now = new Date();
  const options = {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  clockDisplay.textContent = new Intl.DateTimeFormat([], options).format(now);
}
setInterval(updateClock, 1000);
updateClock();

// =========================================================================
// 9. PROJECT INSPECTION MODAL SYSTEM
// =========================================================================
const PROJECTS_DATA = {
  nozzle: {
    id: 'PROJECT 01 // ONGOING',
    title: 'SMART PESTICIDE NOZZLE',
    tags: 'PRECISION AGRI-TECH • IOT • ESP32 • BLYNK',
    desc: 'A precision-agriculture system designed to identify crop areas that require treatment and spray only the necessary amount. Replaces blanket spraying with targeted, need-based action—reducing chemical waste and environmental impact through intelligent decision-making and automated microcontroller control.',
    arch: 'ESP32 / Blynk IoT / FlutterFlow',
    time: 'Ongoing Field Build',
    impact: 'Targeted Chemical Reduction',
    badge: 'THEME / SENSE · DECIDE · SPRAY',
    link: 'mailto:deepak843161.438@gmail.com?subject=Deepak%20R%20Smart%20Nozzle%20Project'
  },
  signbridge: {
    id: 'PROJECT 02 // PROTOTYPE',
    title: 'SIGNBRIDGE',
    tags: 'ACCESSIBILITY • COMPUTER VISION • ISL • SPEECH',
    desc: 'An accessibility-focused web application designed to support communication around Indian Sign Language (ISL). Brings camera-based MediaPipe hand tracking, a curated sign vocabulary, text and voice interaction, translation support across Indian languages, and guided practice into one approachable experience.',
    arch: 'React / TypeScript / MediaPipe / Web Speech APIs',
    time: 'Prototype Architecture',
    impact: 'Gesture, Voice & Text Bridge',
    badge: 'THEME / GESTURE · VOICE · TEXT',
    link: 'mailto:deepak843161.438@gmail.com?subject=Deepak%20R%20SignBridge%20Inquiry'
  },
  arenahub: {
    id: 'PROJECT 03 // FULL-STACK',
    title: 'ARENAHUB',
    tags: 'SPORTS PLATFORM • BOOKING ENGINE • RBAC',
    desc: 'A multi-role sports venue discovery and court-booking platform for players, arena owners, and administrators. Connects the full journey: players discover verified venues (badminton, turf), select valid time slots, prevent overlaps, while owners manage venue details and admins verify listings and payments.',
    arch: 'Full-Stack Web / Role RBAC / Payments',
    time: 'Complete Platform',
    impact: 'Discover · Reserve · Play',
    badge: 'THEME / MATCHDAY GRID',
    link: 'mailto:deepak843161.438@gmail.com?subject=Deepak%20R%20ArenaHub%20Inquiry'
  },
  fieldtelemetry: {
    id: 'PROJECT 04 // RESEARCH',
    title: 'CONNECTED FIELD SYSTEM',
    tags: 'SYSTEMS • SENSOR CONTOURS • TELEMETRY',
    desc: 'Field telemetry testbed recording coordinates (13°02\'N / 77°35\'E), system readiness status (0.94), and live sensor stream diagnostics. Designed for remote IoT resilience, environmental monitoring, and connected device experimentation.',
    arch: 'C++ / ESP32 / Wireless Bus / Hardware Sensors',
    time: 'Active Field Telemetry',
    impact: 'Readiness: 0.94 // Live System',
    badge: 'FIELD NOTE / 2026',
    link: 'mailto:deepak843161.438@gmail.com?subject=Deepak%20R%20Field%20Telemetry'
  },
};

const projectModal = document.getElementById('project-modal');
const modalId = document.getElementById('modal-id');
const modalTitle = document.getElementById('modal-title');
const modalTags = document.getElementById('modal-tags');
const modalDesc = document.getElementById('modal-desc');
const modalArch = document.getElementById('modal-arch');
const modalTime = document.getElementById('modal-time');
const modalImpact = document.getElementById('modal-impact');
const modalBadge = document.getElementById('modal-badge');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalActionBtn = document.getElementById('modal-action-btn');

document.querySelectorAll('.project-card').forEach((card) => {
  card.addEventListener('click', () => {
    const key = card.dataset.project;
    const data = PROJECTS_DATA[key];
    if (!data) return;

    modalId.textContent = data.id;
    modalTitle.textContent = data.title;
    modalTags.textContent = data.tags;
    modalDesc.textContent = data.desc;
    modalArch.textContent = data.arch;
    modalTime.textContent = data.time;
    modalImpact.textContent = data.impact;
    modalBadge.textContent = data.badge;
    if (modalActionBtn) {
      modalActionBtn.href = data.link || 'mailto:deepak843161.438@gmail.com';
    }

    projectModal.classList.add('open');
    sound.playClick();
  });
});

modalCloseBtn?.addEventListener('click', () => {
  projectModal.classList.remove('open');
  sound.playClick();
});

projectModal?.addEventListener('click', (e) => {
  if (e.target === projectModal) {
    projectModal.classList.remove('open');
  }
});

// =========================================================================
// 10. TRANSMISSION INQUIRY MODAL & FORM
// =========================================================================
const inquiryModal = document.getElementById('inquiry-modal');
const openInquiryBtn = document.getElementById('open-inquiry-btn');
const inquiryCloseBtn = document.getElementById('inquiry-close-btn');
const inquiryForm = document.getElementById('inquiry-form');

openInquiryBtn?.addEventListener('click', () => {
  inquiryModal.classList.add('open');
  sound.playClick();
});

inquiryCloseBtn?.addEventListener('click', () => {
  inquiryModal.classList.remove('open');
  sound.playClick();
});

inquiryModal?.addEventListener('click', (e) => {
  if (e.target === inquiryModal) {
    inquiryModal.classList.remove('open');
  }
});

inquiryForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  sound.playSuccess();
  showToast('Brief dispatched! Deepak R will respond shortly.');
  inquiryModal.classList.remove('open');
  inquiryForm.reset();
});

// Close modals on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    projectModal.classList.remove('open');
    inquiryModal.classList.remove('open');
  }
});

// =========================================================================
// 11. ONE-CLICK EMAIL COPY & TOAST
// =========================================================================
const copyEmailBox = document.getElementById('copy-email-box');
const copyEmailBtn = document.getElementById('copy-email-btn');

function copyEmail() {
  const email = 'deepak843161.438@gmail.com';
  navigator.clipboard.writeText(email).then(() => {
    sound.playSuccess();
    showToast('deepak843161.438@gmail.com copied to clipboard!');
  });
}

copyEmailBox?.addEventListener('click', copyEmail);
copyEmailBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  copyEmail();
});

let toastTimer = null;
function showToast(msg) {
  if (!toast) return;
  toastMsg.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// =========================================================================
// 12. LAB SHADER / SENSOR INTERACTIVE PULSE BUTTON
// =========================================================================
const runGlslBtn = document.getElementById('run-glsl-btn');
runGlslBtn?.addEventListener('click', () => {
  sound.playSuccess();
  showToast('ESP32 Sensor Pulse Injected: Precision Nozzle Triggered [13°02\'N, 77°35\'E]!');
  
  // Quick canvas chromatic pulse
  canvas.style.filter = 'contrast(1.4) saturate(1.8) hue-rotate(90deg)';
  setTimeout(() => {
    canvas.style.filter = 'contrast(1.05) saturate(1.08)';
  }, 350);
});

// =========================================================================
// 13. INITIALIZATION
// =========================================================================
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
streamAllFrames();
