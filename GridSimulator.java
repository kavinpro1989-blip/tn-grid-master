package tamilnadu.grid.simulator;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * ============================================================================
 * TAMIL NADU POWER GRID SIMULATOR (GridSimulator.java)
 * Modeling Daytime Solar (Kamuthi) vs Evening Coal Thermal (Mettur & North Chennai)
 * ============================================================================
 * 
 * Educational & Architectural Narrative:
 * 1. Peak Noon (Solar Phase): The grid draws from Kamuthi Solar Park (648 MW)
 *    in Ramanathapuram. Abundant clean photovoltaic energy with minimal line loss (~5%)
 *    and zero carbon emissions.
 * 2. Evening Peak (Coal Phase): The sun sets, and the grid shifts reliance to
 *    Mettur Thermal Power Station (MTPS, 1,440 MW) and North Chennai Thermal
 *    Power Station (NCTPS, 1,830 MW). Heavy line resistance, thermal boiler ramp lag,
 *    30%+ transmission loss, and downstream voltage brownouts on residential nodes.
 */
public class GridSimulator implements Serializable {
    private static final long serialVersionUID = 1L;

    // Real-world Tamil Nadu Grid Constants (TANGEDCO / TANTRANSCO)
    public static final double NOMINAL_VOLTAGE_HV_KV = 400.0;     // 400 kV Bulk Transmission
    public static final double NOMINAL_VOLTAGE_MV_KV = 11.0;      // 11 kV Substation Feeder
    public static final double NOMINAL_VOLTAGE_LV_V = 230.0;      // 230 V Domestic Single Phase
    public static final double GRID_FREQUENCY_NOMINAL_HZ = 50.00; // 50.00 Hz Indian Grid Standard
    public static final double COAL_EMISSION_FACTOR_KG_PER_KWH = 0.92; // Subcritical coal CO2 intensity

    // Physical Capacities
    public static final double KAMUTHI_SOLAR_CAPACITY_MW = 648.0;
    public static final double METTUR_THERMAL_CAPACITY_MW = 1440.0;
    public static final double NORTH_CHENNAI_CAPACITY_MW = 1830.0;

    // Simulation State
    private double currentTimeMinutes;     // 0.0 to 1439.9
    private double cumulativeCarbonKg;     // Total CO2 emitted in kg
    private double currentCoalOutputMW;    // Instantaneous coal dispatch with thermal inertia
    private final List<ResidentialNode> residentialHouses;

    /**
     * Data Transfer Object for serialization to JSON (REST / WebSocket compatible).
     */
    public static class GridTelemetryDto {
        public double timeMinutes;
        public String formattedTime;
        public String activeSource;
        public double totalDemandMW;
        public double solarGenerationMW;
        public double coalGenerationMW;
        public double transmissionEfficiencyPct;
        public double transmissionLossMW;
        public double carbonEmissionRateKgSec;
        public double cumulativeCarbonTons;
        public double gridFrequencyHz;
        public int brownoutHouseCount;
        public List<HouseStatusDto> houseStatuses = new ArrayList<>();

        public String toJson() {
            StringBuilder sb = new StringBuilder();
            sb.append("{\n");
            sb.append(String.format(Locale.US, "  \"timeMinutes\": %.1f,\n", timeMinutes));
            sb.append(String.format(Locale.US, "  \"formattedTime\": \"%s\",\n", formattedTime));
            sb.append(String.format(Locale.US, "  \"activeSource\": \"%s\",\n", activeSource));
            sb.append(String.format(Locale.US, "  \"totalDemandMW\": %.1f,\n", totalDemandMW));
            sb.append(String.format(Locale.US, "  \"solarGenerationMW\": %.1f,\n", solarGenerationMW));
            sb.append(String.format(Locale.US, "  \"coalGenerationMW\": %.1f,\n", coalGenerationMW));
            sb.append(String.format(Locale.US, "  \"transmissionEfficiencyPct\": %.2f,\n", transmissionEfficiencyPct));
            sb.append(String.format(Locale.US, "  \"transmissionLossMW\": %.1f,\n", transmissionLossMW));
            sb.append(String.format(Locale.US, "  \"carbonEmissionRateKgSec\": %.2f,\n", carbonEmissionRateKgSec));
            sb.append(String.format(Locale.US, "  \"cumulativeCarbonTons\": %.2f,\n", cumulativeCarbonTons));
            sb.append(String.format(Locale.US, "  \"gridFrequencyHz\": %.2f,\n", gridFrequencyHz));
            sb.append(String.format(Locale.US, "  \"brownoutHouseCount\": %d,\n", brownoutHouseCount));
            sb.append("  \"houses\": [\n");
            for (int i = 0; i < houseStatuses.size(); i++) {
                HouseStatusDto h = houseStatuses.get(i);
                sb.append(String.format(Locale.US, 
                    "    {\"id\": \"%s\", \"voltageV\": %.1f, \"brownoutLevel\": %.2f}%s\n",
                    h.id, h.voltageV, h.brownoutLevel, (i < houseStatuses.size() - 1 ? "," : "")
                ));
            }
            sb.append("  ]\n");
            sb.append("}");
            return sb.toString();
        }
    }

