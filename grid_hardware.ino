#include <Wire.h>
#include <LiquidCrystal_I2C.h>

/**
 * ============================================================================
 * ⚡ TAMIL NADU SMART GRID DEMO: SOLAR VS COAL SHOWDOWN (SCHOOL ANNUAL DAY)
 * ============================================================================
 * Hardware Setup:
 * 1. Arduino Uno
 * 2. 4.9V Solar Panel (Analog A0 via 10k/10k voltage divider)
 * 3. Dual-Channel 5V Relay Module (Pins 8 & 9)
 * 4. 5V Propeller / DC Motor (Connected to Relay common load terminal)
 * 5. 16x2 I2C LCD Display (SDA -> A4, SCL -> A5)
 * 6. Tri-Color LEDs:
 *    - Green LED  (Pin 11): 100% Clean Solar Power Active
 *    - Yellow LED (Pin 12): Grid Transition / Moderate Demand
 *    - Red LED    (Pin 13): Evening Coal Peak / Smog & Brownout Alert
 * 7. Interactive Pushbuttons:
 *    - Button 1 (Pin 4): "12:00 Noon Solar Peak" Mode
 *    - Button 2 (Pin 5): "19:30 Evening Coal Peak" Mode
 * ============================================================================
 */

// Initialize 16x2 I2C LCD at standard address 0x27
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Pin Mappings
const int PIN_SOLAR_ADC    = A0;  // Solar Panel Voltage Divider Input
const int PIN_BTN_SOLAR    = 4;   // Pushbutton: Solar Peak Mode
const int PIN_BTN_COAL     = 5;   // Pushbutton: Coal Peak Mode
const int PIN_RELAY_SOLAR  = 8;   // Relay Ch 1: Solar Power Line
const int PIN_RELAY_COAL   = 9;   // Relay Ch 2: Coal Power Line
const int PIN_LED_GREEN    = 11;  // Green LED: Clean Solar Active
const int PIN_LED_YELLOW   = 12;  // Yellow LED: Grid Transition / Warning
const int PIN_LED_RED      = 13;  // Red LED: Coal Active / Smog Alert

// Grid Modes
enum GridState {
  STATE_SOLAR_NOON,
  STATE_COAL_EVENING
};

GridState currentGridState = STATE_SOLAR_NOON;
unsigned long lastTelemetryUpdate = 0;
int ecoScore = 1200;

