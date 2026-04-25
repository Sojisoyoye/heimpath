# HeimPath Changelog

All notable changes to HeimPath are documented here, grouped by feature area and milestone.

---

## [Unreleased]

---

## April 2026 — Exit Planning & Calculator Completeness

### Added

- **Speculation Tax Calculator (§ 23 EStG)** — Calculates German capital-gains tax liability on property sales within 10 years of purchase. Covers three exemption cases (10-year holding rule, primary residence, Freigrenze), displays a 12-year net proceeds projection with a stacked bar chart, and shows a clear "Tax-Free" threshold at Year 10. Targeted at foreign investors who are often unaware of this exit-strategy cost. (#204)
- **Rent Estimate tab (Mietspiegel)** — Estimates monthly rent for a property by postcode using local Mietspiegel data. Integrated with ROI Calculator via a CTA that pre-fills the monthly rent field. (#201, #202)
- **Saved / Favourited Professionals** — Users can save professionals to a personal favourites list with a single click and revisit them from their profile. (#199)
- **Non-Citizen Mortgage Eligibility Guide** — Step-by-step guide helping non-EU residents understand German bank requirements, required documents, typical LTV limits, and lender options. (#198)
- **Purchase Price Extraction from Contracts** — AI extracts the purchase price from an uploaded Kaufvertrag and offers a one-click link to the Property Evaluation calculator with the value pre-filled. (#197)
- **Professional Contact Inquiry Form** — Users can send inquiry messages directly to professionals from their listing card; referral clicks are tracked for analytics. (#188)
- **Professional Admin CRUD & Journey CTAs** — Back-office endpoints for managing professionals; CTAs surfaced at relevant journey steps (e.g., "Find a notary"). (#171)
- **Rental Journey Path** — Dedicated journey path for apartment search through to move-in, separate from the property-purchase path. (#170)
- **Feedback Widget** — Persistent feedback button for beta testers to submit in-context feedback. (#169)
- **10-Year Sale Profit Estimator** — Additional tab in the Mortgage Amortisation calculator projecting net equity and profit if the property is sold at a given year. (#179)
- **Financing Calculator CTA on Journey** — "Check your finances" journey step now links directly to the Financing Wizard tab. (#174)
- **Portfolio CTA on All-Phases-Complete Card** — After completing all journey phases, users are directed to set up their portfolio. (#193)

---

## April 2026 — UI Polish, SEO & Landing Page

### Added

- **SEO & Open Graph** — Meta titles, Open Graph tags, Twitter cards, and JSON-LD structured data on all public pages. (#168)
- **Landing Page Redesign** — New hero photograph, SVG illustrations for How It Works steps, scroll-triggered animations, parallax background, decorative patterns, and a gradient CTA section. (#135, #149, #153, #154, #155, #156, #157)
- **Free Tools Section on Landing** — Links to public calculator pages from the landing page and auth sidebar to drive organic traffic. (#190)
- **Avatar Upload** — Users can upload a profile photo from the profile settings page. (#152)
- **Breadcrumb Navigation** — Breadcrumbs added to article and law detail pages. (#138)
- **Dashboard Improvements** — Budget gauge, days-to-target countdown, ring chart for journey progress, and improved information hierarchy. (#140, #143, #144)
- **Portfolio Performance Chart** — 12-month line chart on the portfolio dashboard showing income vs expenses over time. (#142)
- **Micro-interactions & Animations** — Celebration animations on journey step completion, hover micro-interactions throughout the app. (#145)
- **Legal Pages** — Terms of Service, Privacy Policy, and Imprint pages. (#121)

---

## April 2026 — Content, Discovery & Professionals

### Added

- **AI-Powered Kaufvertrag Contract Explainer** — Upload a German purchase contract (Kaufvertrag) to get a clause-by-clause analysis with plain-English explanations and risk annotations. (#106, #189)
- **Interactive German Real Estate Glossary** — 200+ terms with definitions, examples, and category filtering. Seeded on startup. (#108)
- **Guided First-Session Onboarding Wizard** — New users are walked through a multi-step wizard on first login to personalise their journey and calculators. (#110)
- **Public Calculator Pages** — All calculators accessible without login at `/tools/*` for organic SEO traffic. (#105)
- **Global Search with Command Palette** — `Cmd+K` / `Ctrl+K` opens a command palette that searches laws, articles, professionals, and glossary terms in real time. (#67)
- **Verified Professional Network Directory** — Browse and filter bilingual Makler, notaries, lawyers, and tax advisors. Each listing includes specialisations, languages spoken, and location. (#98)
- **Professional Reviews & Trust Signals** — Structured review system with star ratings, reviewer nationality, and verified buyer badges on professional listings. (#113)
- **Cross-Border Tax Guide** — Dedicated calculator tab summarising double-taxation treaty implications for investors from 20+ countries. (#112)
- **Nebenkosten Running Costs Tracker** — Portfolio feature to log and categorise ongoing property costs (Hausgeld, insurance, maintenance). (#114)
- **Email Notifications & Weekly Digest** — Opt-in email notifications for journey step reminders and a weekly digest of portfolio performance. (#95)

---

## April 2026 — Financial Calculators Expansion

### Added

- **Mortgage Amortisation Calculator** — Full amortisation schedule with monthly repayment breakdown, total interest, and early repayment comparison. (#104)
- **GmbH vs. Private Ownership Comparison** — Side-by-side financial comparison of holding property as a private individual versus through a GmbH, including tax treatment and exit implications. (#103)
- **City & Area Comparison Tool** — Compare price-per-sqm, rental yield, and market trend data across German cities and districts. (#102)
- **Mortgage Pre-Qualification for Non-Residents** — Multi-step financing wizard tailored to non-EU citizens with guidance on required documents and lender options. (#111)
- **After-Tax Cash Flow in ROI Calculator** — ROI Calculator now shows net cash flow after estimated income tax, Abschreibung, and Werbungskosten. (#97)
- **10-Year Projection Chart in ROI Calculator** — Visual chart projecting cumulative cash flow, property value, and equity over 10 years. (#64)
- **Shareable Property Evaluation Links** — Property Evaluation results can be shared via a short link (`/e/{share_id}`). (#94)
- **Mietspiegel-Based Rent Estimates by Postcode** — Estimate market rent for a given postcode, apartment size, and year of construction. Surfaced inside the ROI calculator. (#96)
- **Branded PDF Export** — Hidden Costs and Property Evaluation calculators support a branded PDF download. (#71, #128)
- **SCHUFA NextGen Score Guidance** — Updated SCHUFA rating explanation to the new 100–999 point scale used by German banks. (#161)

---

## April 2026 — Journey Personalisation

### Added

- **Post-Purchase Ownership Onboarding Phase** — New journey phase triggered after closing, covering Grundbucheintrag, insurance, utilities, and property management setup. (#101)
- **Rental-Investor Journey Path** — Dedicated journey for investors who intend to rent out the property, with letting-specific steps (Mietvertrag, Hausverwaltung, Mieter selection). (#99)
- **Property Use Intent Selection** — Journey wizard now asks whether the property is for personal use or rental, and tailors subsequent steps accordingly. (#82)
- **Area Selection with City-Level Market Data** — Users select a target city/area during journey setup; market data (avg price/sqm, yield) is surfaced in relevant steps. (#83)
- **Document Upload on Review Steps** — Users can attach scanned documents (e.g., Grundbuchauszug, Energieausweis) directly to the relevant journey step. (#81)
- **Financing Steps by Buyer Type** — Separate step content for cash buyers and mortgage buyers at the financing phase. (#76)
- **Personalised Buying Cost Breakdown** — Step 5 buying costs section is dynamically personalised using the user's target city (actual Grunderwerbsteuer rate) and financing method. (#80)
- **List vs Tab View Toggle for Journey Steps** — Users can switch between a tab-based view and a scrollable list view for journey steps. (#84)
- **Auto-Generated Market Insights** — When the user completes Step 1 (Market Research), market insights for their target area are automatically generated and pinned to the step. (#52)
- **Phase Completion CTA** — Banner shown on completing all steps in a phase, with a direct link to start the next phase. (#165)

---

## February–March 2026 — Platform Foundation

### Added

- **Guided Property Journey** — Multi-phase journey (Research → Preparation → Buying → Closing) with 15+ steps, task checklists, and progress tracking. Personalised by citizenship, property type, and financing method. (#21, #24, #45, #53, #58)
- **Property Evaluation Calculator** — Spec-compliant valuation tool using income capitalisation and comparative methods; includes average rent/sqm by state, 110% financing toggle, tooltips, and PDF export. (#87, #69, #70, #71, #74)
- **Hidden Costs Calculator** — Calculates total acquisition costs (Grunderwerbsteuer, Notarkosten, Maklerprovision) broken down by category with state-specific tax rates. (#6)
- **ROI Calculator** — Rental yield and return on investment calculator with scenario inputs and saved calculations. (#6)
- **State Comparison Tool** — Compare land transfer tax, notary fees, and market data across all 16 German states. (#6)
- **Legal Knowledge Base** — 50+ German real estate laws translated into plain English, with full-text search, bookmarks, category filtering, and court rulings. (#6)
- **Document Translation** — AI-powered translation (Azure Translator) of uploaded German property documents, with risk warnings for legal/financial terms and confidence scores. (#6)
- **Content Library** — SEO-optimised articles about German property buying, organised by topic and linked to relevant journey steps. (#16)
- **Dashboard** — Overview page with active journeys, recent activity timeline, and personalised recommendations. (#14)
- **Notification System** — In-app notifications with read/unread tracking and per-category preferences. (#15)
- **Authentication** — JWT-based auth with email verification, password recovery, GDPR-compliant data export, and account deletion. (#56)
- **Subscription Management** — Stripe-powered subscription tiers with checkout and billing portal. (#13)
- **Portfolio Management** — Track owned properties, rental income, expenses, and 12-month performance. (#100, #114, #142)
- **Azure Infrastructure** — Azure Container Apps deployment for staging and production, managed via Terraform. (#27)