    public static class HouseStatusDto {
        public String id;
        public double voltageV;
        public double brownoutLevel; // 0.0 (Optimal) to 1.0 (Blackout)

        public HouseStatusDto(String id, double voltageV, double brownoutLevel) {
            this.id = id;
            this.voltageV = voltageV;
            this.brownoutLevel = brownoutLevel;
        }
    }

    /**
     * Residential node representing domestic load in Tamil Nadu.
     */
    public static class ResidentialNode {
        public final String id;
        public final String name;
        public final double distanceFactor; // 1 to 6 along the distribution feeder line
        public final double nominalLoadKW;

        public ResidentialNode(String id, String name, double distanceFactor, double nominalLoadKW) {
            this.id = id;
            this.name = name;
            this.distanceFactor = distanceFactor;
            this.nominalLoadKW = nominalLoadKW;
        }
    }

    public GridSimulator() {
        this.currentTimeMinutes = 720.0; // Default: 12:00 Noon
        this.cumulativeCarbonKg = 0.0;
        this.currentCoalOutputMW = 0.0;
        this.residentialHouses = new ArrayList<>();

        // Initialize 6 residential houses along the feeder branch
        residentialHouses.add(new ResidentialNode("house_1", "House 1 (Suburban Villa)", 1.0, 5.0));
        residentialHouses.add(new ResidentialNode("house_2", "House 2 (Chettinad Tiled Home)", 2.0, 4.5));
        residentialHouses.add(new ResidentialNode("house_3", "House 3 (Duplex Residence)", 3.0, 6.0));
        residentialHouses.add(new ResidentialNode("house_4", "House 4 (Bungalow - Downstream)", 4.0, 5.5));
        residentialHouses.add(new ResidentialNode("house_5", "House 5 (Rural Cottage)", 5.0, 3.5));
        residentialHouses.add(new ResidentialNode("house_6", "House 6 (Terminal Node)", 6.0, 4.0));

        // Snap initial state to noon
        setTimeMinutes(720.0);
    }

    /**
     * Calculates diurnal system demand in MW for Tamil Nadu based on typical load curve:
     * - Base load: ~13,200 MW
     * - Morning peak (08:30): Domestic + industrial shift start
     * - Evening peak (19:30): Domestic lighting, appliances, cooling peak (~16,800 MW)
     */
    public double calculateDemandMW(double timeMinutes) {
        double hours = timeMinutes / 60.0;
        double morningPeak = Math.exp(-Math.pow((hours - 8.5) / 1.5, 2.0)) * 2500.0;
        double eveningPeak = Math.exp(-Math.pow((hours - 19.5) / 1.8, 2.0)) * 3600.0;
        double baseDemand = 13200.0;
        return baseDemand + morningPeak + eveningPeak;
    }

    /**
     * Calculates Kamuthi Solar Park output based on solar zenith angle & insolation.
     * Active between 06:00 (360m) and 18:00 (1080m), peaking at 12:00.
     * At peak noon, solar generation is abundant and displaces coal completely for the regional grid.
     */
    public double calculateSolarGenerationMW(double timeMinutes, double demandMW) {
        double hours = timeMinutes / 60.0;
        if (hours < 6.0 || hours > 18.0) {
            return 0.0;
        }
        // Solar elevation angle modeled via bell curve
        double solarAngleRad = ((hours - 6.0) / 12.0) * Math.PI;
        double clearSkyInsolationFactor = Math.pow(Math.sin(solarAngleRad), 1.25);

        // At peak noon (hours ~ 12), solar meets up to 100% of active daytime demand
        return clearSkyInsolationFactor * demandMW;
    }

