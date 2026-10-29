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
  storageSummary: document.getElementById('storageSummary'),
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
  valGridTie: document.getElementById('valGridTie'),

  // Exhibition Booth Additions
  fsBtn: document.getElementById('fsBtn'),
  resetBtn: document.getElementById('resetBtn'),
  tickerDot: document.getElementById('tickerDot'),
  tickerText: document.getElementById('tickerText'),

  // Live Rating & Report Card Modal Elements
  badgeRating: document.getElementById('badgeRating'),
  gridGrade: document.getElementById('gridGrade'),
  ratingEmoji: document.getElementById('ratingEmoji'),
  reportModal: document.getElementById('reportModal'),
  reportCardWrapper: document.getElementById('reportCardWrapper'),
  reportStampBadge: document.getElementById('reportStampBadge'),
  reportStampLetter: document.getElementById('reportStampLetter'),
  reportStampCaption: document.getElementById('reportStampCaption'),
  reportTitleText: document.getElementById('reportTitleText'),
  reportTamilTitleText: document.getElementById('reportTamilTitleText'),
  repScore: document.getElementById('repScore'),
  repSolarShare: document.getElementById('repSolarShare'),
  repAirClean: document.getElementById('repAirClean'),
  repTownMood: document.getElementById('repTownMood'),
  repBlackouts: document.getElementById('repBlackouts'),
  repSmogTime: document.getElementById('repSmogTime'),
  reportVerdictText: document.getElementById('reportVerdictText'),
  reportExitBtn: document.getElementById('reportExitBtn'),
  reportCloseBtn: document.getElementById('reportCloseBtn'),
  reportResetBtn: document.getElementById('reportResetBtn')
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
let lastTelemetry = null;
let challengeStats = {
  samples: 0,
  totalHappiness: 0,
  totalAir: 0,
  solarSeconds: 0,
  blackoutSeconds: 0,
  smogSeconds: 0
};

