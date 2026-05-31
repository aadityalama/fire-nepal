export type NepalCostLocationId = string;

export type CostCategory = "housing" | "food" | "transport" | "utilities" | "healthcare" | "entertainment";

export type LifestyleCost = Record<CostCategory, number>;

export type NepalCostLocation = {
  id: NepalCostLocationId;
  label: string;
  shortLabel: string;
  latitude?: number;
  longitude?: number;
  healthcareScore: number;
  climateScore: number;
  connectivityScore: number;
  safetyScore: number;
  lifestyleNote: string;
  costs: LifestyleCost;
};

export const NEPAL_COST_STORAGE_KEY = "fire-nepal-cost-city-database-v1";

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  housing: "Housing",
  food: "Food",
  transport: "Transport",
  utilities: "Utilities",
  healthcare: "Healthcare",
  entertainment: "Entertainment",
};

export const COST_CATEGORY_FIELDS: CostCategory[] = [
  "housing",
  "food",
  "transport",
  "utilities",
  "healthcare",
  "entertainment",
];

export const DEFAULT_COMPARISON_CITY_IDS: NepalCostLocationId[] = ["kathmandu", "pokhara", "chitwan"];

export const DEFAULT_NEPAL_COST_CITIES: NepalCostLocation[] = [
  {
    id: "kathmandu",
    label: "Kathmandu",
    shortLabel: "KTM",
    latitude: 27.7172,
    longitude: 85.324,
    healthcareScore: 96,
    climateScore: 72,
    connectivityScore: 98,
    safetyScore: 78,
    lifestyleNote: "Capital-city access with higher housing and education pressure.",
    costs: { housing: 25000, food: 18000, transport: 7000, utilities: 5000, healthcare: 5000, entertainment: 5000 },
  },
  {
    id: "lalitpur",
    label: "Lalitpur",
    shortLabel: "LTP",
    latitude: 27.6588,
    longitude: 85.3247,
    healthcareScore: 92,
    climateScore: 75,
    connectivityScore: 94,
    safetyScore: 82,
    lifestyleNote: "Premium valley lifestyle with strong services and slightly calmer neighborhoods.",
    costs: { housing: 23000, food: 17500, transport: 6500, utilities: 5000, healthcare: 5200, entertainment: 4800 },
  },
  {
    id: "bhaktapur",
    label: "Bhaktapur",
    shortLabel: "BKT",
    latitude: 27.671,
    longitude: 85.4298,
    healthcareScore: 84,
    climateScore: 78,
    connectivityScore: 86,
    safetyScore: 86,
    lifestyleNote: "Cultural valley base with lower rent than central Kathmandu.",
    costs: { housing: 18000, food: 16000, transport: 5500, utilities: 4500, healthcare: 4500, entertainment: 3500 },
  },
  {
    id: "pokhara",
    label: "Pokhara",
    shortLabel: "PKR",
    latitude: 28.2096,
    longitude: 83.9856,
    healthcareScore: 86,
    climateScore: 94,
    connectivityScore: 82,
    safetyScore: 88,
    lifestyleNote: "Lower rent, slower pace, and strong quality-of-life upside.",
    costs: { housing: 18500, food: 15500, transport: 5200, utilities: 4300, healthcare: 4300, entertainment: 3200 },
  },
  {
    id: "chitwan",
    label: "Chitwan",
    shortLabel: "CTW",
    latitude: 27.5291,
    longitude: 84.3542,
    healthcareScore: 84,
    climateScore: 78,
    connectivityScore: 86,
    safetyScore: 84,
    lifestyleNote: "Balanced urban access with lower everyday living costs.",
    costs: { housing: 15500, food: 14000, transport: 4500, utilities: 3800, healthcare: 3900, entertainment: 2500 },
  },
  {
    id: "hetauda",
    label: "Hetauda",
    shortLabel: "HTD",
    latitude: 27.4284,
    longitude: 85.0322,
    healthcareScore: 78,
    climateScore: 80,
    connectivityScore: 83,
    safetyScore: 82,
    lifestyleNote: "Strategic corridor city near Kathmandu with practical family costs.",
    costs: { housing: 15000, food: 13500, transport: 4500, utilities: 3700, healthcare: 3600, entertainment: 2500 },
  },
  {
    id: "butwal",
    label: "Butwal",
    shortLabel: "BTW",
    latitude: 27.7006,
    longitude: 83.4484,
    healthcareScore: 78,
    climateScore: 76,
    connectivityScore: 83,
    safetyScore: 82,
    lifestyleNote: "Practical family base with strong regional connectivity.",
    costs: { housing: 14500, food: 13500, transport: 4200, utilities: 3600, healthcare: 3600, entertainment: 2400 },
  },
  {
    id: "dharan",
    label: "Dharan",
    shortLabel: "DRN",
    latitude: 26.812,
    longitude: 87.2833,
    healthcareScore: 82,
    climateScore: 86,
    connectivityScore: 75,
    safetyScore: 83,
    lifestyleNote: "Healthcare access and hill-city lifestyle at a leaner cost.",
    costs: { housing: 15000, food: 13800, transport: 4300, utilities: 3600, healthcare: 3900, entertainment: 2400 },
  },
  {
    id: "biratnagar",
    label: "Biratnagar",
    shortLabel: "BRT",
    latitude: 26.4525,
    longitude: 87.2718,
    healthcareScore: 80,
    climateScore: 70,
    connectivityScore: 82,
    safetyScore: 78,
    lifestyleNote: "Terai city living with lower service and housing costs.",
    costs: { housing: 15500, food: 14000, transport: 4500, utilities: 3800, healthcare: 4000, entertainment: 2600 },
  },
  {
    id: "itahari",
    label: "Itahari",
    shortLabel: "ITH",
    latitude: 26.66,
    longitude: 87.274,
    healthcareScore: 76,
    climateScore: 74,
    connectivityScore: 84,
    safetyScore: 80,
    lifestyleNote: "Fast-growing eastern junction city with efficient daily costs.",
    costs: { housing: 14000, food: 13200, transport: 4200, utilities: 3500, healthcare: 3600, entertainment: 2300 },
  },
  {
    id: "janakpur",
    label: "Janakpur",
    shortLabel: "JNK",
    latitude: 26.7288,
    longitude: 85.9263,
    healthcareScore: 72,
    climateScore: 69,
    connectivityScore: 78,
    safetyScore: 77,
    lifestyleNote: "Cultural Terai base with modest rent and family-oriented expenses.",
    costs: { housing: 13000, food: 12500, transport: 4000, utilities: 3400, healthcare: 3300, entertainment: 2200 },
  },
  {
    id: "nepalgunj",
    label: "Nepalgunj",
    shortLabel: "NPJ",
    latitude: 28.05,
    longitude: 81.6167,
    healthcareScore: 72,
    climateScore: 70,
    connectivityScore: 76,
    safetyScore: 76,
    lifestyleNote: "Regional hub economics with low housing overhead.",
    costs: { housing: 13000, food: 12500, transport: 3900, utilities: 3400, healthcare: 3400, entertainment: 2100 },
  },
  {
    id: "dhangadhi",
    label: "Dhangadhi",
    shortLabel: "DHD",
    latitude: 28.6852,
    longitude: 80.6216,
    healthcareScore: 70,
    climateScore: 70,
    connectivityScore: 73,
    safetyScore: 76,
    lifestyleNote: "Far-west urban base with low rent and improving services.",
    costs: { housing: 12500, food: 12000, transport: 3800, utilities: 3200, healthcare: 3300, entertainment: 2000 },
  },
  {
    id: "birgunj",
    label: "Birgunj",
    shortLabel: "BRG",
    latitude: 27.0104,
    longitude: 84.8774,
    healthcareScore: 76,
    climateScore: 68,
    connectivityScore: 86,
    safetyScore: 76,
    lifestyleNote: "Major trade corridor city with strong access and practical costs.",
    costs: { housing: 15000, food: 13500, transport: 4200, utilities: 3600, healthcare: 3700, entertainment: 2500 },
  },
  {
    id: "tulsipur",
    label: "Tulsipur",
    shortLabel: "TLP",
    latitude: 28.1306,
    longitude: 82.2973,
    healthcareScore: 66,
    climateScore: 76,
    connectivityScore: 68,
    safetyScore: 78,
    lifestyleNote: "Lower-cost mid-west city with a quieter retirement profile.",
    costs: { housing: 11000, food: 11200, transport: 3400, utilities: 3000, healthcare: 2900, entertainment: 1700 },
  },
  {
    id: "surkhet",
    label: "Surkhet",
    shortLabel: "SKT",
    latitude: 28.6019,
    longitude: 81.6339,
    healthcareScore: 68,
    climateScore: 80,
    connectivityScore: 70,
    safetyScore: 79,
    lifestyleNote: "Karnali gateway with affordable housing and improving infrastructure.",
    costs: { housing: 11500, food: 11500, transport: 3500, utilities: 3100, healthcare: 3000, entertainment: 1800 },
  },
  {
    id: "bharatpur",
    label: "Bharatpur",
    shortLabel: "BHP",
    latitude: 27.6833,
    longitude: 84.4333,
    healthcareScore: 86,
    climateScore: 78,
    connectivityScore: 88,
    safetyScore: 84,
    lifestyleNote: "Hospital access and central connectivity with moderate living costs.",
    costs: { housing: 16000, food: 14200, transport: 4600, utilities: 3800, healthcare: 4200, entertainment: 2600 },
  },
  {
    id: "rural-nepal",
    label: "Rural Nepal",
    shortLabel: "Rural",
    healthcareScore: 55,
    climateScore: 84,
    connectivityScore: 52,
    safetyScore: 82,
    lifestyleNote: "Land, family support, and simpler living can compress FIRE needs.",
    costs: { housing: 7000, food: 9500, transport: 2500, utilities: 2200, healthcare: 2200, entertainment: 1000 },
  },
];