    /**
     * Simulates one tick / delta-time step of the grid physics.
     * 
     * @param deltaMinutes time passed in minutes
     * @return GridTelemetryDto containing live mathematical metrics
     */
    public GridTelemetryDto tick(double deltaMinutes) {
        if (deltaMinutes > 0) {
            this.currentTimeMinutes = (this.currentTimeMinutes + deltaMinutes) % 1440.0;
        }
        double hours = this.currentTimeMinutes / 60.0;

        // 1. Demand & Solar Dispatch
        double demandMW = calculateDemandMW(this.currentTimeMinutes);
        double solarGenMW = calculateSolarGenerationMW(this.currentTimeMinutes, demandMW);
        double targetCoalMW = Math.max(0.0, demandMW - solarGenMW);

        // 2. Thermal Boiler Ramp Inertia (Coal boilers cannot ramp instantly)
        if (deltaMinutes > 0) {
            double maxRampRateMWPerMin = 50.0; // ~50 MW/min ramp capability across MTPS & NCTPS
            double maxDeltaMW = maxRampRateMWPerMin * deltaMinutes;
            if (targetCoalMW > this.currentCoalOutputMW) {
                this.currentCoalOutputMW = Math.min(targetCoalMW, this.currentCoalOutputMW + maxDeltaMW);
            } else {
                this.currentCoalOutputMW = Math.max(targetCoalMW, this.currentCoalOutputMW - maxDeltaMW);
            }
        } else {
            // Instantaneous snapshot update
            this.currentCoalOutputMW = targetCoalMW;
        }

        double solarContributionMW = Math.min(demandMW, solarGenMW);
        double coalContributionMW = this.currentCoalOutputMW;
        double totalGenMW = solarContributionMW + coalContributionMW;

        // 3. Transmission Efficiency & Joule Loss (I^2 * R)
        // Solar: Local 400kV connection, high power factor -> 95.2% efficiency (4.8% loss).
        // Coal: 300+ km long-distance corridor from Mettur/Chennai -> 68.4% efficiency (31.6% loss).
        double solarWeight = totalGenMW > 0 ? (solarContributionMW / totalGenMW) : 0;
        double coalWeight = 1.0 - solarWeight;

        // Efficiency drop algorithm:
        // eta = 95.2% * solarWeight + 68.4% * coalWeight
        double transmissionEfficiencyPct = (95.2 * solarWeight) + (68.4 * coalWeight);
        double transmissionLossRatio = (100.0 - transmissionEfficiencyPct) / 100.0;
        double transmissionLossMW = demandMW * transmissionLossRatio;

        // 4. Carbon Pollution Accumulation
        // Emission rate: (coalMW * 0.92 tons/MWh) * (1000 kg / ton) / 3600 sec
        double carbonRateKgSec = (coalContributionMW * COAL_EMISSION_FACTOR_KG_PER_KWH * 1000.0) / 3600.0;
        if (deltaMinutes > 0) {
            double deltaCarbonKg = carbonRateKgSec * (deltaMinutes * 60.0);
            this.cumulativeCarbonKg += deltaCarbonKg;
        }

        // 5. Grid Frequency Dynamics (50.00 Hz nominal)
        // Thermal deficit during evening coal ramp creates frequency sag
        double frequencyHz = GRID_FREQUENCY_NOMINAL_HZ;
        if (hours >= 18.0 && hours <= 21.5) {
            frequencyHz = 49.82; // Thermal lag frequency dip
        } else if (solarWeight > 0.6) {
            frequencyHz = 50.02; // Solar abundance stability
        }

        // 6. Kirchhoff Voltage Drop & Substation Splitting across Residential Houses
        // Terminal houses (4, 5, 6) suffer brownouts when coal transmission loss is high
        int brownoutCount = 0;
        List<HouseStatusDto> houseStatuses = new ArrayList<>();

        for (ResidentialNode house : this.residentialHouses) {
            double actualVoltageV;
            double brownoutLevel;

            if (solarWeight > 0.65) {
                // Abundant solar: smooth, stable 230V to all 6 branches
                actualVoltageV = NOMINAL_VOLTAGE_LV_V;
                brownoutLevel = 0.0;
            } else {
                // Coal transmission loss causes cumulative voltage drop along feeder
                // Drop increases with distanceFactor (1 to 6)
                double dropFactor = (house.distanceFactor / 6.0) * (coalWeight * 0.72);
                actualVoltageV = Math.max(110.0, NOMINAL_VOLTAGE_LV_V * (1.0 - dropFactor * 0.55));
                brownoutLevel = Math.min(1.0, Math.max(0.0, (dropFactor - 0.18) * 1.8));

                if (brownoutLevel > 0.25) {
                    brownoutCount++;
                }
            }

            houseStatuses.add(new HouseStatusDto(house.id, actualVoltageV, brownoutLevel));
        }

        // 7. Assemble Telemetry DTO
        GridTelemetryDto dto = new GridTelemetryDto();
        dto.timeMinutes = this.currentTimeMinutes;
        int h = (int)(this.currentTimeMinutes / 60.0);
        int m = (int)(this.currentTimeMinutes % 60.0);
        String ampm = h >= 12 ? "PM" : "AM";
        int h12 = (h % 12 == 0) ? 12 : (h % 12);
        dto.formattedTime = String.format("%02d:%02d %s", h12, m, ampm);

        if (solarWeight > 0.65) {
            dto.activeSource = "Kamuthi Solar Park (Ramanathapuram)";
        } else if (coalWeight > 0.65) {
            dto.activeSource = "Mettur & North Chennai Thermal Stations";
        } else {
            dto.activeSource = "Tamil Nadu Grid Hybrid Dispatch";
        }

        dto.totalDemandMW = demandMW;
        dto.solarGenerationMW = solarContributionMW;
        dto.coalGenerationMW = coalContributionMW;
        dto.transmissionEfficiencyPct = transmissionEfficiencyPct;
        dto.transmissionLossMW = transmissionLossMW;
        dto.carbonEmissionRateKgSec = carbonRateKgSec;
        dto.cumulativeCarbonTons = this.cumulativeCarbonKg / 1000.0;
        dto.gridFrequencyHz = frequencyHz;
        dto.brownoutHouseCount = brownoutCount;
        dto.houseStatuses = houseStatuses;

        return dto;
    }

