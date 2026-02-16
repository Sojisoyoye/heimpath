/**
 * Application constants
 */

// German states for property location selection
export const GERMAN_STATES = [
  { code: "BW", name: "Baden-Württemberg", transferTaxRate: 5.0 },
  { code: "BY", name: "Bayern", transferTaxRate: 3.5 },
  { code: "BE", name: "Berlin", transferTaxRate: 6.0 },
  { code: "BB", name: "Brandenburg", transferTaxRate: 6.5 },
  { code: "HB", name: "Bremen", transferTaxRate: 5.0 },
  { code: "HH", name: "Hamburg", transferTaxRate: 5.5 },
  { code: "HE", name: "Hessen", transferTaxRate: 6.0 },
  { code: "MV", name: "Mecklenburg-Vorpommern", transferTaxRate: 6.0 },
  { code: "NI", name: "Niedersachsen", transferTaxRate: 5.0 },
  { code: "NW", name: "Nordrhein-Westfalen", transferTaxRate: 6.5 },
  { code: "RP", name: "Rheinland-Pfalz", transferTaxRate: 5.0 },
  { code: "SL", name: "Saarland", transferTaxRate: 6.5 },
  { code: "SN", name: "Sachsen", transferTaxRate: 5.5 },
  { code: "ST", name: "Sachsen-Anhalt", transferTaxRate: 5.0 },
  { code: "SH", name: "Schleswig-Holstein", transferTaxRate: 6.5 },
  { code: "TH", name: "Thüringen", transferTaxRate: 6.5 },
] as const;

// Property types
export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment (Eigentumswohnung)" },
  { value: "house", label: "House (Einfamilienhaus)" },
  { value: "multi_family", label: "Multi-family (Mehrfamilienhaus)" },
  { value: "commercial", label: "Commercial (Gewerbeimmobilie)" },
  { value: "land", label: "Land (Grundstück)" },
] as const;

// Financing types
export const FINANCING_TYPES = [
  { value: "cash", label: "Cash purchase (Barkauf)" },
  { value: "mortgage", label: "Mortgage (Hypothek)" },
  { value: "mixed", label: "Mixed financing" },
] as const;

// Residency status options
export const RESIDENCY_STATUS_OPTIONS = [
  { value: "german_citizen", label: "German citizen" },
  { value: "eu_citizen", label: "EU/EEA citizen" },
  { value: "non_eu_resident", label: "Non-EU resident in Germany" },
  { value: "non_resident", label: "Non-resident (living abroad)" },
] as const;

// Journey phases
export const JOURNEY_PHASES = [
  { key: "research", label: "Research", order: 1 },
  { key: "preparation", label: "Preparation", order: 2 },
  { key: "buying", label: "Buying", order: 3 },
  { key: "closing", label: "Closing", order: 4 },
] as const;

// Law categories
export const LAW_CATEGORIES = [
  { key: "buying_process", label: "Buying Process", icon: "FileText" },
  { key: "costs_and_taxes", label: "Costs & Taxes", icon: "Calculator" },
  { key: "rental_law", label: "Rental & Landlord Law", icon: "Home" },
  { key: "condominium", label: "Condominium Ownership", icon: "Building" },
  { key: "agent_regulations", label: "Agent Regulations", icon: "Users" },
] as const;

// Cost calculation constants
export const COST_DEFAULTS = {
  NOTARY_FEE_PERCENT: 1.5,
  LAND_REGISTRY_FEE_PERCENT: 0.5,
  AGENT_COMMISSION_PERCENT: 3.57, // Buyer's share after Bestellerprinzip
  RENOVATION_ESTIMATE_PERCENT: 5.0, // Estimated renovation costs
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Re-export property goals constants
export * from "./propertyGoals";
export * from "./propertyEvaluation";
