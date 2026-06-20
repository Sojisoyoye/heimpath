/** Testimonial data — update this file when real testimonials are collected. */

export interface ITestimonial {
  quote: string
  name: string
  country: string
  city: string
  feature: string
  month: string
  isReal: boolean
}

export const testimonials: ITestimonial[] = [
  {
    quote:
      "HeimPath showed me I was looking at the wrong state entirely. Moving my search from Berlin to Saxony saved me €12,000 in transfer tax alone — I never would have found that comparison on my own.",
    name: "Chidi O.",
    country: "🇳🇬",
    city: "Frankfurt",
    feature: "State Comparison Calculator",
    month: "June 2026",
    isReal: false,
  },
  {
    quote:
      "I spent six months confused by German property law. HeimPath's English explanations and the guided journey meant I finally understood the Kaufvertrag before I signed it. That confidence alone was worth it.",
    name: "Priya S.",
    country: "🇮🇳",
    city: "Munich",
    feature: "Contract Explainer & Guided Journey",
    month: "June 2026",
    isReal: false,
  },
  {
    quote:
      "The AfA depreciation calculator showed me I could claim back €4,200 per year on a €380,000 apartment in Leipzig. My accountant confirmed it. Nobody told me this was possible before HeimPath.",
    name: "Ahmed K.",
    country: "🇪🇬",
    city: "Berlin",
    feature: "AfA Depreciation Calculator",
    month: "June 2026",
    isReal: false,
  },
]