void setup() {
  Serial.begin(9600);
  Serial.println(F("⚡ TN Smart Grid Annual Day Interactive Booth Starting..."));

  // Configure Button Inputs with Internal Pull-Ups
  pinMode(PIN_BTN_SOLAR, INPUT_PULLUP);
  pinMode(PIN_BTN_COAL, INPUT_PULLUP);

  // Configure Relays & LEDs as Outputs
  pinMode(PIN_RELAY_SOLAR, OUTPUT);
  pinMode(PIN_RELAY_COAL, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  // Relays are active-LOW on most Arduino relay modules:
  // HIGH = Relay OFF, LOW = Relay ON
  digitalWrite(PIN_RELAY_SOLAR, HIGH);
  digitalWrite(PIN_RELAY_COAL, HIGH);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("TN SMART GRID");
  lcd.setCursor(0, 1);
  lcd.print("SOLAR VS COAL");
  delay(1800);
  lcd.clear();
}

void loop() {
  // 1. Read Visitor Interactive Pushbuttons (Active LOW)
  if (digitalRead(PIN_BTN_SOLAR) == LOW) {
    if (currentGridState != STATE_SOLAR_NOON) {
      currentGridState = STATE_SOLAR_NOON;
      ecoScore += 100; // Reward eco points for switching to clean solar
      triggerGridTransitionAnimation(true);
    }
    delay(200); // Debounce
  } 
  else if (digitalRead(PIN_BTN_COAL) == LOW) {
    if (currentGridState != STATE_COAL_EVENING) {
      currentGridState = STATE_COAL_EVENING;
      ecoScore = max(100, ecoScore - 50); // Penalty for dirty coal
      triggerGridTransitionAnimation(false);
    }
    delay(200); // Debounce
  }

  // 2. Sample Solar Panel Voltage (Using 1:1 10k/10k Divider, Max 10V Range)
  int rawAdc = analogRead(PIN_SOLAR_ADC);
  float measuredSolarVolts = (rawAdc * 5.0 / 1023.0) * 2.0;

  // 3. Periodic Telemetry & Actuation Update (Every 350ms)
  if (millis() - lastTelemetryUpdate >= 350) {
    lastTelemetryUpdate = millis();
    runGridManagement(measuredSolarVolts);
  }
}

/**
 * Actuate Relays, LEDs, Fan Motor, and Update Gamified LCD
 */
void runGridManagement(float solarV) {
  if (currentGridState == STATE_SOLAR_NOON) {
    // ☀️ SOLAR PEAK MODE (12:00 NOON)
    // - Close Solar Relay (Ch1 ON), Open Coal Relay (Ch2 OFF)
    // - Green LED ON (High Efficiency, Zero Emissions)
    // - 5V Propeller Fan runs smoothly at high speed
    digitalWrite(PIN_RELAY_SOLAR, LOW);   // Active LOW: Energize Solar
    digitalWrite(PIN_RELAY_COAL, HIGH);  // Active LOW: De-energize Coal

    digitalWrite(PIN_LED_GREEN, HIGH);
    digitalWrite(PIN_LED_YELLOW, LOW);
    digitalWrite(PIN_LED_RED, LOW);

    // Line 1: Mode & Voltage
    lcd.setCursor(0, 0);
    lcd.print("SOLAR 12PM ");
    lcd.print(solarV, 1);
    lcd.print("V  ");

    // Line 2: Gamified Score & Clean Status
    lcd.setCursor(0, 1);
    lcd.print("CLEAN! ECO:");
    lcd.print(ecoScore);
    lcd.print(" ");

    Serial.print(F("[SOLAR 12PM] Clean Power Active | Solar V: "));
    Serial.print(solarV);
    Serial.print(F("V | Propeller: 3600 RPM | Eco Score: "));
    Serial.println(ecoScore);

  } else {
    // 🏭 COAL PEAK MODE (19:30 EVENING)
    // - Open Solar Relay (Ch1 OFF), Close Coal Relay (Ch2 ON)
    // - Red LED ON (Smog alert, high line loss)
    // - Yellow LED blinks periodically to indicate thermal stress
    digitalWrite(PIN_RELAY_SOLAR, HIGH); // Disconnect Solar
    digitalWrite(PIN_RELAY_COAL, LOW);   // Energize Coal Grid

    digitalWrite(PIN_LED_GREEN, LOW);
    digitalWrite(PIN_LED_RED, HIGH);
    
    // Toggle Yellow LED as warning pulse
    bool warningPulse = (millis() / 500) % 2 == 0;
    digitalWrite(PIN_LED_YELLOW, warningPulse ? HIGH : LOW);

    // Line 1: Coal Alert & Smog
    lcd.setCursor(0, 0);
    lcd.print("COAL PEAK 7:30PM");

    // Line 2: Efficiency Drop & Voltage Sag
    lcd.setCursor(0, 1);
    lcd.print("SMOG! LOSS: 32% ");

    Serial.print(F("[COAL 7:30PM] High Thermal Loss | Voltage Sag | Propeller: 900 RPM | Eco Score: "));
    Serial.println(ecoScore);
  }
}

/**
 * Visual transition flicker effect on LEDs during grid source switching
 */
void triggerGridTransitionAnimation(bool toSolar) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("GRID SWITCHING..");
  lcd.setCursor(0, 1);
  lcd.print(toSolar ? ">> HARVEST SOLAR" : ">> FIRE COAL GRD");

  // Rapid yellow flash to simulate grid synchronization
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_LED_YELLOW, HIGH);
    delay(70);
    digitalWrite(PIN_LED_YELLOW, LOW);
    delay(70);
  }
}
