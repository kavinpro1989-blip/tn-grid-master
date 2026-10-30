/**
 * ============================================================================
 * TN GRID MASTER: SCHOOL EDITION - CANVAS GAME ENGINE (engine.js)
 * Compiled for browser execution.
 * ============================================================================
 */

export class PowerGridEngine {
  constructor(canvas, onTelemetry) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D context unavailable');
    this.ctx = context;
    this.dpr = window.devicePixelRatio || 1;
    this.animFrameId = null;
    this.lastTime = 0;

    // Game & Sim State
    this.timeMinutes = 720; // Default: 12:00 Noon
    this.isRunning = true;
    this.autoAdvanceTime = false; // 🛑 Time locked! Sun never moves on its own
    this.ecoScore = 0;
    this.fanRotation = 0;

    // 🎛️ 8 Master of Control Levers (Full Grid Authority) - All 0% on Game Start!
    this.sliderSunshine   = 0; // 0% (Solar PV harvest)
    this.sliderStorage    = 0; // 0 MWh (Battery reserve buffer)
    this.sliderCoalFire   = 0; // 0% (Thermal boiler burn rate)
    this.sliderScrubber   = 0; // 0% (Chimney soot precipitator)
    this.sliderTownLoad   = 0; // 0 (0% Off to 100% Peak)
    this.sliderAgriPumps  = 0; // 0% (Agricultural irrigation motors)
    this.sliderVoltage    = 0; // 0V (Substation transformer tap: 0V Off to 250V)
    this.sliderGridTie    = 0; // 0 MW
    this.currentLineLossPct = 0;

    // Grid Graph
    this.nodes = new Map();
    this.packets = [];
    this.smokePuffs = [];
    this.popTexts = [];
    this.ripples = [];
    this.nextPacketId = 1;
    this.packetTimer = 0;

    this.onTelemetry = onTelemetry;

