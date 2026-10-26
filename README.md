# ⚡ Tamil Nadu Power Grid Simulation: Solar vs. Coal (School Edition)

An interactive, gamified, and highly visual web simulation demonstrating the contrast between **Daytime Clean Solar Energy** (Kamuthi Solar Park) and **Evening Coal Thermal Energy** (Mettur & North Chennai Thermal Power Stations) in Tamil Nadu, India.

---

## 🎮 How to Play / Run Immediately

### Option 1: Zero-Install Quick Play (Recommended)
Simply open **`standalone_simulation.html`** in any web browser (Chrome, Edge, Firefox, Safari):
- No build tools, web servers, or package managers required.
- 100% self-contained and runs offline on any school computer or Chromebook.

### Option 2: Modular Source
Serve this directory with any local static HTTP server:
```bash
python3 -m http.server 8000
# Then open http://localhost:8000/index.html in your browser
```

---

## 🌟 Key Features & Mechanics

1. **The Interactive Time Slider (00:00 – 23:59)**:
   - **Daytime Solar Peak (12:00 Noon)**: Bright sunny skies, solar panels tilt to the sun, glowing neon-green packets travel smoothly with 95% transmission efficiency and 0 emissions.
   - **Evening Coal Peak (19:30)**: Stacks billow dark smoke, reddish-grey packets splutter along transmission lines, suffering >30% line loss ($I^2R$ heat loss) evaporating in mid-air, causing brownouts across town.

2. **Connected Cooling Fan Station (Load)**:
   - Direct real-time feedback from power flow.
   - Spins at **3,600 RPM** during Solar Peak.
   - Stutters and stalls down to **900 RPM** during Coal Peak due to voltage sag.

3. **Interactive Hardware Layer Inspector**:
   - Click **"🔍 Inspect Tech"** to examine:
     - **Solar Tab**: TOPCon silicon photovoltaic layers (Silver grid, ARC, N-type silicon wafer, Tunnel oxide layer).
     - **Coal Tab**: Coal pulverizer, boiler, steam turbine, and flue gas stack.

4. **Gamified Classroom Features**:
   - **Town Mood & Air Quality Meters**: Watch town happiness drop from 100% to 40% when brownouts hit.
   - **Interactive Building Clicking**: Click any house (School, Clinic, Farm, Homes) to turn appliances ON/OFF or restore backup power for $+50$ Eco Points.
   - **Click Solar Panels**: Trigger a Solar Boost for $+100$ bonus Eco points.
   - **30-Second Challenge Mode**: Can you balance grid demand and keep the air pure?
   - **Web Audio Sound Effects**: Clean melodic chimes during solar generation; industrial rumbles and electrical pops during coal mode.

---

## 📁 Repository Structure

- `standalone_simulation.html`: Single-file bundle containing the entire game, styles, and engine.
- `index.html`: Main HTML5 document.
- `styles.css`: Spacious, kid-friendly stylesheet with dynamic day/night CSS variables and animations.
- `engine.ts` / `engine.js`: 60 FPS HTML5 Canvas engine rendering catenary cables, electron packets, particles, and buildings.
- `ui.js`: DOM controller, Web Audio sound generator, challenge mode timer, and event listeners.
- `GridSimulator.java`: Standalone Java backend simulation and mathematical verification module.

---

## 🎓 Educational Learning Objectives
- **Transmission Loss Formula**: Demonstrates Joule heating $P_{\text{loss}} = I^2 R$.
- **Clean Energy Metrics**: Demonstrates $0.00\text{ tons CO}_2$ from solar generation versus $0.92\text{ tons CO}_2/\text{MWh}$ from thermal coal.
- **Grid Reliability & Voltage Sag**: Visually explains brownouts when line load exceeds local transformer capacity.

---
Created for Tamil Nadu School Science & Physics Exhibitions.
