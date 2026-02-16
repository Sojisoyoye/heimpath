/**
 * Property Goals Constants
 * Options for Step 1: Define Your Property Goals
 */

export const ROOM_OPTIONS = [
  { value: 1, label: "1 Room" },
  { value: 2, label: "2 Rooms" },
  { value: 3, label: "3 Rooms" },
  { value: 4, label: "4 Rooms" },
  { value: 5, label: "5+ Rooms" },
] as const

export const BATHROOM_OPTIONS = [
  { value: 1, label: "1 Bathroom" },
  { value: 2, label: "2 Bathrooms" },
  { value: 3, label: "3+ Bathrooms" },
] as const

export const FLOOR_OPTIONS = [
  { value: "ground", label: "Ground Floor (Erdgeschoss)" },
  { value: "middle", label: "Middle Floors (1-3)" },
  { value: "top", label: "Top Floor (Dachgeschoss)" },
  { value: "any", label: "Any Floor" },
] as const

export const PROPERTY_FEATURES = [
  { value: "balcony", label: "Balcony / Terrace", icon: "Sun" },
  { value: "garden", label: "Garden", icon: "Flower2" },
  { value: "parking", label: "Parking / Garage", icon: "Car" },
  { value: "storage", label: "Storage Room (Keller)", icon: "Package" },
  { value: "modern_kitchen", label: "Modern Kitchen", icon: "ChefHat" },
  { value: "energy_efficient", label: "Energy Efficient", icon: "Leaf" },
  { value: "new_building", label: "New Building (Neubau)", icon: "Building2" },
  { value: "renovated", label: "Recently Renovated", icon: "Hammer" },
  { value: "quiet_location", label: "Quiet Location", icon: "Volume2" },
  { value: "good_transport", label: "Good Public Transport", icon: "Train" },
  {
    value: "wheelchair_accessible",
    label: "Wheelchair Accessible",
    icon: "Accessibility",
  },
  { value: "pets_allowed", label: "Pets Allowed", icon: "Dog" },
] as const

export const SIZE_RANGES = [
  { min: 30, max: 50, label: "30-50 m² (Studio/1BR)" },
  { min: 50, max: 70, label: "50-70 m² (Small Apt)" },
  { min: 70, max: 100, label: "70-100 m² (Medium Apt)" },
  { min: 100, max: 150, label: "100-150 m² (Large Apt/House)" },
  { min: 150, max: 300, label: "150+ m² (Large House)" },
] as const

/**
 * Market data constants for Step 2: Market Insights
 * Average prices per sqm by German state (2024 estimates)
 */
export const MARKET_DATA_BY_STATE: Record<
  string,
  {
    avgPricePerSqm: number
    priceRange: { min: number; max: number }
    agentFeePercent: number
    trend: "rising" | "stable" | "falling"
    hotspots: string[]
  }
> = {
  BW: {
    avgPricePerSqm: 3800,
    priceRange: { min: 2500, max: 6000 },
    agentFeePercent: 3.57,
    trend: "stable",
    hotspots: ["Stuttgart", "Freiburg", "Karlsruhe"],
  },
  BY: {
    avgPricePerSqm: 4500,
    priceRange: { min: 2800, max: 9000 },
    agentFeePercent: 3.57,
    trend: "stable",
    hotspots: ["Munich", "Nuremberg", "Augsburg"],
  },
  BE: {
    avgPricePerSqm: 5200,
    priceRange: { min: 3500, max: 8000 },
    agentFeePercent: 3.57,
    trend: "rising",
    hotspots: ["Mitte", "Prenzlauer Berg", "Kreuzberg"],
  },
  BB: {
    avgPricePerSqm: 2800,
    priceRange: { min: 1800, max: 4500 },
    agentFeePercent: 3.57,
    trend: "rising",
    hotspots: ["Potsdam", "Cottbus", "Brandenburg an der Havel"],
  },
  HB: {
    avgPricePerSqm: 2900,
    priceRange: { min: 2000, max: 4500 },
    agentFeePercent: 2.98,
    trend: "stable",
    hotspots: ["Bremen-Mitte", "Schwachhausen", "Horn-Lehe"],
  },
  HH: {
    avgPricePerSqm: 5800,
    priceRange: { min: 4000, max: 10000 },
    agentFeePercent: 3.12,
    trend: "stable",
    hotspots: ["Eppendorf", "Winterhude", "Eimsbüttel"],
  },
  HE: {
    avgPricePerSqm: 3600,
    priceRange: { min: 2200, max: 7000 },
    agentFeePercent: 2.98,
    trend: "stable",
    hotspots: ["Frankfurt", "Wiesbaden", "Darmstadt"],
  },
  MV: {
    avgPricePerSqm: 2200,
    priceRange: { min: 1400, max: 4000 },
    agentFeePercent: 2.98,
    trend: "rising",
    hotspots: ["Rostock", "Schwerin", "Greifswald"],
  },
  NI: {
    avgPricePerSqm: 2600,
    priceRange: { min: 1800, max: 4500 },
    agentFeePercent: 2.98,
    trend: "stable",
    hotspots: ["Hannover", "Braunschweig", "Oldenburg"],
  },
  NW: {
    avgPricePerSqm: 3200,
    priceRange: { min: 2000, max: 6000 },
    agentFeePercent: 3.57,
    trend: "stable",
    hotspots: ["Düsseldorf", "Cologne", "Münster"],
  },
  RP: {
    avgPricePerSqm: 2400,
    priceRange: { min: 1600, max: 4000 },
    agentFeePercent: 2.98,
    trend: "stable",
    hotspots: ["Mainz", "Koblenz", "Trier"],
  },
  SL: {
    avgPricePerSqm: 2000,
    priceRange: { min: 1400, max: 3200 },
    agentFeePercent: 3.57,
    trend: "stable",
    hotspots: ["Saarbrücken", "Neunkirchen", "Homburg"],
  },
  SN: {
    avgPricePerSqm: 2400,
    priceRange: { min: 1600, max: 4000 },
    agentFeePercent: 2.98,
    trend: "rising",
    hotspots: ["Leipzig", "Dresden", "Chemnitz"],
  },
  ST: {
    avgPricePerSqm: 1800,
    priceRange: { min: 1200, max: 3000 },
    agentFeePercent: 2.98,
    trend: "stable",
    hotspots: ["Magdeburg", "Halle", "Dessau"],
  },
  SH: {
    avgPricePerSqm: 3000,
    priceRange: { min: 2000, max: 5500 },
    agentFeePercent: 3.57,
    trend: "stable",
    hotspots: ["Kiel", "Lübeck", "Flensburg"],
  },
  TH: {
    avgPricePerSqm: 1900,
    priceRange: { min: 1300, max: 3200 },
    agentFeePercent: 2.98,
    trend: "stable",
    hotspots: ["Erfurt", "Jena", "Weimar"],
  },
}

/**
 * Property type price multipliers
 * Relative to apartment prices
 */
export const PROPERTY_TYPE_MULTIPLIERS: Record<string, number> = {
  apartment: 1.0,
  house: 1.3,
  multi_family: 1.5,
  commercial: 1.4,
  land: 0.4,
}