    this.setupDpr();
    this.initTopology();

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.setupDpr();
        this.repositionNodes();
      });
      window.addEventListener('DOMContentLoaded', () => {
        this.setupDpr();
        this.repositionNodes();
      });
      window.addEventListener('load', () => {
        this.setupDpr();
        this.repositionNodes();
      });
    }
  }

  setupDpr() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width > 0 ? rect.width : (typeof window !== 'undefined' ? window.innerWidth : 1100);
    const h = rect.height > 0 ? rect.height : (typeof window !== 'undefined' ? Math.max(300, window.innerHeight - 260) : 480);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  initTopology() {
    this.nodes.clear();

    // 1. Generation Complex (Left)
    this.nodes.set('plant', {
      id: 'plant',
      name: 'Kamuthi Solar Park',
      role: '648 MW • 100% Clean',
      icon: '☀️',
      xNorm: 0.12,
      yNorm: 0.64,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 2. High-Voltage Transmission Pylon 1
    this.nodes.set('pylon1', {
      id: 'pylon1',
      name: 'HV Pylon #1',
      role: '400 kV Transmission',
      icon: '🗼',
      xNorm: 0.30,
      yNorm: 0.48,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 3. Connected Fan Station (Load unit)
    this.nodes.set('fanStation', {
      id: 'fanStation',
      name: 'Connected Fan Station',
      role: 'Town Grid Load Unit',
      icon: '🌀',
      xNorm: 0.46,
      yNorm: 0.52,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 4. TANTRANSCO Main Grid Substation
    this.nodes.set('substation', {
      id: 'substation',
      name: 'TANTRANSCO Substation',
      role: 'Splits Power to Town',
      icon: '🏢',
      xNorm: 0.62,
      yNorm: 0.60,
      x: 0,
      y: 0,
      isLit: true,
      brownoutLevel: 0,
      flickerPhase: 0
    });

    // 5. Six Friendly Town Buildings (Bilingual Tamil & English)
    const houseList = [
      { id: 'house_1', name: 'School (பள்ளி)', role: 'Classrooms & Labs', icon: '🏫', x: 0.77, y: 0.44 },
      { id: 'house_2', name: 'Clinic (மருத்துவமனை)', role: 'Medical Care', icon: '🏥', x: 0.86, y: 0.42 },
      { id: 'house_3', name: 'Farm Pump (விவசாயம்)', role: 'Pumps & Motors', icon: '🏡', x: 0.95, y: 0.40 },
      { id: 'house_4', name: 'Villa (குடியிருப்பு)', role: 'AC & Fans', icon: '🏠', x: 0.77, y: 0.76 },
      { id: 'house_5', name: 'Cottage (இல்லம்)', role: 'Lights & TV', icon: '🏘️', x: 0.86, y: 0.78 },
      { id: 'house_6', name: 'Library (நூலகம்)', role: 'Terminal Node', icon: '📚', x: 0.95, y: 0.80 }
    ];

    houseList.forEach((h) => {
      this.nodes.set(h.id, {
        id: h.id,
        name: h.name,
        role: h.role,
        icon: h.icon,
        xNorm: h.x,
        yNorm: h.y,
        x: 0,
        y: 0,
        isLit: true,
        brownoutLevel: 0,
        flickerPhase: Math.random() * Math.PI
      });
    });

    this.repositionNodes();
  }

  repositionNodes() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.nodes.forEach((n) => {
      n.x = n.xNorm * w;
      n.y = n.yNorm * h;
    });
  }

  start() {
    if (!this.animFrameId) {
      this.lastTime = performance.now();
      this.animFrameId = requestAnimationFrame(this.gameTick.bind(this));
    }
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  setTime(minutes) {
    this.timeMinutes = ((minutes % 1440) + 1440) % 1440;
  }

  gameTick(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    // Time is locked unless explicitly commanded by user or challenge
    if (this.autoAdvanceTime) {
      this.timeMinutes = (this.timeMinutes + dt * 2.2) % 1440;
    }

    this.updateSimulation(dt);
    this.renderCanvas();

    this.animFrameId = requestAnimationFrame(this.gameTick.bind(this));
  }

  updateSimulation(dt) {
    const hours = this.timeMinutes / 60;
    const isSolarTime = hours >= 6 && hours <= 18;

    let baseSun = 0;
    if (isSolarTime) {
      const angle = ((hours - 6) / 12) * Math.PI;
      baseSun = Math.pow(Math.sin(angle), 1.3);
    }
    
    // Dynamic Slider Modulation (100% Manual Master Control)
    const effectiveSolar = baseSun * (this.sliderSunshine / 100);
    const solarGenMW = Math.round(effectiveSolar * 648);
    const coalGenMW = Math.round((this.sliderCoalFire / 100) * 1440);
    const netGridTie = this.sliderGridTie;

    // Total Demand: Homes Demand + Agri Irrigation Motors - Grid Tie Support
    const homesDemand = (this.sliderTownLoad / 4.0) * 1100; // 0 to 1100 MW (0 = Off)
    const agriDemand  = (this.sliderAgriPumps / 100) * 320; // 0 - 320 MW
    const totalDemand = Math.max(0, homesDemand + agriDemand - netGridTie);

    // Dynamic Battery Energy Storage System (BESS) Physics: Realistic Charging & Draining
    let batteryDischargeMW = 0;
    let batteryChargeMW = 0;
    let batteryMode = 'idle';
    let batteryFlowMW = 0;

    if (this.sliderSunshine > 0 && solarGenMW > totalDemand && totalDemand > 0) {
      // ☀️ SURPLUS SOLAR: Excess clean electricity charges the battery!
      const surplusSolarMW = solarGenMW - totalDemand;
      batteryChargeMW = Math.min(250, surplusSolarMW);
      if (this.sliderStorage < 500) {
        // Fast, satisfying charge rate: +20 MWh/s at 200 MW surplus
        const chargeDelta = (batteryChargeMW / 10.0) * dt;
        this.sliderStorage = Math.min(500, this.sliderStorage + chargeDelta);
        batteryMode = 'charging';
        batteryFlowMW = batteryChargeMW;
      } else {
        batteryMode = 'full';
        batteryFlowMW = 0;
      }
    } else if (solarGenMW < totalDemand && this.sliderStorage > 0.5) {
      // 🌙 DEFICIT / SUNSET / NIGHT: Battery discharges to power the town and actively drains!
      const solarDeficitMW = totalDemand - solarGenMW;
      const maxDeliverableMW = Math.min(360, this.sliderStorage * 2.8);
      batteryDischargeMW = Math.min(maxDeliverableMW, solarDeficitMW);

      // Fast, realistic, responsive drain rate:
      // At 250 MW discharge, drains ~23 MWh per second (250 / 11.0 = 22.7 MWh/s)
      // Even on smaller deficits, maintains minimum noticeable active drain
      const drainDelta = Math.max(3.5 * dt, (batteryDischargeMW / 11.0) * dt);
      this.sliderStorage = Math.max(0, this.sliderStorage - drainDelta);
      batteryMode = 'discharging';
      batteryFlowMW = batteryDischargeMW;

      if (this.sliderStorage <= 0.5) {
        this.sliderStorage = 0;
        batteryDischargeMW = 0;
        batteryMode = 'empty';
        batteryFlowMW = 0;

        if (!this.batteryDepletedNotified) {
          this.batteryDepletedNotified = true;
          this.popTexts.push({
            x: this.canvas.width / (2 * this.dpr),
            y: 140,
            text: '🪫 BATTERY DEPLETED (0 MWh)! (பேட்டரி காலியானது)',
            color: '#ef4444',
            alpha: 1.0,
            life: 0,
            maxLife: 2.5
          });
        }
      } else {
        this.batteryDepletedNotified = false;
      }
    } else if (this.sliderStorage <= 0.5) {
      this.sliderStorage = 0;
      batteryMode = 'empty';
      batteryFlowMW = 0;
    }

    this.batteryMode = batteryMode;
    this.batteryFlowMW = batteryFlowMW;

    // Operator Mode & Grid Dispatch
    const cleanPotentialMW = solarGenMW + batteryDischargeMW;
    const isSolar = (cleanPotentialMW >= 180 && this.sliderCoalFire < 50) || 
                    (solarGenMW > coalGenMW && solarGenMW > 120);

    const plant = this.nodes.get('plant');
    if (plant) {
      if (isSolar) {
        plant.name = 'Kamuthi Solar Park';
        plant.role = `${solarGenMW} MW • 100% Clean Solar`;
        plant.icon = '☀️';
      } else {
        plant.name = 'Mettur Thermal Station';
        plant.role = `${coalGenMW} MW • Coal Boiler`;
        plant.icon = '🏭';
      }
    }

    // Active Supply vs Demand
    const activeSupplyMW = isSolar 
      ? (cleanPotentialMW + Math.max(0, netGridTie)) 
      : (coalGenMW + Math.max(0, netGridTie));

    const powerDeficit = Math.max(0, totalDemand - activeSupplyMW);
    const deficitRatio = totalDemand > 0 ? Math.min(1.0, powerDeficit / totalDemand) : 0;
    const isTotalBlackout = (this.sliderVoltage < 100) || (activeSupplyMW < 50 && totalDemand > 0) || (deficitRatio > 0.82) || (activeSupplyMW === 0);

    // Voltage & Line Loss (Joule Heating I^2 R)
    const voltageSagPenalty = Math.max(0, (230 - this.sliderVoltage) / 20.0);
    const voltageOverload   = Math.max(0, (this.sliderVoltage - 238) / 12.0);
    const coalStress = (this.sliderCoalFire / 100) * (totalDemand / 650.0);

    const lineLossPct = isSolar 
      ? Math.round(5 + (1.0 - effectiveSolar) * 5 + voltageOverload * 14) 
      : Math.round(20 + coalStress * 24 + voltageOverload * 18);
    this.currentLineLossPct = lineLossPct;
    const efficiencyPct = Math.max(20, 100 - lineLossPct);

    // Fan RPM: Direct visual consequence of power delivery & voltage
    let targetRpm = 0;
    const voltageRatio = this.sliderVoltage / 230.0;
    if (isTotalBlackout) {
      targetRpm = 0; // Fans completely dead in blackout!
    } else if (isSolar) {
      targetRpm = Math.max(200, Math.round((2800 + (effectiveSolar * 800) - (deficitRatio * 2000)) * voltageRatio));
    } else {
      targetRpm = Math.max(100, Math.round((2200 - coalStress * 1400 - voltageSagPenalty * 900 - deficitRatio * 1500) * voltageRatio));
    }
    this.fanRotation += (targetRpm / 60) * Math.PI * 2 * dt;

    // Load & Brownout Calculation
    let brownoutCount = 0;
    let litCount = 0;

    for (let i = 1; i <= 6; i++) {
      const house = this.nodes.get(`house_${i}`);
      if (house) {
        house.flickerPhase += dt * (7 + i * 2);

        const isFarm = (house.id === 'house_3');
        const farmOverload = isFarm && (this.sliderAgriPumps > 75) && !isSolar;

        if (isTotalBlackout || farmOverload) {
          house.isLit = false;
          house.brownoutLevel = 1.0;
          brownoutCount++;
        } else if (deficitRatio > 0.15) {
          // Deficit causes progressive shedding from farthest nodes
          const shedThreshold = (7 - i) / 6.0;
          if (deficitRatio >= shedThreshold * 0.75 || this.sliderVoltage < 205) {
            house.isLit = false;
            house.brownoutLevel = 1.0;
            brownoutCount++;
          } else {
            house.isLit = true;
            house.brownoutLevel = 0.5;
            brownoutCount++;
            litCount++;
          }
        } else if (isSolar && (effectiveSolar >= 0.25 || this.sliderStorage > 40) && this.sliderVoltage >= 205) {
          house.isLit = true;
          house.brownoutLevel = 0.0;
          litCount++;
        } else {
          // Coal or low voltage: progressive voltage sag
          const dropRatio = (i / 6.0) * (0.38 + coalStress * 0.60 + voltageSagPenalty * 0.55);
          if (dropRatio > 0.35 || this.sliderVoltage < 205) {
            house.brownoutLevel = Math.min(1.0, (dropRatio - 0.30) * 2.6);
            brownoutCount++;
            if (house.brownoutLevel < 0.70) litCount++;
          } else {
            house.brownoutLevel = 0.0;
            litCount++;
          }
        }
      }
    }

    // Smog and Air Quality
    const rawSmog = isSolar ? 0 : (this.sliderCoalFire / 100) * 100;
    const filterReduction = (this.sliderScrubber / 100) * 0.85;
    const finalSmog = isSolar ? 0 : Math.round(rawSmog * (1.0 - filterReduction));
    const airCleanliness = Math.max(5, 100 - finalSmog);

    // Realistic Town Happiness: Penalize Blackout (92%), Smog (up to 65%), and Voltage sag!
    const smogPenalty = (finalSmog / 100) * 65;
    const blackoutPenalty = isTotalBlackout ? 92 : (brownoutCount * 14 + deficitRatio * 35);
    const voltagePenalty = (this.sliderVoltage < 205) ? (205 - this.sliderVoltage) * 1.5 : (this.sliderVoltage > 242 ? (this.sliderVoltage - 242) * 1.5 : 0);
    const townHappiness = Math.max(5, Math.min(100, Math.round(100 - blackoutPenalty - smogPenalty - voltagePenalty)));

    // Eco Score Dynamics
    if (isTotalBlackout) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 70); // Rapid crash to 0 in blackout!
    } else if (finalSmog > 50) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 45); // Heavy smog pollution fine!
    } else if (brownoutCount > 1 || this.sliderVoltage < 205) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 25); // Brownout instability penalty
    } else if (isSolar && townHappiness >= 85 && airCleanliness >= 80) {
      this.ecoScore = Math.min(3000, this.ecoScore + dt * 25); // Clean solar reward
    } else if (!isSolar && coalGenMW > 0) {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 10); // Carbon emission burn
    }

    // Live Grid Performance Rating
    let liveGrade = 'A';
    let gradeTitle = 'CLEAN ENERGY CHAMPION';
    let gradeTamil = 'தூய ஆற்றல் சாம்பியன்';
    let gradeColor = '#4ade80';

    if (isTotalBlackout || (brownoutCount >= 5 && totalDemand > 0) || this.sliderVoltage < 100) {
      liveGrade = 'F';
      gradeTitle = 'TOTAL BLACKOUT';
      gradeTamil = 'முழு மின்தடை';
      gradeColor = '#ef4444';
    } else if (finalSmog >= 60 || airCleanliness <= 30) {
      liveGrade = 'D';
      gradeTitle = 'TOXIC SMOG';
      gradeTamil = 'நச்சுப் புகை';
      gradeColor = '#f97316';
    } else if (brownoutCount >= 2 || townHappiness < 60 || this.sliderVoltage < 205 || this.sliderVoltage > 244) {
      liveGrade = 'C';
      gradeTitle = 'UNSTABLE GRID';
      gradeTamil = 'மின் தட்டுப்பாடு';
      gradeColor = '#eab308';
    } else if (!isSolar || this.sliderCoalFire > 35) {
      liveGrade = 'B';
      gradeTitle = 'COAL-DEPENDENT';
      gradeTamil = 'நிலக்கரி சார்பு';
      gradeColor = '#38bdf8';
    } else if (townHappiness >= 80 && airCleanliness >= 80 && isSolar && this.sliderVoltage >= 215 && this.sliderVoltage <= 245) {
      liveGrade = 'A+';
      gradeTitle = 'ELITE MASTER';
      gradeTamil = 'தலைசிறந்தது';
      gradeColor = '#22c55e';
    }

    // Electrons only flow if there is active generation!
    this.packetTimer += dt;
    const interval = isSolar ? 0.08 : 0.20;
    if (!isTotalBlackout && activeSupplyMW > 40 && this.packetTimer >= interval) {
      this.packetTimer = 0;
      this.spawnElectron(isSolar, lineLossPct);
    }

    this.updatePackets(dt);
    this.updateSmoke(dt, isSolar, finalSmog);

    for (let i = this.popTexts.length - 1; i >= 0; i--) {
      const pt = this.popTexts[i];
      pt.life += dt;
      pt.y -= dt * 26;
      pt.alpha = Math.max(0, 1.0 - pt.life / pt.maxLife);
      if (pt.life >= pt.maxLife) {
        this.popTexts.splice(i, 1);
      }
    }

    if (this.onTelemetry) {
      this.onTelemetry({
        timeMinutes: this.timeMinutes,
        isSolar,
        efficiencyPct,
        townHappiness,
        airCleanliness,
        fanRpm: targetRpm,
        ecoScore: Math.round(this.ecoScore),
        housesLitCount: litCount,
        brownoutCount,
        lineLossPct,
        storageMwh: Math.round(this.sliderStorage),
        batteryMode: this.batteryMode,
        batteryFlowMW: Math.round(this.batteryFlowMW),
        sunshinePct: this.sliderSunshine,
        coalFirePct: this.sliderCoalFire,
        scrubberPct: this.sliderScrubber,
        townLoad: this.sliderTownLoad,
        agriPumps: this.sliderAgriPumps,
        voltage: this.sliderVoltage,
        gridTie: this.sliderGridTie,
        activeSupplyMW,
        totalDemand,
        powerDeficit,
        isTotalBlackout,
        finalSmog,
        grade: liveGrade,
        gradeTitle,
        gradeTamil,
        gradeColor
      });
    }
  }

  setSlider(name, value) {
    if (name === 'sunshine')  this.sliderSunshine  = Math.max(0, Math.min(100, value));
    if (name === 'storage')   this.sliderStorage   = Math.max(0, Math.min(500, value));
    if (name === 'coalFire')  this.sliderCoalFire  = Math.max(0, Math.min(100, value));
    if (name === 'scrubber')  this.sliderScrubber  = Math.max(0, Math.min(100, value));
    if (name === 'townLoad')  this.sliderTownLoad  = Math.max(0, Math.min(4, value));
    if (name === 'agriPumps') this.sliderAgriPumps = Math.max(0, Math.min(100, value));
    if (name === 'voltage')   this.sliderVoltage   = Math.max(0, Math.min(250, value));
    if (name === 'gridTie')   this.sliderGridTie   = Math.max(-200, Math.min(200, value));
  }

  spawnElectron(isSolar, lineLossPct = 5) {
    const plant = this.nodes.get('plant');
    const pylon1 = this.nodes.get('pylon1');
    if (!plant || !pylon1) return;

    const targetHouse = Math.floor(Math.random() * 6) + 1;
    const willEvaporate = !isSolar && Math.random() < (lineLossPct / 100);

    this.packets.push({
      id: this.nextPacketId++,
      fromNode: plant,
      toNode: pylon1,
      progress: 0,
      speed: isSolar ? 1.5 : 0.85,
      isSolar,
      isEvaporating: willEvaporate,
      evaporationProgress: 0,
      targetHouseIndex: targetHouse
    });
  }

  updatePackets(dt) {
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const p = this.packets[i];

      if (p.isEvaporating && p.progress > 0.4) {
        p.evaporationProgress += dt * 3.0;
        if (p.evaporationProgress >= 1.0) {
          this.packets.splice(i, 1);
          continue;
        }
      }

      p.progress += p.speed * dt;
      if (p.progress >= 1.0) {
        const next = this.getNextNode(p.toNode.id, p.targetHouseIndex);
        if (next) {
          p.fromNode = p.toNode;
          p.toNode = next;
          p.progress = 0;
        } else {
          this.packets.splice(i, 1);
        }
      }
    }
  }

  getNextNode(currentId, targetHouse) {
    if (currentId === 'pylon1') return this.nodes.get('fanStation') || null;
    if (currentId === 'fanStation') return this.nodes.get('substation') || null;
    if (currentId === 'substation') return this.nodes.get(`house_${targetHouse}`) || null;
    return null;
  }

  updateSmoke(dt, isSolar, finalSmog = 0) {
    if (!isSolar && this.sliderCoalFire > 5) {
      const plant = this.nodes.get('plant');
      const spawnRate = (this.sliderCoalFire / 100) * 0.9;
      if (plant && Math.random() < spawnRate) {
        const isDirty = (finalSmog > 35);
        this.smokePuffs.push({
          x: plant.x + (Math.random() - 0.5) * 35,
          y: plant.y - 75,
          vx: Math.random() * 34 + 15,
          vy: -Math.random() * 45 - 25,
          radius: Math.random() * (isDirty ? 16 : 8) + 10,
          colorRGB: isDirty ? '15, 23, 42' : '203, 213, 225',
          alpha: isDirty ? 0.85 : 0.35,
          life: 0,
          maxLife: isDirty ? 3.6 : 2.0
        });
      }
    }

    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const s = this.smokePuffs[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.radius += dt * (s.colorRGB === '15, 23, 42' ? 18 : 10);
      s.currentAlpha = Math.max(0, s.alpha * (1.0 - s.life / s.maxLife));
      if (s.life >= s.maxLife) {
        this.smokePuffs.splice(i, 1);
      }
    }

    // Update animated touch ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += r.speed * dt;
      r.alpha = Math.max(0, 1.0 - (r.radius / r.maxRadius));
      if (r.radius >= r.maxRadius || r.alpha <= 0) {
        this.ripples.splice(i, 1);
      }
    }
  }

  renderCanvas() {
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;

    this.ctx.clearRect(0, 0, w, h);

    const hours = this.timeMinutes / 60;
    const isSolarTime = hours >= 6 && hours <= 18;

    this.drawLandscape(w, h, isSolarTime);
    this.drawPowerLines();
    this.drawRipples();
    this.drawInfrastructure(isSolarTime);
    this.drawElectrons();
    this.drawPuffsAndPopups();
  }

  drawRipples() {
    const ctx = this.ctx;
    ctx.save();
    this.ripples.forEach((r) => {
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = r.alpha;
      ctx.stroke();
    });
    ctx.restore();
  }

  drawLandscape(w, h, isSolar) {
    const ctx = this.ctx;
    const groundY = h * 0.76;

    ctx.save();
    // Distant background ridge
    ctx.beginPath();
    ctx.moveTo(0, groundY - 30);
    ctx.bezierCurveTo(w * 0.25, groundY - 75, w * 0.5, groundY - 35, w * 0.75, groundY - 65);
    ctx.bezierCurveTo(w * 0.9, groundY - 80, w * 0.98, groundY - 40, w, groundY - 50);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = isSolar ? 'rgba(16, 185, 129, 0.16)' : 'rgba(30, 41, 59, 0.4)';
    ctx.fill();

    // Foreground rolling terrain
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.bezierCurveTo(w * 0.2, groundY - 35, w * 0.45, groundY - 10, w * 0.7, groundY - 30);
    ctx.bezierCurveTo(w * 0.85, groundY - 45, w * 0.95, groundY - 15, w, groundY - 25);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = isSolar ? '#0a2318' : '#0a0e1a';
    ctx.fill();

    // Base ground solid bedrock
    ctx.beginPath();
    ctx.rect(0, groundY + 10, w, h - groundY);
    ctx.fillStyle = isSolar ? '#061710' : '#060810';
    ctx.fill();

    // Subtle modern terrain contour accent line
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.bezierCurveTo(w * 0.2, groundY - 35, w * 0.45, groundY - 10, w * 0.7, groundY - 30);
    ctx.bezierCurveTo(w * 0.85, groundY - 45, w * 0.95, groundY - 15, w, groundY - 25);
    ctx.strokeStyle = isSolar ? 'rgba(52, 211, 153, 0.35)' : 'rgba(148, 163, 184, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  drawPowerLines() {
    const ctx = this.ctx;
    ctx.save();

    const mainLegs = [
      ['plant', 'pylon1'],
      ['pylon1', 'fanStation'],
      ['fanStation', 'substation']
    ];

    mainLegs.forEach(([idA, idB]) => {
      const a = this.nodes.get(idA);
      const b = this.nodes.get(idB);
      if (!a || !b) return;

      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2 + 22;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    });

    const sub = this.nodes.get('substation');
    if (sub) {
      for (let i = 1; i <= 6; i++) {
        const house = this.nodes.get(`house_${i}`);
        if (!house) continue;

        ctx.beginPath();
        ctx.moveTo(sub.x, sub.y);
        ctx.lineTo(house.x, house.y);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.32)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawInfrastructure(isSolar) {
    const ctx = this.ctx;

    this.nodes.forEach((n) => {
      ctx.save();
      ctx.translate(n.x, n.y);

      if (n.id === 'plant') {
        if (isSolar) {
          this.drawKamuthiSolarPark();
        } else {
          this.drawMetturCoalPlant();
        }
      } else if (n.id === 'pylon1') {
        this.drawPylon(n.name);
      } else if (n.id === 'fanStation') {
        this.drawFanStation();
      } else if (n.id === 'substation') {
        this.drawSubstation();
      } else if (n.id.startsWith('house_')) {
        this.drawHouse(n);
      }

      ctx.restore();
    });
  }

  drawKamuthiSolarPark() {
    const ctx = this.ctx;

    ctx.fillStyle = '#475569';
    ctx.fillRect(-52, 18, 104, 6);
    ctx.fillRect(-26, 0, 8, 18);
    ctx.fillRect(18, 0, 8, 18);

    const offsets = [-34, 0, 34];
    offsets.forEach((px) => {
      ctx.save();
      ctx.translate(px, -4);
      ctx.rotate(-0.16);

      ctx.fillStyle = '#0369a1';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(-16, -12, 32, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(16, 0);
      ctx.moveTo(0, -12); ctx.lineTo(0, 12);
      ctx.moveTo(-11, -8); ctx.lineTo(11, 8);
      ctx.stroke();
      ctx.restore();
    });

    ctx.font = '16px Fredoka, sans-serif';
    ctx.fillText('✨', 38, -25);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Kamuthi Solar (648 MW)', 0, 38);
  }

  drawMetturCoalPlant() {
    const ctx = this.ctx;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-36, -16, 72, 36);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-22, -76, 13, 60);
    ctx.fillRect(9, -76, 13, 60);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-22, -61, 13, 10);
    ctx.fillRect(9, -61, 13, 10);

    ctx.fillStyle = '#f97316';
    ctx.fillRect(-16, 4, 11, 10);
    ctx.fillRect(6, 4, 11, 10);

    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 11px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Mettur Coal (1,440 MW)', 0, 38);
  }

  drawPylon(name) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-18, 40);
    ctx.lineTo(-5, -40);
    ctx.lineTo(5, -40);
    ctx.lineTo(18, 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-30, -20);
    ctx.lineTo(30, -20);
    ctx.moveTo(-35, -35);
    ctx.lineTo(35, -35);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(-30, -16, 3, 0, Math.PI * 2);
    ctx.arc(30, -16, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, 0, 52);
  }

  drawFanStation() {
    const ctx = this.ctx;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-24, -16, 48, 38, 6);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(this.fanRotation);

    ctx.fillStyle = '#38bdf8';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, -12, 4, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Town Cooling Station', 0, 36);
  }

  drawSubstation() {
    const ctx = this.ctx;

    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-26, -16, 52, 36, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    for (let x = -19; x <= 19; x += 9) {
      ctx.fillRect(x, -11, 4, 26);
    }

    ctx.fillStyle = '#facc15';
    ctx.fillRect(-11, -27, 6, 11);
    ctx.fillRect(5, -27, 6, 11);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TANTRANSCO Substation', 0, 34);
  }

  drawHouse(n) {
    const ctx = this.ctx;
    const isLit = n.isLit && n.brownoutLevel < 0.8;
    const isBrownout = n.brownoutLevel > 0.2;

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = isBrownout ? '#ef4444' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-20, -8, 40, 26, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(-24, -8);
    ctx.lineTo(0, -26);
    ctx.lineTo(24, -8);
    ctx.closePath();
    ctx.fill();

    let windowColor = '#facc15';
    if (n.brownoutLevel >= 0.8 || !isLit) {
      windowColor = '#0f172a';
    } else if (isBrownout) {
      const flicker = Math.sin(n.flickerPhase) > 0;
      windowColor = flicker ? '#f97316' : '#451a03';
    }

    ctx.fillStyle = windowColor;
    if (isLit && !isBrownout) {
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
    }
    ctx.fillRect(-14, -2, 9, 9);
    ctx.fillRect(5, -2, 9, 9);
    ctx.shadowBlur = 0;

    ctx.font = '12px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    const moodEmoji = isBrownout ? '😰' : '😃';
    ctx.fillText(`${n.icon} ${moodEmoji}`, 0, -32);

    ctx.fillStyle = isBrownout ? '#f87171' : '#cbd5e1';
    ctx.font = '10px Fredoka, sans-serif';
    ctx.fillText(n.name, 0, 28);
  }

  drawElectrons() {
    const ctx = this.ctx;
    ctx.save();

    this.packets.forEach((p) => {
      const x = p.fromNode.x + p.progress * (p.toNode.x - p.fromNode.x);
      const y = p.fromNode.y + p.progress * (p.toNode.y - p.fromNode.y);

      if (p.isEvaporating && p.evaporationProgress > 0) {
        ctx.fillStyle = `rgba(249, 115, 22, ${Math.max(0, 1 - p.evaporationProgress)})`;
        ctx.beginPath();
        ctx.arc(x, y - p.evaporationProgress * 15, 6 + p.evaporationProgress * 10, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      ctx.fillStyle = p.isSolar ? '#22c55e' : '#ef4444';
      ctx.shadowColor = p.isSolar ? '#4ade80' : '#f87171';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(x, y, p.isSolar ? 6 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }

  drawPuffsAndPopups() {
    const ctx = this.ctx;
    ctx.save();

    this.smokePuffs.forEach((s) => {
      const rgb = s.colorRGB || '30, 41, 59';
      const a = s.currentAlpha !== undefined ? s.currentAlpha : s.alpha;
      ctx.fillStyle = `rgba(${rgb}, ${a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    this.popTexts.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.alpha;
      ctx.font = 'bold 14px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pt.text, pt.x, pt.y);
    });

    ctx.restore();
  }

  handleCanvasClick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    let clickedNode = null;
    for (const node of this.nodes.values()) {
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < 38) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      if (clickedNode.id.startsWith('house_')) {
        const isPowered = clickedNode.isLit && clickedNode.brownoutLevel < 0.5;
        this.ripples.push({
          x: clickedNode.x,
          y: clickedNode.y,
          radius: 8,
          maxRadius: 70,
          speed: 120,
          color: isPowered ? '#4ade80' : '#ef4444',
          alpha: 1.0
        });
        this.popTexts.push({
          x: clickedNode.x,
          y: clickedNode.y - 42,
          text: isPowered ? `⚡ ${clickedNode.name}: 230V Active` : `⚠️ ${clickedNode.name}: Low Power`,
          color: isPowered ? '#4ade80' : '#ef4444',
          alpha: 1.0,
          life: 0,
          maxLife: 1.4
        });
      } else if (clickedNode.id === 'fanStation') {
        const isSpinning = this.fanRotation > 0;
        this.ripples.push({
          x: clickedNode.x,
          y: clickedNode.y,
          radius: 8,
          maxRadius: 65,
          speed: 110,
          color: '#38bdf8',
          alpha: 1.0
        });
        this.popTexts.push({
          x: clickedNode.x,
          y: clickedNode.y - 42,
          text: `🌀 Town Cooling Fan Station`,
          color: '#38bdf8',
          alpha: 1.0,
          life: 0,
          maxLife: 1.4
        });
      } else if (clickedNode.id === 'plant') {
        const isSolar = clickedNode.name.includes('Solar');
        if (isSolar) {
          this.ecoScore += 100;
          this.ripples.push({
            x: clickedNode.x,
            y: clickedNode.y,
            radius: 12,
            maxRadius: 90,
            speed: 130,
            color: '#facc15',
            alpha: 1.0
          });
          this.popTexts.push({
            x: clickedNode.x,
            y: clickedNode.y - 42,
            text: '⭐ SOLAR BOOST +100! (சூரிய ஆற்றல்)',
            color: '#facc15',
            alpha: 1.0,
            life: 0,
            maxLife: 1.6
          });
        } else {
          this.ecoScore = Math.max(0, this.ecoScore - 20);
          this.ripples.push({
            x: clickedNode.x,
            y: clickedNode.y,
            radius: 12,
            maxRadius: 80,
            speed: 100,
            color: '#ef4444',
            alpha: 1.0
          });
          this.popTexts.push({
            x: clickedNode.x,
            y: clickedNode.y - 42,
            text: '💨 COUGH! -20 SMOG PENALTY (புகை மாசு)',
            color: '#ef4444',
            alpha: 1.0,
            life: 0,
            maxLife: 1.6
          });
        }
      } else if (clickedNode.id === 'fanStation') {
        this.ripples.push({
          x: clickedNode.x,
          y: clickedNode.y,
          radius: 10,
          maxRadius: 75,
          speed: 130,
          color: '#38bdf8',
          alpha: 1.0
        });
        this.popTexts.push({
          x: clickedNode.x,
          y: clickedNode.y - 42,
          text: '🌀 FANS SPINNING FAST! (குளிர்விப்பான்)',
          color: '#38bdf8',
          alpha: 1.0,
          life: 0,
          maxLife: 1.4
        });
      } else if (clickedNode.id === 'substation') {
        this.ripples.push({
          x: clickedNode.x,
          y: clickedNode.y,
          radius: 10,
          maxRadius: 80,
          speed: 120,
          color: '#eab308',
          alpha: 1.0
        });
        this.popTexts.push({
          x: clickedNode.x,
          y: clickedNode.y - 42,
          text: '⚡ SUBSTATION: 230V BALANCED! (துணை நிலையம்)',
          color: '#eab308',
          alpha: 1.0,
          life: 0,
          maxLife: 1.4
        });
      }
      return clickedNode;
    } else {
      // Gentle ripple feedback even when clicking open grid landscape
      this.ripples.push({
        x: mouseX,
        y: mouseY,
        radius: 6,
        maxRadius: 45,
        speed: 90,
        color: 'rgba(56, 189, 248, 0.5)',
        alpha: 0.7
      });
      return null;
    }
  }
}