function handleTelemetry(t) {
  lastTelemetry = t;

  // Update Badges
  elements.townHappiness.textContent = `${t.townHappiness}%`;
  elements.townHappiness.className = t.townHappiness >= 80 ? 'badge-stat text-green' : (t.townHappiness >= 50 ? 'badge-stat text-gold' : 'badge-stat text-red');
  elements.townEmoji.textContent = t.townHappiness >= 80 ? '😃' : (t.townHappiness >= 50 ? '😐' : '😰');

  elements.airQuality.textContent = t.airCleanliness >= 80 ? '100% Clean' : (t.airCleanliness >= 40 ? 'Moderate' : 'Smoggy 😷');
  elements.airQuality.className = t.airCleanliness >= 80 ? 'badge-stat text-green' : (t.airCleanliness >= 40 ? 'badge-stat text-gold' : 'badge-stat text-red');
  elements.airEmoji.textContent = t.airCleanliness >= 80 ? '🌿' : (t.airCleanliness >= 40 ? '⛅' : '🏭');

  elements.fanRpm.textContent = `${t.fanRpm} RPM`;
  elements.playerScore.textContent = t.ecoScore.toLocaleString();

  // Dynamic Battery Storage UI (Visual Charge / Drain Gauge)
  if (elements.sliderStorage && document.activeElement !== elements.sliderStorage) {
    elements.sliderStorage.value = Math.round(t.storageMwh);
  }
  if (elements.valStorage) {
    if (t.batteryMode === 'charging') {
      elements.valStorage.innerHTML = `${Math.round(t.storageMwh)} MWh <span style="color:#4ade80;font-size:0.75rem;font-weight:700;">▲ +${t.batteryFlowMW} MW</span>`;
    } else if (t.batteryMode === 'discharging') {
      elements.valStorage.innerHTML = `${Math.round(t.storageMwh)} MWh <span style="color:#f87171;font-size:0.75rem;font-weight:700;">▼ -${t.batteryFlowMW} MW</span>`;
    } else if (t.storageMwh <= 0) {
      elements.valStorage.innerHTML = `<span style="color:#ef4444;font-weight:700;">0 MWh (EMPTY)</span>`;
    } else {
      elements.valStorage.textContent = `${Math.round(t.storageMwh)} MWh`;
    }
  }
  if (elements.storageSummary) {
    if (t.batteryMode === 'charging') {
      elements.storageSummary.textContent = 'CHARGING';
      elements.storageSummary.className = 'slider-summary-pill';
      elements.storageSummary.style.borderColor = '#4ade80';
      elements.storageSummary.style.color = '#4ade80';
    } else if (t.batteryMode === 'discharging') {
      elements.storageSummary.textContent = 'DRAINING';
      elements.storageSummary.className = 'slider-summary-pill';
      elements.storageSummary.style.borderColor = '#f87171';
      elements.storageSummary.style.color = '#f87171';
    } else if (t.storageMwh <= 0) {
      elements.storageSummary.textContent = 'EMPTY 0%';
      elements.storageSummary.className = 'slider-summary-pill pill-danger';
      elements.storageSummary.style.borderColor = '#ef4444';
      elements.storageSummary.style.color = '#ef4444';
    } else {
      elements.storageSummary.textContent = 'RESERVE';
      elements.storageSummary.className = 'slider-summary-pill';
      elements.storageSummary.style.borderColor = '';
      elements.storageSummary.style.color = '';
    }
  }

  // Update Live Grid Grade Badge
  if (elements.gridGrade) {
    elements.gridGrade.textContent = `${t.grade} ${t.gradeTitle.split(' ')[0]}`;
    elements.gridGrade.className = `badge-stat ${t.grade === 'A+' || t.grade === 'A' ? 'text-green' : (t.grade === 'B' ? 'text-cyan' : (t.grade === 'C' ? 'text-gold' : (t.grade === 'D' ? 'text-orange' : 'text-red')))}`;
  }
  if (elements.ratingEmoji) {
    elements.ratingEmoji.textContent = (t.grade === 'A+' || t.grade === 'A') ? '🏆' : (t.grade === 'B' ? '⚡' : (t.grade === 'C' ? '⚠️' : (t.grade === 'D' ? '🏭' : '💥')));
  }
  if (elements.badgeRating) {
    elements.badgeRating.className = (t.isTotalBlackout || t.grade === 'F') ? 'badge-item grid-rating-badge alert-blackout' : 'badge-item grid-rating-badge';
  }

  // Update Live Exhibition Marquee Ticker
  if (elements.tickerText && elements.tickerDot) {
    if (t.isTotalBlackout || t.grade === 'F') {
      elements.tickerDot.textContent = '🚨';
      elements.tickerText.innerHTML = `<strong>🚨 பேரழிவு மின்தடை (GRADE F - TOTAL BLACKOUT):</strong> மின் உற்பத்தி சுழியம் (0 MW)! நகரம் முழுவதும் மின்தடை! உடனே சூரிய மின்சக்தி அல்லது பேட்டரியை இயக்கவும்!`;
    } else if (t.finalSmog >= 65 || t.grade === 'D') {
      elements.tickerDot.textContent = '🏭';
      elements.tickerText.innerHTML = `<strong>🏭 நச்சுப் புகை அபாயம் (GRADE D - TOXIC SMOG):</strong> வடிகட்டி இன்றி நிலக்கரி ஆலை இயங்குகிறது! காற்று மாசடைந்துள்ளது (${t.airCleanliness}%)! வடிகட்டியை (Scrubber) கூட்டவும்!`;
    } else if (t.brownoutCount >= 2) {
      elements.tickerDot.textContent = '🔴';
      elements.tickerText.innerHTML = `<strong>⚠️ மின் தட்டுப்பாடு (GRID BROWNOUT - GRADE C):</strong> மின்னழுத்தம் குறைந்துள்ளது (${engine.sliderVoltage}V)! வீடுகளில் மின்வெட்டு • சோலார் அல்லது பேட்டரி அளவை உயர்த்தவும்!`;
    } else if (t.isSolar) {
      elements.tickerDot.textContent = '🟢';
      elements.tickerText.innerHTML = `<strong>☀️ நேரடி நிலை (LIVE - GRADE ${t.grade}):</strong> கமுதி சூரிய பூங்கா ${t.activeSupplyMW} MW • 100% தூய காற்று • 6 பிரிவுகளும் 230V முழு மின்சாரத்தில் இயங்குகின்றன!`;
    } else {
      elements.tickerDot.textContent = '🏭';
      elements.tickerText.innerHTML = `<strong>🌙 நிலக்கரி இயக்கம் (COAL - GRADE ${t.grade}):</strong> மேட்டூர் அனல் நிலையம் ${t.activeSupplyMW} MW (${engine.sliderCoalFire}%) • இழப்பு ${engine.currentLineLossPct}% • ஸ்க்ரப்பரை 100% வைக்கவும்!`;
    }
  }

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
  } else if (hours24 >= 16 && hours24 < 18) {
    body.className = 'theme-dusk';
    phase = 'Sunset / Thermal Ramp';
  } else if (hours24 >= 18 && hours24 < 22) {
    body.className = 'theme-coal';
    phase = 'Evening Peak Coal (Mettur)';
  } else if (hours24 >= 22 || hours24 < 5) {
    body.className = 'theme-night';
    phase = 'Night Baseload';
  } else {
    body.className = 'theme-dawn';
    phase = 'Sunrise Awakening';
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
  // Fullscreen Exhibition Mode Toggle
  if (elements.fsBtn) {
    elements.fsBtn.addEventListener('click', () => {
      sfx.playPop();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        elements.fsBtn.innerHTML = '<span>📺 Exit Fullscreen</span>';
      } else {
        document.exitFullscreen().catch(() => {});
        elements.fsBtn.innerHTML = '<span>📺 Fullscreen</span>';
      }
    });
  }

  // Reset to Optimal Booth Baseline
  if (elements.resetBtn) {
    elements.resetBtn.addEventListener('click', () => {
      sfx.playSolarChime();
      resetToDefaultBooth();
    });
  }

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

  // Report Card Modal Listeners
  if (elements.reportCloseBtn) {
    elements.reportCloseBtn.addEventListener('click', () => {
      sfx.playPop();
      if (elements.reportModal) elements.reportModal.classList.add('hidden');
    });
  }

  if (elements.reportExitBtn) {
    elements.reportExitBtn.addEventListener('click', () => {
      if (elements.reportModal) elements.reportModal.classList.add('hidden');
    });
  }

  if (elements.reportResetBtn) {
    elements.reportResetBtn.addEventListener('click', () => {
      sfx.playSolarChime();
      if (elements.reportModal) elements.reportModal.classList.add('hidden');
      resetToDefaultBooth();
    });
  }

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
    const loadLabels = ['0% (Off)', '25% (Eco)', '50% (Normal)', '75% (Heavy)', '100% (Peak)'];
    elements.sliderTownLoad.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      elements.valTownLoad.textContent = loadLabels[val] || '0% (Off)';
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
      elements.valVoltage.textContent = val === 0 ? '0V (Off)' : `${val}V`;
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

  // Reset challenge stats
  challengeStats = {
    samples: 0,
    totalHappiness: 0,
    totalAir: 0,
    solarSeconds: 0,
    blackoutSeconds: 0,
    smogSeconds: 0
  };

  // Start at peak daytime (10:30 AM) so solar harvesting is optimal!
  engine.setTime(630); // 10:30 AM Peak Daytime
  engine.autoAdvanceTime = true; // Advance time smoothly through the daytime
  engine.isRunning = true;

  if (challengeTimer) clearInterval(challengeTimer);
  challengeTimer = setInterval(() => {
    challengeTime--;
    elements.gameTimer.textContent = `${challengeTime}s`;
    engine.setTime(engine.timeMinutes + 10); // +10 min/s: runs from 10:30 AM to 03:30 PM (prime sunny day!)

    // Sample telemetry
    if (lastTelemetry) {
      challengeStats.samples++;
      challengeStats.totalHappiness += lastTelemetry.townHappiness;
      challengeStats.totalAir += lastTelemetry.airCleanliness;
      if (lastTelemetry.isSolar) challengeStats.solarSeconds++;
      // Count genuine blackout (when supply cannot meet demand or substation is off)
      if (lastTelemetry.isTotalBlackout || (lastTelemetry.housesLitCount <= 1 && lastTelemetry.totalDemand > 0)) {
        challengeStats.blackoutSeconds++;
      }
      if (lastTelemetry.finalSmog >= 45 || lastTelemetry.airCleanliness <= 35) {
        challengeStats.smogSeconds++;
      }
    }

    if (challengeTime <= 0) {
      clearInterval(challengeTimer);
      challengeRunning = false;
      engine.autoAdvanceTime = false; // Lock time again after challenge
      elements.challengeAlert.classList.add('hidden');
      sfx.playSolarChime();

      finishChallenge();
    }
  }, 1000);
}

