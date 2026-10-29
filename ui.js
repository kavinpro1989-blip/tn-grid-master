/**
 * ============================================================================
 * TN GRID MASTER: SCHOOL EDITION - UI CONTROLLER (ui.js)
 * Manages game loops, audio sound synthesis, 30s challenge mode,
 * hero buttons, and the interactive hardware layer inspector.
 * ============================================================================
 */

import { PowerGridEngine } from './engine.js';

const elements = {
  canvas: document.getElementById('gameCanvas'),
  timeRange: document.getElementById('timeRange'),
  clockDigits: document.getElementById('clockDigits'),
  clockLabel: document.getElementById('clockLabel'),
  playToggleBtn: document.getElementById('playToggleBtn'),
  playIcon: document.getElementById('playIcon'),
  challengeBtn: document.getElementById('challengeBtn'),
  challengeAlert: document.getElementById('challengeAlert'),
  gameTimer: document.getElementById('gameTimer'),
  inspectBtn: document.getElementById('inspectBtn'),
  btnSolarNoon: document.getElementById('btnSolarNoon'),
  btnCoalPeak: document.getElementById('btnCoalPeak'),
  townHappiness: document.getElementById('townHappiness'),
  townEmoji: document.getElementById('townEmoji'),
  airQuality: document.getElementById('airQuality'),
  airEmoji: document.getElementById('airEmoji'),
  fanRpm: document.getElementById('fanRpm'),
  playerScore: document.getElementById('playerScore'),
  guideBtn: document.getElementById('guideBtn'),
  guideModal: document.getElementById('guideModal'),
  guideCloseBtn: document.getElementById('guideCloseBtn'),
  guideDismissBtn: document.getElementById('guideDismissBtn'),
  sunDisc: document.getElementById('sunDisc'),
  hardwareCard: document.getElementById('hardwareCard'),
  hwIcon: document.getElementById('hwIcon'),
  hwTitle: document.getElementById('hwTitle'),
  hwCloseBtn: document.getElementById('hwCloseBtn'),
  tabSolarHw: document.getElementById('tabSolarHw'),
  tabCoalHw: document.getElementById('tabCoalHw'),
  hwContent: document.getElementById('hwContent'),

  // 🎛️ 8 Manual Control Levers (Master of Control)
  sliderSunshine: document.getElementById('sliderSunshine'),
  valSunshine: document.getElementById('valSunshine'),
  sliderStorage: document.getElementById('sliderStorage'),
  valStorage: document.getElementById('valStorage'),
  sliderCoalFire: document.getElementById('sliderCoalFire'),
  valCoalFire: document.getElementById('valCoalFire'),
  sliderScrubber: document.getElementById('sliderScrubber'),
  valScrubber: document.getElementById('valScrubber'),
  sliderTownLoad: document.getElementById('sliderTownLoad'),
  valTownLoad: document.getElementById('valTownLoad'),
  sliderAgriPumps: document.getElementById('sliderAgriPumps'),
  valAgriPumps: document.getElementById('valAgriPumps'),
  sliderVoltage: document.getElementById('sliderVoltage'),
  valVoltage: document.getElementById('valVoltage'),
  sliderGridTie: document.getElementById('sliderGridTie'),
  valGridTie: document.getElementById('valGridTie')
};

// Web Audio Sound Synthesizer (Permanently Silenced per User Request)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = true;
  }

  init() {}
  toggle() { return false; }
  playSolarChime() {}
  playCoalRumble() {}
  playPop() {}
}

const sfx = new SoundFX();
const engine = new PowerGridEngine(elements.canvas, handleTelemetry);

let challengeRunning = false;
let challengeTime = 30;
let challengeTimer = null;
let currentHwTab = 'solar';

function handleTelemetry(t) {
  // Update Badges
  elements.townHappiness.textContent = `${t.townHappiness}%`;
  elements.townHappiness.className = t.townHappiness >= 80 ? 'badge-stat text-green' : (t.townHappiness >= 50 ? 'badge-stat text-gold' : 'badge-stat text-red');
  elements.townEmoji.textContent = t.townHappiness >= 80 ? '😃' : (t.townHappiness >= 50 ? '😐' : '😰');

  elements.airQuality.textContent = t.airCleanliness >= 80 ? '100% Clean' : (t.airCleanliness >= 40 ? 'Moderate' : 'Smoggy 😷');
  elements.airQuality.className = t.airCleanliness >= 80 ? 'badge-stat text-green' : (t.airCleanliness >= 40 ? 'badge-stat text-gold' : 'badge-stat text-red');
  elements.airEmoji.textContent = t.airCleanliness >= 80 ? '🌿' : (t.airCleanliness >= 40 ? '⛅' : '🏭');

  elements.fanRpm.textContent = `${t.fanRpm} RPM`;
  elements.playerScore.textContent = t.ecoScore.toLocaleString();

  // Update Clock
  updateClock(t.timeMinutes);
}

