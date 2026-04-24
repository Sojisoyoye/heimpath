/**
 * Centralized color tokens for HeimPath
 * Group base colors, expose through semantic buckets
 */

const Base = {
  Grey: {
    UltraLight: "#f2f2f2",
    Lighter: "#e5e5e5",
    Light: "#d1d5db",
    Default: "#808080",
    Dark: "#4b5563",
    UltraDark: "#1f2937",
  },
  Blue: {
    Light: "#93c5fd",
    Default: "#3b82f6",
    Dark: "#1d4ed8",
  },
  Green: {
    Light: "#86efac",
    Default: "#22c55e",
    Dark: "#15803d",
  },
  Red: {
    Light: "#fca5a5",
    Default: "#ef4444",
    Dark: "#b91c1c",
  },
  Yellow: {
    Light: "#fde047",
    Default: "#eab308",
    Dark: "#a16207",
  },
  Amber: {
    Light: "#fbbf24",
    Default: "#f59e0b",
    Dark: "#d97706",
  },
  Orange: {
    Light: "#fdba74",
    Default: "#f97316",
    Dark: "#c2410c",
  },
  Purple: {
    Light: "#d8b4fe",
    Default: "#a855f7",
    Dark: "#7e22ce",
  },
  Teal: {
    Default: "#14b8a6",
  },
  Indigo: {
    Default: "#6366f1",
  },
  Cyan: {
    Default: "#06b6d4",
  },
  Rose: {
    Default: "#f43f5e",
  },
  Emerald: {
    Default: "#10b981",
  },
} as const

const Colors = {
  // Background colors
  Background: {
    Default: "#ffffff",
    Secondary: Base.Grey.UltraLight,
    Hover: Base.Grey.Lighter,
    Active: Base.Grey.Light,
    Error: Base.Red.Light,
    Success: Base.Green.Light,
    Warning: Base.Yellow.Light,
  },

  // Text colors
  Text: {
    Primary: Base.Grey.UltraDark,
    Secondary: Base.Grey.Dark,
    Muted: Base.Grey.Default,
    Inverse: "#ffffff",
    Error: Base.Red.Dark,
    Success: Base.Green.Dark,
    Warning: Base.Yellow.Dark,
  },

  // Border colors
  Border: {
    Default: Base.Grey.Light,
    Focus: Base.Blue.Default,
    Error: Base.Red.Default,
    Success: Base.Green.Default,
  },

  // Brand colors (HeimPath specific)
  Brand: {
    Primary: Base.Blue.Default,
    PrimaryHover: Base.Blue.Dark,
    Secondary: Base.Purple.Default,
    SecondaryHover: Base.Purple.Dark,
  },

  // Journey phase colors
  Journey: {
    Research: Base.Blue.Default,
    Preparation: Base.Purple.Default,
    Buying: Base.Orange.Default,
    Closing: Base.Green.Default,
    Ownership: Base.Amber.Default,
    RentalSetup: Base.Teal.Default,
    RentalSearch: Base.Indigo.Default,
    RentalApplication: Base.Cyan.Default,
    RentalContract: Base.Rose.Default,
    RentalMoveIn: Base.Emerald.Default,
  },

  // Status colors
  Status: {
    NotStarted: Base.Grey.Default,
    InProgress: Base.Blue.Default,
    Completed: Base.Amber.Default,
    Skipped: Base.Grey.Light,
  },

  // Chart series colors
  Chart: {
    Blue: Base.Blue.Default,
    Green: Base.Green.Default,
    Amber: Base.Amber.Default,
    Purple: Base.Purple.Default,
  },
} as const

export default Colors