export function createCityId(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `custom-city-${Date.now()}`;
}

export function createBlankCity(label = "New City"): NepalCostLocation {
  return {
    id: createCityId(label),
    label,
    shortLabel: label
      .replace(/[^A-Za-z]/g, "")
      .slice(0, 3)
      .toUpperCase() || "NEW",
    healthcareScore: 70,
    climateScore: 75,
    connectivityScore: 70,
    safetyScore: 78,
    lifestyleNote: "Custom Nepal location. Edit costs, scores, and coordinates as needed.",
    costs: { housing: 12000, food: 12000, transport: 3500, utilities: 3000, healthcare: 3000, entertainment: 2000 },
  };
}

export function normalizeCityDatabase(input: unknown): NepalCostLocation[] {
  if (!Array.isArray(input)) return DEFAULT_NEPAL_COST_CITIES;

  const normalized = input
    .map<NepalCostLocation | null>((raw) => {
      if (!raw || typeof raw !== "object") return null;
      const city = raw as Partial<NepalCostLocation>;
      const label = typeof city.label === "string" && city.label.trim() ? city.label.trim() : "Custom City";
      const costs = city.costs ?? createBlankCity(label).costs;

      return {
        ...createBlankCity(label),
        ...city,
        id: typeof city.id === "string" && city.id.trim() ? city.id : createCityId(label),
        label,
        shortLabel: typeof city.shortLabel === "string" && city.shortLabel.trim() ? city.shortLabel.trim().slice(0, 6) : label.slice(0, 3).toUpperCase(),
        latitude: Number.isFinite(Number(city.latitude)) ? Number(city.latitude) : undefined,
        longitude: Number.isFinite(Number(city.longitude)) ? Number(city.longitude) : undefined,
        healthcareScore: clampScore(city.healthcareScore),
        climateScore: clampScore(city.climateScore),
        connectivityScore: clampScore(city.connectivityScore),
        safetyScore: clampScore(city.safetyScore),
        lifestyleNote: typeof city.lifestyleNote === "string" ? city.lifestyleNote : "",
        costs: Object.fromEntries(
          COST_CATEGORY_FIELDS.map((category) => [category, Math.max(0, Math.round(Number(costs[category] ?? 0)))]),
        ) as LifestyleCost,
      };
    })
    .filter((city): city is NepalCostLocation => city != null);

  return normalized.length > 0 ? normalized : DEFAULT_NEPAL_COST_CITIES;
}

function clampScore(value: unknown): number {
  return Math.max(0, Math.min(100, Math.round(Number(value ?? 70))));
}
