# 🔌 Hardware Setup & Wiring Guide: School Smart Grid Booth

This guide provides step-by-step assembly instructions for the interactive physical booth at your school annual day.

---

## 🧰 Required Components Checklist

1. **Arduino Uno** with USB cable
2. **4.9V Solar Panel** (Mini photovoltaic module)
3. **Dual-Channel 5V Relay Module** (Optocoupler-isolated)
4. **5V DC Propeller Motor / Mini Fan**
5. **16x2 LCD Display** with I2C Backpack module (PCF8574)
6. **3x 5mm LEDs**:
   - 1x Green LED (Solar Peak Clean Indicator)
   - 1x Yellow LED (Grid Transition & Warning)
   - 1x Red LED (Coal Evening Peak & Smog Indicator)
7. **Resistors**:
   - 3x $220\,\Omega$ or $330\,\Omega$ resistors (for the LEDs)
   - 2x $10\,\text{k}\Omega$ resistors (for the 4.9V Solar Panel Voltage Divider)
8. **2x Tactile Pushbuttons** (Visitor control)
9. **Full-size Breadboard & Male-to-Male / Male-to-Female Jumper Wires**

---

## 📐 Circuit Schematic & Wiring Matrix

### 1. 16x2 I2C LCD Display
| LCD Pin | Arduino Uno Pin | Purpose |
| :--- | :--- | :--- |
| **GND** | Arduino `GND` | Ground |
| **VCC** | Arduino `5V` | 5V Power |
| **SDA** | Arduino `A4` | I2C Data |
| **SCL** | Arduino `A5` | I2C Clock |

*(Note: Adjust the small blue potentiometer on the back of the LCD backpack with a screwdriver if the text contrast is too faint or too bright).*

---

### 2. Pushbuttons (Visitor Game Controls)
Both buttons use the Arduino's internal `INPUT_PULLUP` resistor. No external resistors are needed for the buttons!
- **Button 1 (Noon Solar Peak Mode)**:
  - Leg 1 $\rightarrow$ Arduino **Digital Pin 4**
  - Leg 2 $\rightarrow$ Arduino **GND**
- **Button 2 (Evening Coal Peak Mode)**:
  - Leg 1 $\rightarrow$ Arduino **Digital Pin 5**
  - Leg 2 $\rightarrow$ Arduino **GND**

---

### 3. Tri-Color LEDs (Current Limiting Resistors)
- **Green LED (Anode / Long Leg)** $\rightarrow 220\,\Omega$ Resistor $\rightarrow$ Arduino **Pin 11**
- **Yellow LED (Anode / Long Leg)** $\rightarrow 220\,\Omega$ Resistor $\rightarrow$ Arduino **Pin 12**
- **Red LED (Anode / Long Leg)** $\rightarrow 220\,\Omega$ Resistor $\rightarrow$ Arduino **Pin 13**
- **All 3 Cathodes (Short Legs)** $\rightarrow$ Connected together to Breadboard **GND Rail** $\rightarrow$ Arduino **GND**

---

### 4. 4.9V Solar Panel (Voltage Divider into Pin A0)
Because the 4.9V solar panel can produce open-circuit voltages close to ~5.2V in direct sunlight, a 1:1 voltage divider protects the Arduino analog input:
```
Solar Panel (+) ─── [ 10k Resistor ] ──┬─── Arduino Pin A0
                                       │
                                [ 10k Resistor ]
                                       │
Solar Panel (-) ───────────────────────┴─── Arduino GND
```

---

### 5. Dual-Channel Relay Module & 5V Propeller Motor
- **Relay Logic Side**:
  - `VCC` $\rightarrow$ Arduino `5V`
  - `GND` $\rightarrow$ Arduino `GND`
  - `IN1` (Solar Switch) $\rightarrow$ Arduino **Pin 8**
  - `IN2` (Coal Switch) $\rightarrow$ Arduino **Pin 9**
- **Relay High-Current / Load Terminals (Controlling the 5V Propeller)**:
  - **Propeller Fan (+)** $\rightarrow$ Connected to Relay 1 **COM** (Common terminal)
  - Relay 1 **NO** (Normally Open) $\rightarrow$ Connected to **5V Supply** (Direct clean feed)
  - Propeller Fan (-) $\rightarrow$ Connected to **GND**
  - *(When Relay 1 triggers during Solar Noon, the propeller receives clean continuous 5V and spins at full RPM).*

---

## 🎪 How to Present at the Annual Day Exhibition

1. **Interactive Visitor Hook**:
   - Place a sign above the booth: *"⚡ Can You Balance the Tamil Nadu Power Grid? Press the Buttons to Decide!"*
2. **Flashlight Solar Demonstration**:
   - Provide a small torch or LED flashlight for attendees.
   - When visitors shine the torch on the 4.9V Solar Panel and press the **Solar Button**, the **Green LED lights up**, the **Propeller spins furiously**, and the LCD shows `SOLAR 12PM | CLEAN: 100%`.
3. **Coal Brownout Demonstration**:
   - When visitors press the **Coal Button**, the **Red LED blinks**, the Relay clicks, and the LCD displays `COAL 7:30PM | SMOG! LOSS: 32%`.
   - Point to the screen simulation running alongside to show the catenary line spark losses and smog clouds!
