import type { ChecklistCategory } from "@/models/viewing"

export const DEFAULT_CHECKLIST: ChecklistCategory[] = [
  {
    id: "structure",
    label: "Structure & Condition",
    items: [
      {
        id: "roof",
        label: "Roof condition (no visible damage or sagging)",
        checked: false,
        notes: "",
      },
      {
        id: "facade",
        label: "Facade free of cracks or staining",
        checked: false,
        notes: "",
      },
      {
        id: "basement",
        label: "Basement dry (no moisture or mould)",
        checked: false,
        notes: "",
      },
      {
        id: "windows",
        label: "Windows and doors fit, seal, and lock properly",
        checked: false,
        notes: "",
      },
      {
        id: "floors",
        label: "Floors level and free of noticeable damage",
        checked: false,
        notes: "",
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilities & Systems",
    items: [
      {
        id: "heating",
        label: "Heating type and approximate age noted",
        checked: false,
        notes: "",
      },
      {
        id: "hot_water",
        label: "Hot water system functioning and age noted",
        checked: false,
        notes: "",
      },
      {
        id: "electrics",
        label: "Electrical panel age and capacity checked",
        checked: false,
        notes: "",
      },
      {
        id: "broadband",
        label: "Broadband availability confirmed (fibre/DSL)",
        checked: false,
        notes: "",
      },
      {
        id: "ventilation",
        label: "Ventilation adequate (no condensation or odours)",
        checked: false,
        notes: "",
      },
    ],
  },
  {
    id: "legal",
    label: "Legal & Ownership",
    items: [
      {
        id: "grundbuch",
        label: "Grundbuch excerpt available and reviewed",
        checked: false,
        notes: "",
      },
      {
        id: "teilung",
        label: "Teilungserklärung available (for WEG/condominium)",
        checked: false,
        notes: "",
      },
      {
        id: "hausgeld",
        label: "No outstanding Hausgeld arrears confirmed",
        checked: false,
        notes: "",
      },
      {
        id: "denkmal",
        label: "Listed building (Denkmalschutz) status clarified",
        checked: false,
        notes: "",
      },
      {
        id: "easements",
        label: "Easements or encumbrances on the Grundbuch noted",
        checked: false,
        notes: "",
      },
    ],
  },
  {
    id: "paperwork",
    label: "Paperwork & Documentation",
    items: [
      {
        id: "energieausweis",
        label: "Energieausweis (energy certificate) provided",
        checked: false,
        notes: "",
      },
      {
        id: "floor_plan",
        label: "Accurate floor plan available",
        checked: false,
        notes: "",
      },
      {
        id: "renovation",
        label: "Last renovation records available",
        checked: false,
        notes: "",
      },
      {
        id: "hausgeld_abrechnung",
        label: "Hausgeldabrechnungen (last 3 years) available",
        checked: false,
        notes: "",
      },
    ],
  },
  {
    id: "neighbourhood",
    label: "Neighbourhood & Location",
    items: [
      {
        id: "transport",
        label: "Public transport within walking distance",
        checked: false,
        notes: "",
      },
      {
        id: "schools",
        label: "Schools and kindergartens accessible",
        checked: false,
        notes: "",
      },
      {
        id: "supermarket",
        label: "Supermarket within reasonable distance",
        checked: false,
        notes: "",
      },
      {
        id: "noise",
        label: "Noise level acceptable at time of visit",
        checked: false,
        notes: "",
      },
      {
        id: "parking",
        label: "Parking situation assessed",
        checked: false,
        notes: "",
      },
    ],
  },
]