function finishChallenge() {
  const samples = Math.max(1, challengeStats.samples);
  const avgHappiness = Math.round(challengeStats.totalHappiness / samples);
  const avgAir = Math.round(challengeStats.totalAir / samples);
  const solarShare = Math.round((challengeStats.solarSeconds / samples) * 100);
  const blackoutTime = challengeStats.blackoutSeconds;
  const smogTime = challengeStats.smogSeconds;
  const finalScore = Math.round(engine.ecoScore);

  // Performance Index (0 to 100)
  // 1. Solar Clean Energy: up to 35 pts
  const solarPts = (solarShare / 100) * 35;
  // 2. Air Purity: up to 25 pts
  const airPts = (avgAir / 100) * 25;
  // 3. Town Satisfaction & Power Uptime: up to 30 pts
  const uptimeRatio = Math.max(0, 1.0 - (blackoutTime / samples));
  const townPts = ((avgHappiness * 0.5 + uptimeRatio * 100 * 0.5) / 100) * 30;
  // 4. Eco Points: up to 10 pts
  const scorePts = Math.min(10, (finalScore / 300) * 10);

  const totalGridScore = Math.round(solarPts + airPts + townPts + scorePts);

  let grade = 'A';
  let gradeClass = 'grade-a';
  let stampClass = '';
  let title = '';
  let tamilTitle = '';
  let caption = '';
  let verdict = '';

  // Fair, achievable, and educational grading
  if (totalGridScore >= 80 || (solarShare >= 85 && avgAir >= 85 && blackoutTime <= 8)) {
    grade = 'A+';
    gradeClass = 'grade-a';
    stampClass = '';
    caption = 'ELITE MASTER';
    title = 'OUTSTANDING CLEAN GRID MASTER!';
    tamilTitle = 'தலைசிறந்த தூய மின் கட்டமைப்பு சாதனையாளர்';
    verdict = `🌟 MASTERFUL LEADERSHIP! You scored ${totalGridScore}/100! With ${solarShare}% clean solar energy, crystal-clear air (${avgAir}%), and strong town satisfaction, you proved that renewable solar energy is the triumphant choice for Tamil Nadu!`;
  } else if (totalGridScore >= 65 || (solarShare >= 60 && avgAir >= 70 && blackoutTime <= 12)) {
    grade = 'A';
    gradeClass = 'grade-a';
    stampClass = '';
    caption = 'CLEAN CHAMPION';
    title = 'CLEAN ENERGY CHAMPION!';
    tamilTitle = 'தூய ஆற்றல் சாம்பியன்';
    verdict = `👏 EXCELLENT PERFORMANCE! You scored ${totalGridScore}/100! Strong solar delivery kept the town energized with clean air. A few minor grid adjustments will achieve absolute perfection!`;
  } else if (smogTime >= 10 && avgAir < 40) {
    grade = 'D';
    gradeClass = 'grade-d';
    stampClass = 'stamp-d';
    caption = 'TOXIC SMOG DISASTER';
    title = 'ENVIRONMENTAL CATASTROPHE!';
    tamilTitle = 'நச்சுப் புகை சுற்றுச்சூழல் பேரழிவு';
    verdict = `🏭 SEVERE POLLUTION DISASTER! You ran the thermal coal plant at full blast without scrubbers! Toxic soot covered the town for ${smogTime} seconds, choking citizens and dropping air quality to ${avgAir}%. Turn on chimney scrubbers or switch to Kamuthi Solar!`;
  } else if (totalGridScore >= 45 || solarShare >= 40) {
    grade = 'B';
    gradeClass = 'grade-b';
    stampClass = 'stamp-b';
    caption = 'PASSABLE GRID';
    title = 'LIGHTS ON, BUT COULD BE CLEANER!';
    tamilTitle = 'நிலக்கரி சார்ந்த மின் உற்பத்தி';
    verdict = `⚡ SOLID OPERATION! You scored ${totalGridScore}/100! You kept the town powered, but relied on thermal coal (${100 - solarShare}%). Increase solar harvesting to cut carbon emissions!`;
  } else if (totalGridScore >= 25 || blackoutTime < 22) {
    grade = 'C';
    gradeClass = 'grade-c';
    stampClass = 'stamp-c';
    caption = 'UNSTABLE GRID';
    title = 'BROWNOUT INSTABILITY';
    tamilTitle = 'மின் தட்டுப்பாடு மற்றும் குறைந்த மின்னழுத்தம்';
    verdict = `⚠️ UNSTABLE GRID! You scored ${totalGridScore}/100. Frequent brownouts and voltage dips interrupted power to homes and farms. Tune substation voltage to 230V and keep solar harvest balanced!`;
  } else {
    // Only true abandonment / total failure triggers Grade F!
    grade = 'F';
    gradeClass = 'grade-f';
    stampClass = 'stamp-f';
    caption = 'TOTAL GRID COLLAPSE';
    title = 'CATASTROPHIC BLACKOUT!';
    tamilTitle = 'பேரழிவு மின்கட்டமைப்பு வீழ்ச்சி';
    verdict = `🤦‍♂️ TOTAL SYSTEM FAILURE! The town was left in complete blackout for ${blackoutTime} seconds (${totalGridScore}/100). Zero power was delivered to schools and clinics. Turn on Substation voltage (230V) and Solar power to energize Tamil Nadu!`;
  }

  // Populate Report Card Modal
  if (elements.reportCardWrapper) {
    elements.reportCardWrapper.className = `modal-card report-card ${gradeClass}`;
  }
  if (elements.reportStampBadge) {
    elements.reportStampBadge.className = `report-stamp-badge ${stampClass}`;
  }
  if (elements.reportStampLetter) elements.reportStampLetter.textContent = grade;
  if (elements.reportStampCaption) elements.reportStampCaption.textContent = caption;
  if (elements.reportTitleText) elements.reportTitleText.textContent = title;
  if (elements.reportTamilTitleText) elements.reportTamilTitleText.textContent = tamilTitle;
  if (elements.repScore) elements.repScore.textContent = finalScore.toLocaleString();
  if (elements.repSolarShare) elements.repSolarShare.textContent = `${solarShare}%`;
  if (elements.repAirClean) elements.repAirClean.textContent = `${avgAir}%`;
  if (elements.repTownMood) elements.repTownMood.textContent = `${avgHappiness}%`;
  if (elements.repBlackouts) elements.repBlackouts.textContent = `${blackoutTime}s`;
  if (elements.repSmogTime) elements.repSmogTime.textContent = `${smogTime}s`;
  if (elements.reportVerdictText) elements.reportVerdictText.textContent = verdict;

  // Reveal Report Card Modal
  if (elements.reportModal) {
    elements.reportModal.classList.remove('hidden');
  }

  // Visual popup banner on canvas
  if (grade === 'F' || grade === 'D') {
    engine.popTexts.push({
      x: engine.canvas.width / (2 * engine.dpr),
      y: 110,
      text: `🚨 AUDIT RESULT: GRADE ${grade} (${caption})`,
      color: '#ef4444',
      alpha: 1.0,
      life: 0,
      maxLife: 3.5
    });
  } else {
    engine.popTexts.push({
      x: engine.canvas.width / (2 * engine.dpr),
      y: 110,
      text: `🎉 AUDIT RESULT: GRADE ${grade}! ${title}`,
      color: '#34d399',
      alpha: 1.0,
      life: 0,
      maxLife: 3.5
    });
  }
}