    /**
     * Jump simulator clock to specific minute (0 to 1439) and recalculate steady-state.
     */
    public void setTimeMinutes(double minutes) {
        this.currentTimeMinutes = ((minutes % 1440.0) + 1440.0) % 1440.0;
        double demand = calculateDemandMW(this.currentTimeMinutes);
        double solar = calculateSolarGenerationMW(this.currentTimeMinutes, demand);
        this.currentCoalOutputMW = Math.max(0.0, demand - solar);
    }

    /**
     * Standalone executable benchmark and simulation runner.
     * Executes a full 24-hour cycle at 1-hour intervals and prints an analytics table.
     */
    public static void main(String[] args) {
        System.out.println("==========================================================================================");
        System.out.println("            TAMIL NADU ELECTRIC GRID SIMULATION BENCHMARK (TANGEDCO/TANTRANSCO)          ");
        System.out.println("==========================================================================================");
        System.out.println(String.format("%-8s | %-12s | %-14s | %-10s | %-10s | %-12s | %-10s",
            "Time", "Demand(MW)", "Active Source", "Solar(MW)", "Coal(MW)", "Loss Eff(%)", "Brownouts"
        ));
        System.out.println("------------------------------------------------------------------------------------------");

        GridSimulator sim = new GridSimulator();
        sim.setTimeMinutes(0.0); // Start at midnight

        // Simulate 24 hours in 60-minute steps
        for (int step = 0; step < 24; step++) {
            GridTelemetryDto telemetry = sim.tick(60.0);

            String shortSource = telemetry.activeSource.contains("Solar") 
                ? "Solar (Kamuthi)" 
                : (telemetry.activeSource.contains("Mettur") ? "Coal (Mettur)" : "Hybrid Ramp");

            System.out.println(String.format(Locale.US,
                "%-8s | %10.0f MW | %-14s | %8.0f MW | %8.0f MW | %9.1f%% | %2d Houses",
                telemetry.formattedTime,
                telemetry.totalDemandMW,
                shortSource,
                telemetry.solarGenerationMW,
                telemetry.coalGenerationMW,
                telemetry.transmissionEfficiencyPct,
                telemetry.brownoutHouseCount
            ));
        }

        System.out.println("------------------------------------------------------------------------------------------");
        System.out.println(String.format(Locale.US, 
            "24-Hour Benchmark Complete. Cumulative Carbon Emissions: %.2f Metric Tons CO2.",
            sim.cumulativeCarbonKg / 1000.0
        ));
        System.out.println("\nSample REST JSON serialization output at peak noon (12:00):");
        sim.setTimeMinutes(720.0);
        GridTelemetryDto noonDto = sim.tick(0.0);
        System.out.println(noonDto.toJson());
        System.out.println("\nSample REST JSON serialization output at evening peak (19:30):");
        sim.setTimeMinutes(1170.0);
        GridTelemetryDto eveningDto = sim.tick(0.0);
        System.out.println(eveningDto.toJson());
        System.out.println("==========================================================================================");
    }
}
