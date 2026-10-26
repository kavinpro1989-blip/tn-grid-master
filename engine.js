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
    this.timeMinutes = 720;
    this.isRunning = true;
    this.ecoScore = 1200;
    this.fanRotation = 0;

    // Grid Graph
    this.nodes = new Map();
    this.packets = [];
    this.smokePuffs = [];
    this.popTexts = [];
    this.nextPacketId = 1;
    this.packetTimer = 0;

    this.onTelemetry = onTelemetry;

    this.setupDpr();
    this.initTopology();
    window.addEventListener('resize', () => {
      this.setupDpr();
      this.repositionNodes();
    });
  }

  setupDpr() {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(800, rect.width) * this.dpr;
    this.canvas.height = Math.max(480, rect.height) * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
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
      flickerPhase: 0,
      applianceOn: true
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
      flickerPhase: 0,
      applianceOn: true
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
      flickerPhase: 0,
      applianceOn: true
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
      flickerPhase: 0,
      applianceOn: true
    });

    // 5. Six Friendly Town Buildings
    const houseList = [
      { id: 'house_1', name: 'Primary School', role: 'Classrooms & Labs', icon: '🏫', x: 0.77, y: 0.44 },
      { id: 'house_2', name: 'Town Clinic', role: 'Medical Care', icon: '🏥', x: 0.86, y: 0.42 },
      { id: 'house_3', name: 'Farm House', role: 'Pumps & Motors', icon: '🏡', x: 0.95, y: 0.40 },
      { id: 'house_4', name: 'Suburban Villa', role: 'AC & Fans', icon: '🏠', x: 0.77, y: 0.76 },
      { id: 'house_5', name: 'Family Cottage', role: 'Lights & TV', icon: '🏘️', x: 0.86, y: 0.78 },
      { id: 'house_6', name: 'Village Library', role: 'Terminal Node', icon: '📚', x: 0.95, y: 0.80 }
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
        flickerPhase: Math.random() * Math.PI,
        applianceOn: true
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

    if (this.isRunning) {
      this.timeMinutes = (this.timeMinutes + dt * 2.2) % 1440;
    }

    this.updateSimulation(dt);
    this.renderCanvas();

    this.animFrameId = requestAnimationFrame(this.gameTick.bind(this));
  }

  updateSimulation(dt) {
    const hours = this.timeMinutes / 60;
    const isSolarTime = hours >= 6 && hours <= 18;

    let solarIntensity = 0;
    if (isSolarTime) {
      const angle = ((hours - 6) / 12) * Math.PI;
      solarIntensity = Math.pow(Math.sin(angle), 1.3);
    }
    const isSolar = solarIntensity > 0.45;

    const plant = this.nodes.get('plant');
    if (plant) {
      if (isSolar) {
        plant.name = 'Kamuthi Solar Park';
        plant.role = '648 MW • 100% Clean Solar';
        plant.icon = '☀️';
      } else {
        plant.name = 'Mettur Thermal Station';
        plant.role = '1,440 MW • Coal Boiler';
        plant.icon = '🏭';
      }
    }

    const efficiencyPct = isSolar 
      ? Math.round(95 + Math.sin(performance.now() * 0.001) * 2) 
      : Math.round(68 + Math.sin(performance.now() * 0.001) * 2);

    const targetRpm = isSolar ? 3600 : 1200;
    this.fanRotation += (targetRpm / 60) * Math.PI * 2 * dt;

    let brownoutCount = 0;
    let litCount = 0;

    for (let i = 1; i <= 6; i++) {
      const house = this.nodes.get(`house_${i}`);
      if (house) {
        house.flickerPhase += dt * (7 + i * 2);

        if (!house.applianceOn) {
          house.isLit = false;
          house.brownoutLevel = 1.0;
        } else if (isSolar) {
          house.isLit = true;
          house.brownoutLevel = 0.0;
          litCount++;
        } else {
          const dropRatio = (i / 6.0) * 0.85;
          if (dropRatio > 0.42) {
            house.brownoutLevel = Math.min(1.0, (dropRatio - 0.35) * 2.0);
            brownoutCount++;
            if (house.brownoutLevel < 0.75) litCount++;
          } else {
            house.brownoutLevel = 0.0;
            litCount++;
          }
        }
      }
    }

    const townHappiness = Math.max(10, Math.round(100 - brownoutCount * 22));
    const airCleanliness = isSolar ? 100 : Math.max(15, Math.round(35 - (1.0 - solarIntensity) * 20));

    if (isSolar) {
      this.ecoScore += dt * 10;
    } else {
      this.ecoScore = Math.max(0, this.ecoScore - dt * 3);
    }

    this.packetTimer += dt;
    const interval = isSolar ? 0.08 : 0.22;
    if (this.packetTimer >= interval) {
      this.packetTimer = 0;
      this.spawnElectron(isSolar);
    }

    this.updatePackets(dt);
    this.updateSmoke(dt, isSolar);

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
        brownoutCount
      });
    }
  }

  spawnElectron(isSolar) {
    const plant = this.nodes.get('plant');
    const pylon1 = this.nodes.get('pylon1');
    if (!plant || !pylon1) return;

    const targetHouse = Math.floor(Math.random() * 6) + 1;
    const willEvaporate = !isSolar && Math.random() < 0.32;

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

  updateSmoke(dt, isSolar) {
    if (!isSolar) {
      const plant = this.nodes.get('plant');
      if (plant && Math.random() < 0.7) {
        this.smokePuffs.push({
          x: plant.x + (Math.random() - 0.5) * 35,
          y: plant.y - 75,
          vx: Math.random() * 32 + 15,
          vy: -Math.random() * 42 - 20,
          radius: Math.random() * 12 + 10,
          alpha: 0.6,
          life: 0,
          maxLife: 2.8
        });
      }
    }

    for (let i = this.smokePuffs.length - 1; i >= 0; i--) {
      const s = this.smokePuffs[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.radius += dt * 14;
      s.alpha = Math.max(0, 0.6 * (1.0 - s.life / s.maxLife));
      if (s.life >= s.maxLife) {
        this.smokePuffs.splice(i, 1);
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
    this.drawInfrastructure(isSolarTime);
    this.drawElectrons();
    this.drawPuffsAndPopups();
  }

  drawLandscape(w, h, isSolar) {
    const ctx = this.ctx;
    const groundY = h * 0.76;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.bezierCurveTo(w * 0.2, groundY - 60, w * 0.4, groundY - 25, w * 0.65, groundY - 55);
    ctx.bezierCurveTo(w * 0.85, groundY - 75, w * 0.95, groundY - 30, w, groundY - 45);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = isSolar ? 'rgba(34, 197, 94, 0.25)' : 'rgba(30, 41, 59, 0.45)';
    ctx.fill();

    ctx.beginPath();
    ctx.rect(0, groundY, w, h - groundY);
    ctx.fillStyle = isSolar ? '#0d281e' : '#090d16';
    ctx.fill();
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

    ctx.fillStyle = '#64748b';
    ctx.fillRect(-52, 18, 104, 6);
    ctx.fillRect(-26, 0, 8, 18);
    ctx.fillRect(18, 0, 8, 18);

    const offsets = [-34, 0, 34];
    offsets.forEach((px) => {
      ctx.save();
      ctx.translate(px, -4);
      ctx.rotate(-0.16);

      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-16, -12, 32, 24, 4);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-11, -8);
      ctx.lineTo(11, 8);
      ctx.stroke();
      ctx.restore();
    });

    ctx.font = '16px Fredoka, sans-serif';
    ctx.fillText('✨', 38, -25);

    ctx.fillStyle = '#4ade80';
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
    if (!n.applianceOn || n.brownoutLevel >= 0.8) {
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
    const moodEmoji = !n.applianceOn ? '💤' : (isBrownout ? '😰' : '😃');
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
      ctx.fillStyle = `rgba(30, 41, 59, ${s.alpha})`;
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

    for (const node of this.nodes.values()) {
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      if (Math.sqrt(dx * dx + dy * dy) < 36) {
        if (node.id.startsWith('house_')) {
          node.applianceOn = !node.applianceOn;
          this.popTexts.push({
            x: node.x,
            y: node.y - 42,
            text: node.applianceOn ? '💡 Lights & Fans ON!' : '💤 Switched OFF',
            color: node.applianceOn ? '#4ade80' : '#94a3b8',
            alpha: 1.0,
            life: 0,
            maxLife: 1.2
          });
        } else if (node.id === 'plant') {
          const isSolar = node.name.includes('Solar');
          if (isSolar) {
            this.ecoScore += 100;
            this.popTexts.push({
              x: node.x,
              y: node.y - 42,
              text: '⭐ SOLAR BOOST +100!',
              color: '#facc15',
              alpha: 1.0,
              life: 0,
              maxLife: 1.4
            });
          } else {
            this.ecoScore = Math.max(0, this.ecoScore - 20);
            this.popTexts.push({
              x: node.x,
              y: node.y - 42,
              text: '💨 COUGH! -20 SMOG PENALTY',
              color: '#ef4444',
              alpha: 1.0,
              life: 0,
              maxLife: 1.4
            });
          }
        } else if (node.id === 'fanStation') {
          this.popTexts.push({
            x: node.x,
            y: node.y - 42,
            text: '🌀 FANS SPINNING FAST!',
            color: '#38bdf8',
            alpha: 1.0,
            life: 0,
            maxLife: 1.2
          });
        }
        return node;
      }
    }
    return null;
  }
}