function updateClock(totalMinutes) {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);

  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const padMin = minutes.toString().padStart(2, '0');

  elements.clockDigits.textContent = `${hours12}:${padMin} ${meridiem}`;

  if (document.activeElement !== elements.timeRange) {
    elements.timeRange.value = Math.round(totalMinutes).toString();
  }

  const body = document.body;
  let phase = '';

  if (hours24 >= 8 && hours24 < 16) {
    body.className = 'theme-solar';
    phase = 'Peak Solar Noon (Kamuthi)';
    elements.btnSolarNoon.classList.add('active');
    elements.btnCoalPeak.classList.remove('active');
  } else if (hours24 >= 16 && hours24 < 18) {
    body.className = 'theme-dusk';
    phase = 'Sunset / Thermal Ramp';
    elements.btnSolarNoon.classList.remove('active');
    elements.btnCoalPeak.classList.remove('active');
  } else if (hours24 >= 18 && hours24 < 22) {
    body.className = 'theme-coal';
    phase = 'Evening Peak Coal (Mettur)';
    elements.btnCoalPeak.classList.add('active');
    elements.btnSolarNoon.classList.remove('active');
  } else if (hours24 >= 22 || hours24 < 5) {
    body.className = 'theme-night';
    phase = 'Night Baseload';
    elements.btnSolarNoon.classList.remove('active');
    elements.btnCoalPeak.classList.remove('active');
  } else {
    body.className = 'theme-dawn';
    phase = 'Sunrise Awakening';
    elements.btnSolarNoon.classList.remove('active');
    elements.btnCoalPeak.classList.remove('active');
  }

  elements.clockLabel.textContent = `${phase}${engine.autoAdvanceTime ? '' : ' • 🔒 Locked'}`;

  // Move Sun across sky
  if (hours24 >= 6 && hours24 <= 18) {
    const dayProgress = (totalMinutes - 360) / 720;
    const sunLeft = 10 + dayProgress * 75;
    const sunTop = 45 - Math.sin(dayProgress * Math.PI) * 35;
    elements.sunDisc.style.left = `${sunLeft}%`;
    elements.sunDisc.style.top = `${sunTop}%`;
  }
}

// Hardware Layer Inspector (From old project)
const hardwareData = {
  solar: [
    { name: 'Tempered Anti-Reflective Glass', role: 'Protects cells and transmits 95%+ incident sunlight' },
    { name: 'EVA Encapsulant Sheets', role: 'Damp-heat protection and optical index matching' },
    { name: 'TOPCon n-Type Silicon Cells', role: 'Core semiconductor converting photons directly into DC electrons' },
    { name: 'Silver Grid Busbars', role: 'Low-resistance electron collector contacts' },
    { name: 'Weatherproof Backsheet', role: 'High electrical dielectric insulation and UV barrier' }
  ],
  coal: [
    { name: 'Coal Pulverizer Mills', role: 'Grinds raw lump coal into fine 75-micron powder' },
    { name: 'Supercritical Boiler Furnace', role: 'Burns coal at 1,400°C generating high-pressure steam' },
    { name: 'Multi-Stage Steam Turbines', role: 'Rotates generator at 3,600 RPM using thermal expansion' },
    { name: 'Cooling Towers', role: 'Dissipates waste Rankine cycle heat via evaporative cooling' },
    { name: 'Electrostatic Precipitator & Chimney', role: 'Captures fly ash before releasing flue gases' }
  ]
};

function renderHardwareTab(tabKey) {
  currentHwTab = tabKey;
  if (tabKey === 'solar') {
    elements.tabSolarHw.classList.add('active');
    elements.tabCoalHw.classList.remove('active');
    elements.hwIcon.textContent = '☀️';
    elements.hwTitle.textContent = 'Kamuthi Solar Module Hardware';
  } else {
    elements.tabCoalHw.classList.add('active');
    elements.tabSolarHw.classList.remove('active');
    elements.hwIcon.textContent = '🏭';
    elements.hwTitle.textContent = 'Mettur Coal Boiler Hardware';
  }

  const items = hardwareData[tabKey];
  elements.hwContent.innerHTML = items.map((item, idx) => `
    <div style="background: rgba(2, 6, 23, 0.6); padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
      <div style="color: ${tabKey === 'solar' ? '#4ade80' : '#f87171'}; font-weight: bold; margin-bottom: 2px;">
        ${idx + 1}. ${item.name}
      </div>
      <div style="color: #cbd5e1; font-size: 0.74rem;">${item.role}</div>
    </div>
  `).join('');
}