function resetToDefaultBooth() {
  engine.setTime(720); // 12:00 PM Noon
  engine.ecoScore = 0;
  engine.setSlider('sunshine', 0);
  engine.setSlider('storage', 0);
  engine.setSlider('coalFire', 0);
  engine.setSlider('scrubber', 0);
  engine.setSlider('townLoad', 0);
  engine.setSlider('agriPumps', 0);
  engine.setSlider('voltage', 0);
  engine.setSlider('gridTie', 0);

  // Sync UI sliders to 0%
  if (elements.sliderSunshine) elements.sliderSunshine.value = 0;
  if (elements.valSunshine) elements.valSunshine.textContent = '0%';
  if (elements.sliderStorage) elements.sliderStorage.value = 0;
  if (elements.valStorage) elements.valStorage.textContent = '0 MWh';
  if (elements.sliderCoalFire) elements.sliderCoalFire.value = 0;
  if (elements.valCoalFire) elements.valCoalFire.textContent = '0%';
  if (elements.sliderScrubber) elements.sliderScrubber.value = 0;
  if (elements.valScrubber) elements.valScrubber.textContent = '0%';
  if (elements.sliderTownLoad) elements.sliderTownLoad.value = 0;
  if (elements.valTownLoad) elements.valTownLoad.textContent = '0% (Off)';
  if (elements.sliderAgriPumps) elements.sliderAgriPumps.value = 0;
  if (elements.valAgriPumps) elements.valAgriPumps.textContent = '0%';
  if (elements.sliderVoltage) elements.sliderVoltage.value = 0;
  if (elements.valVoltage) elements.valVoltage.textContent = '0V (Off)';
  if (elements.sliderGridTie) elements.sliderGridTie.value = 0;
  if (elements.valGridTie) elements.valGridTie.textContent = '0 MW';

  engine.popTexts.push({
    x: engine.canvas.width / (2 * engine.dpr),
    y: 120,
    text: '🔄 BOOTH RESET: All settings at 0% (அனைத்தும் சுழியம்)!',
    color: '#38bdf8',
    alpha: 1.0,
    life: 0,
    maxLife: 2.0
  });

  updateClock(720);
}

function bootGame() {
  initEvents();
  engine.autoAdvanceTime = false;
  resetToDefaultBooth(); // Guarantee all 8 sliders start at 0%
  engine.start();
  updateClock(engine.timeMinutes);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGame);
} else {
  bootGame();
}
