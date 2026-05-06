// Aircraft Specs for Simulation
const AIRCRAFT_SPECS = {
  // Fighters
  "F-22 Raptor": {
    category: "fighter", country: "USA", icon: "🦅",
    speed_kmh: 1960, range_km: 2960, cruise_speed: 1480,
    fuel_capacity_L: 8200, fuel_burn_L_per_km: 2.8,
    payload_kg: 2268, payload_desc: "AIM-120, AIM-9, 2x GBU-32",
    crew: 1, stealth: true
  },
  "F-35A Lightning II": {
    category: "fighter", country: "USA", icon: "⚡",
    speed_kmh: 1960, range_km: 2800, cruise_speed: 1200,
    fuel_capacity_L: 8960, fuel_burn_L_per_km: 3.2,
    payload_kg: 8160, payload_desc: "AIM-120, JDAM, GBU-31",
    crew: 1, stealth: true
  },
  "F-16 Fighting Falcon": {
    category: "fighter", country: "USA", icon: "🦊",
    speed_kmh: 2124, range_km: 3900, cruise_speed: 1100,
    fuel_capacity_L: 3200, fuel_burn_L_per_km: 0.8,
    payload_kg: 7700, payload_desc: "AIM-9, AIM-120, Mk-82, AGM-65",
    crew: 1, stealth: false
  },
  "B-2 Spirit": {
    category: "bomber", country: "USA", icon: "👻",
    speed_kmh: 1010, range_km: 11000, cruise_speed: 900,
    fuel_capacity_L: 75750, fuel_burn_L_per_km: 6.9,
    payload_kg: 18000, payload_desc: "B61-12, GBU-57A/B MOP, JDAM",
    crew: 2, stealth: true
  },
  "B-52 Stratofortress": {
    category: "bomber", country: "USA", icon: "🐢",
    speed_kmh: 1013, range_km: 14080, cruise_speed: 819,
    fuel_capacity_L: 181000, fuel_burn_L_per_km: 12.9,
    payload_kg: 31500, payload_desc: "AGM-86C, B28, Mk-82, AGM-158",
    crew: 5, stealth: false
  },
  "C-17 Globemaster": {
    category: "transport", country: "USA", icon: "🚛",
    speed_kmh: 830, range_km: 4480, cruise_speed: 780,
    fuel_capacity_L: 134556, fuel_burn_L_per_km: 30.1,
    payload_kg: 77519, payload_desc: "Tanks, vehicles, troops, humanitarian aid",
    crew: 3, stealth: false
  },
  "Su-57 Felon": {
    category: "fighter", country: "Russia", icon: "🦁",
    speed_kmh: 2600, range_km: 3500, cruise_speed: 1800,
    fuel_capacity_L: 11100, fuel_burn_L_per_km: 3.2,
    payload_kg: 7000, payload_desc: "R-77, R-74, KH-59MK2",
    crew: 1, stealth: true
  },
  "Su-35S Flanker-E": {
    category: "fighter", country: "Russia", icon: "🐻",
    speed_kmh: 2500, range_km: 3600, cruise_speed: 1400,
    fuel_capacity_L: 11500, fuel_burn_L_per_km: 3.2,
    payload_kg: 8000, payload_desc: "R-27, R-73, Kh-29, Kh-59",
    crew: 1, stealth: false
  },
  "Tu-160 Blackjack": {
    category: "bomber", country: "Russia", icon: "🐋",
    speed_kmh: 2220, range_km: 12300, cruise_speed: 960,
    fuel_capacity_L: 171000, fuel_burn_L_per_km: 13.9,
    payload_kg: 45000, payload_desc: "Kh-55SM, Kh-101/102, Kh-15",
    crew: 4, stealth: false
  },
  "J-20 Mighty Dragon": {
    category: "fighter", country: "China", icon: "🐉",
    speed_kmh: 2100, range_km: 2000, cruise_speed: 1400,
    fuel_capacity_L: 11000, fuel_burn_L_per_km: 5.5,
    payload_kg: 11000, payload_desc: "PL-15, PL-10, YJ-12",
    crew: 1, stealth: true
  },
  "JF-17 Thunder": {
    category: "fighter", country: "Pakistan", icon: "⚡",
    speed_kmh: 1960, range_km: 3480, cruise_speed: 1200,
    fuel_capacity_L: 2310, fuel_burn_L_per_km: 0.7,
    payload_kg: 3700, payload_desc: "PL-5, PL-12, C-802A",
    crew: 1, stealth: false
  },
  "Rafale": {
    category: "fighter", country: "France", icon: "🐓",
    speed_kmh: 1912, range_km: 3700, cruise_speed: 1100,
    fuel_capacity_L: 4700, fuel_burn_L_per_km: 1.3,
    payload_kg: 9500, payload_desc: "MICA, Meteor, ASMP-A, HAMMER",
    crew: 2, stealth: false
  },
  "Eurofighter Typhoon": {
    category: "fighter", country: "Germany", icon: "🌪️",
    speed_kmh: 2495, range_km: 2900, cruise_speed: 1300,
    fuel_capacity_L: 4996, fuel_burn_L_per_km: 1.7,
    payload_kg: 7500, payload_desc: "Meteor, IRIS-T, Storm Shadow, Brimstone",
    crew: 2, stealth: false
  },
  "F/A-18E Super Hornet": {
    category: "fighter", country: "USA", icon: "🐝",
    speed_kmh: 1915, range_km: 2346, cruise_speed: 1100,
    fuel_capacity_L: 6355, fuel_burn_L_per_km: 2.7,
    payload_kg: 8051, payload_desc: "AIM-120, AIM-9X, JDAM, SLAM-ER",
    crew: 2, stealth: false
  },
  "TB2 Bayraktar": {
    category: "drone", country: "Turkey", icon: "🇹🇷",
    speed_kmh: 222, range_km: 150, cruise_speed: 130,
    fuel_capacity_L: 300, fuel_burn_L_per_km: 2.0,
    payload_kg: 55, payload_desc: "MAM-L, MAM-C, Roketsan TRLG-230",
    crew: 0, stealth: false
  },
  "MQ-9 Reaper": {
    category: "drone", country: "USA", icon: "👁️",
    speed_kmh: 482, range_km: 1852, cruise_speed: 280,
    fuel_capacity_L: 1300, fuel_burn_L_per_km: 0.7,
    payload_kg: 1700, payload_desc: "AGM-114 Hellfire, GBU-12, GBU-38",
    crew: 0, stealth: false
  },
  "A400M Atlas": {
    category: "transport", country: "France", icon: "🐘",
    speed_kmh: 780, range_km: 4540, cruise_speed: 720,
    fuel_capacity_L: 50500, fuel_burn_L_per_km: 11.1,
    payload_kg: 37000, payload_desc: "Vehicles, troops, paratroopers, cargo",
    crew: 3, stealth: false
  },
  "KC-135 Stratotanker": {
    category: "tanker", country: "USA", icon: "⛽",
    speed_kmh: 933, range_km: 14800, cruise_speed: 850,
    fuel_capacity_L: 90719, fuel_burn_L_per_km: 6.1,
    payload_kg: 83250, payload_desc: "Fuel transfer: 68,000L transferable",
    crew: 4, stealth: false
  },
  "Su-25 Frogfoot": {
    category: "attack", country: "Russia", icon: "🦖",
    speed_kmh: 950, range_km: 750, cruise_speed: 750,
    fuel_capacity_L: 3600, fuel_burn_L_per_km: 4.8,
    payload_kg: 4400, payload_desc: "Kh-25, FAB-500, S-24B rockets",
    crew: 1, stealth: false
  },
  "F-15E Strike Eagle": {
    category: "fighter", country: "USA", icon: "🦅",
    speed_kmh: 2655, range_km: 3900, cruise_speed: 1300,
    fuel_capacity_L: 13400, fuel_burn_L_per_km: 3.4,
    payload_kg: 10400, payload_desc: "JDAM, AIM-120, EGBU-28, AGM-130",
    crew: 2, stealth: false
  },
};

window.AIRCRAFT_SPECS = AIRCRAFT_SPECS;