function initEvents() {
  // Hero Button 1: Solar Noon
  elements.btnSolarNoon.addEventListener('click', () => {
    sfx.playSolarChime();
    engine.setTime(720);
    updateClock(720);
  });

  // Hero Button 2: Coal Evening
  elements.btnCoalPeak.addEventListener('click', () => {
    sfx.playCoalRumble();
    engine.setTime(1170);
    updateClock(1170);
  });

  // Time Slider
  elements.timeRange.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    engine.setTime(val);
    updateClock(val);
  });

  // Play / Pause (Toggles Auto-Clock Advance)
  elements.playToggleBtn.addEventListener('click', () => {
    sfx.playPop();
    engine.autoAdvanceTime = !engine.autoAdvanceTime;
    elements.playIcon.textContent = engine.autoAdvanceTime ? '▶️ Auto-Clock' : '🔒 Clock Locked';
    updateClock(engine.timeMinutes);
  });

  // 30s Challenge
  elements.challengeBtn.addEventListener('click', () => {
    startChallenge();
  });

  // Hardware Inspector
  elements.inspectBtn.addEventListener('click', () => {
    sfx.playPop();
    renderHardwareTab('solar');
    elements.hardwareCard.style.left = '30px';
    elements.hardwareCard.style.top = '70px';
    elements.hardwareCard.classList.remove('hidden');
  });

  elements.hwCloseBtn.addEventListener('click', () => {
    elements.hardwareCard.classList.add('hidden');
  });

  elements.tabSolarHw.addEventListener('click', () => {
    sfx.playPop();
    renderHardwareTab('solar');
  });

  elements.tabCoalHw.addEventListener('click', () => {
    sfx.playPop();
    renderHardwareTab('coal');
  });

  // Guide Modal
  elements.guideBtn.addEventListener('click', () => {
    sfx.playPop();
    elements.guideModal.classList.remove('hidden');
  });

  elements.guideCloseBtn.addEventListener('click', () => {
    elements.guideModal.classList.add('hidden');
  });

  elements.guideDismissBtn.addEventListener('click', () => {
    sfx.playPop();
    elements.guideModal.classList.add('hidden');
  });

  // Canvas Click
  elements.canvas.addEventListener('click', (e) => {
    sfx.playPop();
    engine.handleCanvasClick(e.clientX, e.clientY);
  });

  // 🎛️ 5 Multi-Sliders Event Listeners
  if (elements.sliderSunshine) {
    elements.sliderSunshine.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valSunshine.textContent = `${val}%`;
      engine.setSlider('sunshine', val);
    });
  }

  if (elements.sliderStorage) {
    elements.sliderStorage.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valStorage.textContent = `${val} MWh`;
      engine.setSlider('storage', val);
    });
  }

  if (elements.sliderCoalFire) {
    elements.sliderCoalFire.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valCoalFire.textContent = `${val}%`;
      engine.setSlider('coalFire', val);
    });
  }

  if (elements.sliderScrubber) {
    elements.sliderScrubber.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valScrubber.textContent = `${val}%`;
      engine.setSlider('scrubber', val);
    });
  }

  if (elements.sliderTownLoad) {
    const loadLabels = ['', 'Eco (Low)', 'Normal', 'Heavy', 'Peak Demand'];
    elements.sliderTownLoad.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valTownLoad.textContent = loadLabels[val] || 'Normal';
      engine.setSlider('townLoad', val);
    });
  }

  if (elements.sliderAgriPumps) {
    elements.sliderAgriPumps.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valAgriPumps.textContent = `${val}%`;
      engine.setSlider('agriPumps', val);
    });
  }

  if (elements.sliderVoltage) {
    elements.sliderVoltage.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valVoltage.textContent = `${val}V`;
      engine.setSlider('voltage', val);
    });
  }

  if (elements.sliderGridTie) {
    elements.sliderGridTie.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valGridTie.textContent = val > 0 ? `+${val} MW` : `${val} MW`;
      engine.setSlider('gridTie', val);
    });
  }
}

function startChallenge() {
  if (challengeRunning) return;
  challengeRunning = true;
  challengeTime = 30;
  elements.challengeAlert.classList.remove('hidden');
  elements.gameTimer.textContent = `${challengeTime}s`;
  sfx.playSolarChime();

  engine.setTime(420); // 07:00 AM Sunrise
  engine.autoAdvanceTime = true; // Advance time during 30s challenge
  engine.isRunning = true;

  if (challengeTimer) clearInterval(challengeTimer);
  challengeTimer = setInterval(() => {
    challengeTime--;
    elements.gameTimer.textContent = `${challengeTime}s`;
    engine.setTime(engine.timeMinutes + 25);

    if (challengeTime <= 0) {
      clearInterval(challengeTimer);
      challengeRunning = false;
      engine.autoAdvanceTime = false; // Lock time again after challenge
      elements.challengeAlert.classList.add('hidden');
      sfx.playSolarChime();

      alert(`🎉 30-SECOND GRID CHALLENGE COMPLETE!\n\nFinal Score: ${Math.round(engine.ecoScore)} Eco Points!\nGrade: A+ Clean Energy Master!\n\nYou kept Tamil Nadu powered and proved why solar energy keeps the town happy and the air fresh!`);
    }
  }, 1000);
}

function bootGame() {
  initEvents();
  engine.autoAdvanceTime = false;
  engine.start();
  updateClock(engine.timeMinutes);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
