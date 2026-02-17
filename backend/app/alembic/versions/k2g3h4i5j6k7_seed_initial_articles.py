"""Seed initial articles

Revision ID: k2g3h4i5j6k7
Revises: k1f2g3h4i5j6
Create Date: 2026-02-17 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'k2g3h4i5j6k7'
down_revision = 'k1f2g3h4i5j6'
branch_labels = None
depends_on = None


ARTICLES = [
    # --- Buying Process (3) ---
    {
        "slug": "complete-guide-buying-property-germany",
        "title": "The Complete Guide to Buying Property in Germany as a Foreigner",
        "meta_description": "Step-by-step guide to purchasing real estate in Germany as a foreign investor or immigrant. From search to keys.",
        "category": "buying_process",
        "difficulty_level": "beginner",
        "status": "published",
        "excerpt": "Everything you need to know about buying property in Germany as a foreigner, from initial research to getting the keys.",
        "content": """# The Complete Guide to Buying Property in Germany as a Foreigner

Germany is one of the most stable real estate markets in Europe, and the good news is: **there are no restrictions on foreigners buying property**. Whether you're an EU citizen, a resident, or purchasing from abroad, the process is the same.

## Step 1: Define Your Goals

Before you start browsing listings, clarify what you're looking for:

- **Personal use** or **investment**?
- **City apartment** or **suburban house**?
- **Budget range** including all additional costs (typically 10-15% on top of purchase price)

## Step 2: Get Your Finances in Order

German banks offer mortgages to foreigners, but typically require:

- At least **20-30% down payment** (higher for non-residents)
- Proof of stable income
- Good credit history (Schufa for residents)
- Employment contract or business financials

## Step 3: Search for Properties

Popular platforms include:
- ImmobilienScout24 (largest marketplace)
- Immowelt
- eBay Kleinanzeigen (for private sales)
- Local real estate agents (Makler)

## Step 4: Make an Offer

Unlike many countries, there's **no formal bidding process** in Germany. You negotiate directly with the seller or their agent. Verbal agreements are not binding.

## Step 5: The Notary Process

This is where Germany differs significantly from other countries. **All property transactions must go through a notary** (Notar):

1. The notary drafts the purchase contract
2. Both parties receive the draft at least 2 weeks before signing
3. The notary reads the entire contract aloud at the signing appointment
4. Both parties sign

## Step 6: Payment and Transfer

After signing:
1. The notary registers a priority notice (Auflassungsvormerkung) in the land registry
2. You pay the purchase price to the seller's account
3. You pay the property transfer tax (Grunderwerbsteuer)
4. The notary arranges the official ownership transfer
5. You receive the keys

## Timeline

The entire process typically takes **3-6 months** from offer to keys.
""",
        "key_takeaways": [
            "No restrictions on foreigners buying property in Germany",
            "Budget 10-15% additional costs on top of purchase price",
            "All transactions must go through a notary (Notar)",
            "Process typically takes 3-6 months from offer to keys",
            "Down payment of 20-30% typically required for mortgages"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "understanding-german-notary-process",
        "title": "Understanding the German Notary Process: What to Expect",
        "meta_description": "The German notary (Notar) plays a central role in property transactions. Learn what happens at the notary appointment.",
        "category": "buying_process",
        "difficulty_level": "intermediate",
        "status": "published",
        "excerpt": "The German notary system is unique. Learn exactly what happens before, during, and after the notary appointment.",
        "content": """# Understanding the German Notary Process

In Germany, the notary (Notar) is not just a witness to the transaction - they are a **neutral legal professional** who ensures both parties' interests are protected.

## Before the Appointment

### Choosing a Notary
Either party can suggest a notary, but traditionally the **buyer chooses and pays**. The notary must be impartial regardless of who selected them.

### The Draft Contract
The notary prepares the purchase contract (Kaufvertrag) based on the agreed terms. By law, both parties must receive the draft **at least 2 weeks before the signing appointment**. This is your time to:

- Have the contract reviewed by your own lawyer
- Ask questions about any clauses you don't understand
- Negotiate changes if needed

## During the Appointment

The notary appointment (Beurkundung) is a formal legal proceeding:

1. **Identity verification** - Bring your passport or ID
2. **Full reading** - The notary reads the entire contract aloud in German
3. **Explanations** - The notary explains legal terms and implications
4. **Questions** - Both parties can ask questions at any time
5. **Signing** - Both parties sign each page
6. **Notarization** - The notary stamps and certifies the document

### Language Considerations
If you don't speak German fluently, you **must bring a certified interpreter** to the appointment. The notary will ensure you understand every clause.

## After the Appointment

The notary handles several post-signing tasks:

1. **Priority notice** (Auflassungsvormerkung) - Filed in the land registry to protect the buyer
2. **Tax notification** - Sends details to the tax office for property transfer tax
3. **Ownership transfer** - Once all conditions are met, registers the change of ownership
4. **Mortgage registration** - If applicable, registers the bank's lien

## Costs

Notary fees are regulated by law (GNotKG) and typically amount to **1.5-2% of the purchase price**, covering:
- Contract drafting and notarization
- Land registry filings
- Administrative work

These fees are **not negotiable** - all notaries charge the same rates.
""",
        "key_takeaways": [
            "The notary is a neutral legal professional protecting both parties",
            "You must receive the draft contract at least 2 weeks before signing",
            "A certified interpreter is required if you don't speak German",
            "Notary fees are regulated by law at approximately 1.5-2% of purchase price",
            "The notary handles land registry, tax notifications, and ownership transfer"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "mortgage-options-foreigners-germany",
        "title": "Mortgage Options for Foreigners in Germany: A Practical Guide",
        "meta_description": "How to get a mortgage in Germany as a foreigner. Requirements, interest rates, and tips for approval.",
        "category": "buying_process",
        "difficulty_level": "advanced",
        "status": "published",
        "excerpt": "Getting a mortgage in Germany as a foreigner is possible but requires preparation. Here's what banks look for and how to improve your chances.",
        "content": """# Mortgage Options for Foreigners in Germany

German banks do offer mortgages to foreigners, but the requirements and terms vary based on your residency status and financial profile.

## Types of German Mortgages

### Annuitaetendarlehen (Annuity Loan)
The most common type. You pay a fixed monthly amount combining interest and principal repayment. The interest rate is fixed for a period (typically 10-15 years).

### Volltilgerdarlehen (Full Repayment Loan)
The interest rate is fixed for the entire loan term, and you repay the full amount within that period. Higher monthly payments but complete certainty.

### KfW Loans
The German state development bank (KfW) offers subsidized loans for energy-efficient properties. These can be combined with regular bank mortgages for lower overall costs.

## Requirements by Residency Status

### EU Citizens Living in Germany
- **Down payment**: 20-30% recommended
- **Documentation**: Employment contract, salary slips (3 months), tax returns
- **Schufa**: Credit score check required
- **Approval rate**: High, similar to German citizens

### Non-EU Residents in Germany
- **Down payment**: 30-40% typically required
- **Documentation**: Residence permit, employment contract, salary slips, tax returns
- **Additional**: Some banks require permanent residency (Niederlassungserlaubnis)
- **Approval rate**: Moderate, depends on residency permit type

### Non-Residents (Buying from Abroad)
- **Down payment**: 40-50% or more
- **Documentation**: Income proof from home country, credit references
- **Additional**: Limited bank options, higher interest rates possible
- **Approval rate**: Lower, specialist brokers recommended

## Interest Rates

As of 2026, typical rates for a 10-year fixed period:
- Residents with good credit: 3.0-4.0%
- Non-EU residents: 3.5-4.5%
- Non-residents: 4.0-5.5%

## Tips for Approval

1. **Save a larger down payment** - This is the single most important factor
2. **Build a German banking relationship** early
3. **Get pre-approved** before house hunting
4. **Use a mortgage broker** (Kreditvermittler) who works with multiple banks
5. **Prepare complete documentation** in German
6. **Consider the total cost** - Interest, Tilgung (repayment), and Nebenkosten
""",
        "key_takeaways": [
            "German banks offer mortgages to foreigners with varying requirements",
            "Down payment requirements range from 20% (EU residents) to 50% (non-residents)",
            "Interest rates are typically fixed for 10-15 years",
            "KfW subsidized loans can reduce costs for energy-efficient properties",
            "Using a mortgage broker improves chances of approval for foreigners"
        ],
        "author_name": "HeimPath Editorial",
    },

    # --- Costs & Taxes (3) ---
    {
        "slug": "hidden-costs-buying-property-germany",
        "title": "Hidden Costs of Buying Property in Germany: The Full Breakdown",
        "meta_description": "Beyond the purchase price: understand all additional costs when buying property in Germany, from transfer tax to notary fees.",
        "category": "costs_and_taxes",
        "difficulty_level": "beginner",
        "status": "published",
        "excerpt": "The purchase price is just the beginning. Learn about the 10-15% in additional costs that every property buyer in Germany must pay.",
        "content": """# Hidden Costs of Buying Property in Germany

When budgeting for a property purchase in Germany, the listed price is only part of the story. **Additional costs (Kaufnebenkosten)** typically add 10-15% to the purchase price.

## 1. Property Transfer Tax (Grunderwerbsteuer)

This is the largest additional cost and varies by federal state:

| State | Rate |
|-------|------|
| Bayern (Bavaria) | 3.5% |
| Hamburg | 5.5% |
| Berlin | 6.0% |
| Brandenburg | 6.5% |
| Nordrhein-Westfalen | 6.5% |

**Example**: For a EUR 300,000 property in Berlin, the transfer tax is EUR 18,000.

## 2. Notary Fees (Notarkosten)

Notary fees are regulated by law and typically amount to **1.5% of the purchase price**. This covers:
- Contract drafting and notarization
- Land registry filings
- Administrative correspondence

## 3. Land Registry Fee (Grundbuchkosten)

The fee for registering ownership in the land registry is approximately **0.5% of the purchase price**.

## 4. Real Estate Agent Commission (Maklerprovision)

Since December 2020, the agent's commission is **split equally** between buyer and seller (Bestellerprinzip for sales). The total commission is typically 5.95-7.14% (including VAT), so the buyer's share is approximately **3-3.57%**.

Note: Not all properties involve an agent. Private sales (provisionsfrei) have no agent commission.

## 5. Often Overlooked Costs

- **Property survey** (Gutachten): EUR 500-2,000
- **Renovation/repairs**: Budget at least 5% for unforeseen issues
- **Moving costs**: EUR 500-3,000 depending on distance
- **Furnishing**: Varies widely
- **Building insurance** (Wohngebaeudeversicherung): EUR 200-800/year

## Total Example

For a EUR 400,000 apartment in Berlin:

| Cost | Amount |
|------|--------|
| Purchase price | EUR 400,000 |
| Transfer tax (6.0%) | EUR 24,000 |
| Notary fees (1.5%) | EUR 6,000 |
| Land registry (0.5%) | EUR 2,000 |
| Agent commission (3.57%) | EUR 14,280 |
| **Total** | **EUR 446,280** |

That's an additional **EUR 46,280** or **11.6%** on top of the purchase price.
""",
        "key_takeaways": [
            "Additional costs add 10-15% to the purchase price",
            "Property transfer tax is the largest cost, ranging from 3.5% to 6.5% by state",
            "Notary fees (1.5%) and land registry (0.5%) are fixed by law",
            "Agent commission is split equally between buyer and seller since 2020",
            "Always budget for renovation, moving, and furnishing costs"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "property-tax-germany-explained",
        "title": "Property Tax in Germany: Annual Costs Every Owner Must Know",
        "meta_description": "Understanding Grundsteuer, income tax on rental income, and other ongoing tax obligations for property owners in Germany.",
        "category": "costs_and_taxes",
        "difficulty_level": "intermediate",
        "status": "published",
        "excerpt": "Owning property in Germany comes with ongoing tax obligations. Learn about Grundsteuer, rental income tax, and the speculation tax.",
        "content": """# Property Tax in Germany: What Every Owner Needs to Know

After purchasing property in Germany, you'll face several ongoing tax obligations. Understanding these is crucial for accurate investment planning.

## Grundsteuer (Property Tax)

The Grundsteuer is an annual tax paid to the local municipality. Following the 2025 reform, it's calculated based on:

- **Property value** (new assessment model)
- **Municipal multiplier** (Hebesatz) - varies by city
- **Property type** (residential vs. commercial)

Typical annual amounts:
- Small apartment: EUR 200-500/year
- Family home: EUR 400-1,000/year
- Large property: EUR 1,000-3,000/year

## Income Tax on Rental Income

If you rent out your property, the rental income is taxable:

### Residents
- Added to your regular income and taxed at your marginal rate (14-45%)
- You can deduct expenses: mortgage interest, maintenance, depreciation, insurance

### Non-Residents
- Taxed at a flat rate or your average tax rate (minimum 14%)
- Must file a German tax return
- Can deduct the same expenses as residents

### Key Deductions
- **Depreciation** (AfA): 2% per year for buildings constructed after 1924, 2.5% for older buildings
- **Mortgage interest**: Fully deductible against rental income
- **Maintenance and repairs**: Deductible in the year incurred
- **Property management fees**: Fully deductible
- **Insurance premiums**: Fully deductible

## Speculation Tax (Spekulationssteuer)

If you sell a property **within 10 years** of purchase and make a profit, the gain is taxed as income. After 10 years, the sale is **completely tax-free** (for private investors).

Exception: If you lived in the property yourself for at least the last 2 years before sale, the gain is tax-free regardless of holding period.

## VAT Considerations

- Residential property sales are **VAT-exempt**
- Commercial property may be subject to 19% VAT
- New-build properties from developers include VAT in the price
""",
        "key_takeaways": [
            "Grundsteuer is an annual property tax paid to the local municipality",
            "Rental income is taxable but many expenses are deductible",
            "Depreciation (AfA) of 2-2.5% per year is a powerful tax deduction",
            "Property sale profits are tax-free after a 10-year holding period",
            "Non-residents must file German tax returns for rental income"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "renovation-costs-budgeting-guide",
        "title": "Renovation Costs in Germany: Budgeting Guide for Property Buyers",
        "meta_description": "How much does renovation cost in Germany? Detailed cost estimates for common renovation projects and tips for budgeting.",
        "category": "costs_and_taxes",
        "difficulty_level": "advanced",
        "status": "published",
        "excerpt": "Planning renovations for your German property? Here's a detailed breakdown of costs for common projects, from kitchen remodels to full gut renovations.",
        "content": """# Renovation Costs in Germany: A Practical Budgeting Guide

Renovation costs in Germany have risen significantly in recent years due to material costs and skilled labor shortages. Here's what to expect.

## Cost Ranges by Project Type

### Kitchen Renovation
- **Basic refresh** (new fronts, countertop): EUR 5,000-10,000
- **Mid-range new kitchen**: EUR 15,000-30,000
- **High-end kitchen**: EUR 30,000-60,000+

### Bathroom Renovation
- **Basic refresh**: EUR 5,000-10,000
- **Complete renovation** (4-6 sqm): EUR 10,000-20,000
- **Luxury bathroom**: EUR 20,000-40,000+

### Flooring
- **Laminate**: EUR 20-40/sqm (installed)
- **Hardwood parquet**: EUR 50-120/sqm (installed)
- **Tiles**: EUR 40-80/sqm (installed)

### Windows
- **Standard double-glazed**: EUR 400-700 per window
- **Triple-glazed (energy-efficient)**: EUR 600-1,000 per window
- **Including installation**: Add EUR 100-200 per window

### Heating System
- **Gas condensing boiler**: EUR 6,000-10,000
- **Heat pump**: EUR 15,000-25,000
- **Pellet heating**: EUR 15,000-20,000

Note: Government subsidies (BAFA/KfW) can cover 20-40% of costs for energy-efficient upgrades.

### Full Renovation
- **Cosmetic refresh**: EUR 300-600/sqm
- **Standard renovation**: EUR 600-1,200/sqm
- **Complete gut renovation**: EUR 1,200-2,500/sqm

## Energy Efficiency Requirements

Germany has strict energy efficiency standards (GEG - Gebaeudeenergiegesetz). When renovating, you may be required to:

- Insulate the roof or top floor ceiling
- Replace windows older than 1995
- Upgrade the heating system if it's over 30 years old

## Tips for Managing Renovation Costs

1. **Get at least 3 quotes** from different contractors (Handwerker)
2. **Check for subsidies** - KfW and BAFA offer significant funding for energy renovations
3. **Plan a 15-20% contingency** for unexpected issues
4. **Phase your renovation** if budget is tight - prioritize structural and energy work
5. **Consider a Bausachverstaendiger** (building surveyor) before purchase to identify hidden issues
""",
        "key_takeaways": [
            "Full renovation costs range from EUR 600-2,500 per square meter",
            "Government subsidies (KfW/BAFA) can cover 20-40% of energy renovation costs",
            "Always budget a 15-20% contingency for unexpected issues",
            "Energy efficiency upgrades may be legally required when renovating",
            "Get at least 3 quotes from different contractors before committing"
        ],
        "author_name": "HeimPath Editorial",
    },

    # --- Regulations (3) ---
    {
        "slug": "foreign-ownership-rules-germany",
        "title": "Foreign Ownership Rules: Can Anyone Buy Property in Germany?",
        "meta_description": "Germany has no restrictions on foreign property ownership. Learn about the rules, tax implications, and special considerations.",
        "category": "regulations",
        "difficulty_level": "beginner",
        "status": "published",
        "excerpt": "Germany is one of the most open real estate markets in the world for foreign buyers. Here's what you need to know about ownership rules.",
        "content": """# Foreign Ownership Rules in Germany

One of the most attractive aspects of the German property market is its openness to foreign buyers. Let's break down what this means in practice.

## No Restrictions on Foreign Ownership

Unlike many countries, Germany imposes **no restrictions on foreign property ownership**. This means:

- **Any nationality** can buy property
- **No residency requirement** - you don't need to live in Germany
- **No special permits** needed for foreign buyers
- **Same rights** as German citizens regarding property ownership
- **No limit** on the number of properties you can own

## Legal Requirements

While there are no ownership restrictions, you must follow the standard legal process:

1. **Tax identification number** (Steuer-ID) - Required for the transaction
2. **German bank account** - Recommended for payments and ongoing costs
3. **Notary process** - All property transactions must be notarized
4. **Land registry** (Grundbuch) - Your ownership is officially recorded

## Tax Considerations for Foreign Owners

### Non-EU Residents
- Must pay property transfer tax (same rates as everyone)
- Rental income is taxable in Germany
- May need to file annual German tax returns
- Double taxation treaties may apply

### EU Citizens
- Same tax treatment as German citizens
- Free movement rights simplify the process
- No additional documentation required

## Special Considerations

### Company Ownership
- Properties can be held through German or foreign companies
- Different tax implications (trade tax, corporate tax)
- Asset deal vs. share deal considerations for commercial properties

### Agricultural Land
- Some restrictions on purchasing agricultural land in certain states
- Designed to prevent speculation on farmland
- Rarely affects residential or commercial buyers

### Heritage-Listed Properties
- Buying is unrestricted, but renovations must follow preservation rules
- Tax benefits available for heritage renovation costs
- Additional approval needed for modifications
""",
        "key_takeaways": [
            "Germany has no restrictions on foreign property ownership",
            "No residency requirement or special permits needed",
            "A tax identification number and notary process are required",
            "Non-residents must pay taxes on German rental income",
            "Double taxation treaties may reduce tax burden for foreign owners"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "tenant-rights-landlord-obligations",
        "title": "Tenant Rights and Landlord Obligations in Germany",
        "meta_description": "Germany has strong tenant protection laws. Essential guide for property investors on landlord obligations and tenant rights.",
        "category": "regulations",
        "difficulty_level": "intermediate",
        "status": "published",
        "excerpt": "Germany is known for its strong tenant protections. If you're buying an investment property, understanding these rules is essential.",
        "content": """# Tenant Rights and Landlord Obligations in Germany

Germany has some of the strongest tenant protection laws in Europe. As a landlord, understanding these rules is critical to successful property investment.

## Lease Agreements

### Unlimited vs. Limited Contracts
- Most residential leases are **unlimited** (unbefristeter Mietvertrag)
- Limited-term leases are only allowed with a **valid reason** (e.g., landlord's own use planned)
- Tenants can terminate with **3 months' notice** at any time

### Landlord's Right to Terminate
Landlords can only terminate a lease for specific reasons:
1. **Personal use** (Eigenbedarf) - You or close family need the apartment
2. **Significant breach** - Non-payment of rent, damage to property
3. **Economic necessity** - Property cannot be economically maintained otherwise

Even with valid reasons, notice periods are:
- Up to 5 years of tenancy: **3 months**
- 5-8 years: **6 months**
- Over 8 years: **9 months**

## Rent Control (Mietpreisbremse)

In designated areas (most major cities), rent increases are limited:

- **New leases**: Rent cannot exceed 10% above the local reference rent (Mietspiegel)
- **Existing leases**: Maximum increase of 20% within 3 years (15% in some cities)
- **Exceptions**: New-build properties and extensive renovations

## Maintenance and Repairs

### Landlord Responsibilities
- **Structural repairs** (roof, walls, foundation)
- **Heating, plumbing, electrical systems**
- **Common areas** maintenance
- **Appliances** provided with the apartment

### Tenant Responsibilities
- **Minor repairs** (Kleinreparaturen) up to EUR 75-100 per repair, max EUR 200-300/year
- Must be explicitly stated in the lease
- **Cosmetic repairs** (Schoenheitsreparaturen) - recent court rulings have limited landlord's ability to require these

## Deposit Rules

- Maximum **3 months' cold rent** (Kaltmiete)
- Must be held in a **separate account**
- **Interest** earned belongs to the tenant
- Must be returned within **6 months** after lease end (with deductions for damages if applicable)

## Utility Costs (Nebenkosten)

Landlords must provide an annual utility cost statement (Nebenkostenabrechnung) within **12 months** of the billing period end. Late statements cannot be charged to tenants.
""",
        "key_takeaways": [
            "Most German residential leases are unlimited-term",
            "Landlords can only terminate for specific legal reasons",
            "Rent increases are capped at 20% over 3 years in most cases",
            "Security deposits are limited to 3 months' cold rent",
            "Annual utility cost statements must be provided within 12 months"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "energy-efficiency-requirements-buildings",
        "title": "Energy Efficiency Requirements for Buildings in Germany (GEG)",
        "meta_description": "Understanding Germany's Building Energy Act (GEG) and what it means for property buyers and renovators.",
        "category": "regulations",
        "difficulty_level": "advanced",
        "status": "published",
        "excerpt": "Germany's Building Energy Act (GEG) sets strict requirements for building energy performance. Here's what property buyers need to know.",
        "content": """# Energy Efficiency Requirements for Buildings in Germany

The Gebaeudeenergiegesetz (GEG) - Building Energy Act - is Germany's primary legislation governing energy efficiency in buildings. It significantly impacts property purchase and renovation decisions.

## Energy Performance Certificate (Energieausweis)

Every property for sale or rent must have an energy certificate. There are two types:

### Consumption-Based (Verbrauchsausweis)
- Based on actual energy consumption over 3 years
- Cheaper to obtain (EUR 50-100)
- Less accurate, depends on occupant behavior

### Demand-Based (Bedarfsausweis)
- Based on building characteristics and theoretical demand
- Required for buildings with fewer than 5 units built before 1977
- More expensive (EUR 300-500) but more accurate

## Energy Efficiency Classes

Properties are rated from A+ to H:

| Class | kWh/sqm/year | Description |
|-------|-------------|-------------|
| A+ | < 30 | Passive house standard |
| A | 30-49 | New-build standard |
| B | 50-74 | Very good |
| C | 75-99 | Good |
| D | 100-129 | Average |
| E | 130-159 | Below average |
| F | 160-199 | Poor |
| G | 200-249 | Very poor |
| H | > 250 | Worst rating |

## Renovation Obligations

When buying a property, certain energy upgrades may be **legally required**:

### Mandatory Within 2 Years of Purchase
- **Roof/top floor insulation**: If not already meeting minimum standards
- **Heating pipe insulation**: Exposed pipes in unheated areas
- **Old heating replacement**: Oil/gas boilers older than 30 years must be replaced

### Exemptions
- Buildings used less than 4 months per year
- Listed buildings where changes would alter character
- Owners who have lived in the property since before Feb 2002

## Government Subsidies

Significant funding is available for energy renovations:

### KfW Programs
- **Energy-efficient renovation**: Up to EUR 150,000 per unit at subsidized rates
- **Individual measures**: Up to EUR 60,000 per unit
- **Tilgungszuschuss**: Repayment grants up to 45%

### BAFA Subsidies
- **Heat pumps**: Up to 40% of costs
- **Building envelope**: Up to 20% of costs
- **Heating optimization**: Up to 20% of costs

## Impact on Property Value

Energy efficiency increasingly affects property values:
- Properties rated A-C command **5-15% premium**
- Properties rated F-H may sell at **10-20% discount**
- Energy costs are a growing concern for buyers
- Future regulations will likely tighten requirements further
""",
        "key_takeaways": [
            "Every property for sale must have an energy performance certificate",
            "Properties are rated A+ (best) to H (worst) for energy efficiency",
            "Certain energy upgrades are legally required within 2 years of purchase",
            "Government subsidies can cover 20-45% of energy renovation costs",
            "Energy-efficient properties command a 5-15% price premium"
        ],
        "author_name": "HeimPath Editorial",
    },

    # --- Common Pitfalls (3) ---
    {
        "slug": "top-mistakes-foreign-buyers-germany",
        "title": "Top 10 Mistakes Foreign Buyers Make in Germany",
        "meta_description": "Avoid these common mistakes when buying property in Germany as a foreigner. From underestimating costs to skipping due diligence.",
        "category": "common_pitfalls",
        "difficulty_level": "beginner",
        "status": "published",
        "excerpt": "Buying property in Germany can be straightforward, but foreign buyers often make preventable mistakes. Here are the top 10 to avoid.",
        "content": """# Top 10 Mistakes Foreign Buyers Make in Germany

Based on years of experience helping foreign investors and immigrants buy property in Germany, these are the most common and costly mistakes.

## 1. Underestimating Additional Costs

**The mistake**: Budgeting only for the purchase price.

**Reality**: Additional costs (Kaufnebenkosten) add 10-15% to the purchase price. This includes transfer tax, notary fees, agent commission, and land registry fees.

## 2. Not Getting Pre-Approved for a Mortgage

**The mistake**: Finding the perfect property, then scrambling for financing.

**Reality**: German mortgage approvals can take 2-4 weeks. Sellers prefer buyers with financing secured. Get pre-approved before you start searching.

## 3. Skipping the Building Survey

**The mistake**: Trusting that the property is in good condition based on appearance.

**Reality**: Hidden issues like damp, structural problems, or outdated electrical systems can cost tens of thousands to fix. Invest EUR 500-1,000 in a professional survey (Baugutachten).

## 4. Ignoring the Hausverwaltung for Apartments

**The mistake**: Not reviewing the building management (Hausverwaltung) records before buying an apartment.

**Reality**: Check the minutes of owners' meetings (Eigentuememerversammlung protocols), the maintenance reserve fund (Instandhaltungsruecklage), and any planned special assessments (Sonderumlagen). A low reserve fund means unexpected bills.

## 5. Not Understanding Eigentuemergemeinschaft

**The mistake**: Thinking apartment ownership gives you complete freedom.

**Reality**: In a condominium (Eigentumswohnung), many decisions require approval from the owners' association. Changes to external appearance, noise regulations, and pet policies may be restricted.

## 6. Rushing the Notary Process

**The mistake**: Signing the contract without fully understanding it.

**Reality**: You have a legal right to receive the draft contract 2 weeks before signing. Use this time to have it reviewed by an independent lawyer, especially if you don't speak German.

## 7. Forgetting About Ongoing Costs

**The mistake**: Only considering the purchase costs.

**Reality**: Monthly costs include Hausgeld (for apartments), property tax, insurance, and maintenance. Budget EUR 3-5 per square meter per month for apartments.

## 8. Not Checking the Grundbuch (Land Registry)

**The mistake**: Assuming the seller has clear ownership.

**Reality**: The land registry may reveal existing liens, rights of way, or restrictions. Your notary will check this, but understanding what's there is important.

## 9. Underestimating Renovation Timelines

**The mistake**: Planning to move in right after purchase with quick renovations.

**Reality**: Finding reliable contractors (Handwerker) in Germany can take months. Major renovations can take 6-12 months to complete. Plan accordingly.

## 10. Neglecting Tax Planning

**The mistake**: Not considering the tax implications before purchase.

**Reality**: How you structure the purchase (personal vs. company), your residency status, and your long-term plans all affect your tax obligations. Consult a German tax advisor (Steuerberater) before buying.
""",
        "key_takeaways": [
            "Always budget 10-15% additional costs on top of the purchase price",
            "Get mortgage pre-approval before searching for properties",
            "Invest in a professional building survey before purchasing",
            "Review building management records and reserve funds for apartments",
            "Consult a German tax advisor to optimize your purchase structure"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "due-diligence-checklist-property-buyers",
        "title": "Due Diligence Checklist for Property Buyers in Germany",
        "meta_description": "Essential due diligence steps before buying property in Germany. From land registry checks to building inspections.",
        "category": "common_pitfalls",
        "difficulty_level": "intermediate",
        "status": "published",
        "excerpt": "Thorough due diligence can save you from costly surprises. Here's a comprehensive checklist for property buyers in Germany.",
        "content": """# Due Diligence Checklist for Property Buyers in Germany

Before signing any purchase agreement, thorough due diligence is essential. This checklist covers all the critical areas.

## Legal Due Diligence

### Land Registry (Grundbuch)
- [ ] Verify seller's ownership
- [ ] Check for existing mortgages or liens (Abteilung III)
- [ ] Review easements and rights of way (Abteilung II)
- [ ] Confirm property boundaries match the Liegenschaftskataster
- [ ] Check for Vorkaufsrecht (pre-emption rights) by the municipality

### Zoning and Planning
- [ ] Review the Bebauungsplan (local development plan)
- [ ] Check for planned construction nearby that might affect value
- [ ] Verify permitted use (residential, commercial, mixed)
- [ ] Check for heritage protection (Denkmalschutz) status

### Building Permits
- [ ] Verify all structures have proper building permits
- [ ] Check for any outstanding building code violations
- [ ] Review any pending or rejected permit applications

## Financial Due Diligence

### For Apartments (Eigentumswohnung)
- [ ] Review last 3 years of Eigentuemerversammlung protocols
- [ ] Check the Instandhaltungsruecklage (maintenance reserve)
- [ ] Review current Hausgeld and any planned increases
- [ ] Check for pending Sonderumlagen (special assessments)
- [ ] Review the Teilungserklaerung (declaration of division)
- [ ] Check the Gemeinschaftsordnung (community rules)

### Rental Properties
- [ ] Review all existing lease agreements
- [ ] Verify current rent levels against Mietspiegel
- [ ] Check rental payment history
- [ ] Review any ongoing disputes with tenants
- [ ] Calculate actual vs. advertised yield

## Physical Due Diligence

### Building Inspection
- [ ] Structural integrity (foundation, walls, roof)
- [ ] Moisture and damp issues (especially basement)
- [ ] Electrical system condition and compliance
- [ ] Plumbing and drainage
- [ ] Heating system age and efficiency
- [ ] Window condition (single, double, or triple-glazed)
- [ ] Insulation levels (roof, walls, floor)

### Energy Assessment
- [ ] Review the Energieausweis (energy certificate)
- [ ] Assess required energy upgrades under GEG
- [ ] Estimate costs for bringing to current standards
- [ ] Check eligibility for energy renovation subsidies

### Environmental
- [ ] Check for contaminated land (Altlasten)
- [ ] Review flood risk maps
- [ ] Check for radon risk in the area
- [ ] Noise levels (traffic, flight paths, industrial)

## Neighborhood Assessment
- [ ] Local infrastructure (schools, shops, transport)
- [ ] Planned development projects in the area
- [ ] Crime statistics
- [ ] Property value trends in the micro-location
- [ ] Demographic trends
""",
        "key_takeaways": [
            "Always verify the land registry for liens, easements, and ownership",
            "Review at least 3 years of owners' meeting minutes for apartments",
            "Commission a professional building inspection before purchase",
            "Check the energy certificate and assess required upgrades",
            "Research the neighborhood including planned developments and trends"
        ],
        "author_name": "HeimPath Editorial",
    },
    {
        "slug": "avoiding-rental-yield-traps",
        "title": "Avoiding Rental Yield Traps: What the Numbers Don't Tell You",
        "meta_description": "High rental yields can be misleading. Learn how to properly evaluate investment properties and avoid common yield traps in Germany.",
        "category": "common_pitfalls",
        "difficulty_level": "advanced",
        "status": "published",
        "excerpt": "A property advertising 8% yield might actually deliver 3% net. Learn how to see through misleading yield calculations and evaluate true returns.",
        "content": """# Avoiding Rental Yield Traps in Germany

Rental yield is the most commonly cited metric for investment properties, but it's also the most frequently manipulated. Here's how to evaluate returns properly.

## Gross vs. Net Yield

### Gross Yield
The simple calculation often advertised:
```
Gross Yield = Annual Rent / Purchase Price x 100
```

A EUR 200,000 property with EUR 10,000 annual rent = 5% gross yield.

### Net Yield (What Actually Matters)
```
Net Yield = (Annual Rent - All Costs) / (Purchase Price + Additional Costs) x 100
```

For the same property:
- Annual rent: EUR 10,000
- Non-recoverable costs: EUR 2,500 (management, maintenance, insurance, vacancy)
- Purchase price with Nebenkosten: EUR 225,000
- **Net yield: 3.3%** - significantly lower than the advertised 5%

## Common Yield Traps

### Trap 1: Ignoring Vacancy Risk
Advertised yields assume 100% occupancy. In reality:
- Budget for **4-8% vacancy** (1-2 months over 2 years)
- Consider local vacancy rates
- Factor in tenant turnover costs (renovation between tenants)

### Trap 2: Understating Maintenance Costs
Rule of thumb: Budget **1-1.5% of property value** annually for maintenance.
- Older buildings need more maintenance
- Energy renovations may be required
- The Hausgeld covers common areas, not your unit's interior

### Trap 3: Optimistic Rent Assumptions
- Verify rents against the local Mietspiegel (rent index)
- Account for Mietpreisbremse (rent control) in applicable areas
- Don't assume you can immediately raise below-market rents

### Trap 4: Ignoring Tax Impact
Your actual return depends heavily on your tax situation:
- Rental income is taxed at your marginal rate (up to 45%)
- Depreciation provides significant tax savings (2-2.5% of building value/year)
- Interest payments are deductible
- The net after-tax return may be very different from pre-tax

### Trap 5: Cash-on-Cash Confusion
When using leverage (mortgage), the relevant metric is **cash-on-cash return**:
```
Cash-on-Cash = Annual Cash Flow / Total Cash Invested x 100
```

This accounts for your actual capital deployed, not the total property value.

## Red Flags in Property Listings

- Yield calculated on cold rent only (should include all income)
- No mention of Hausgeld or service charges
- "Potential yield" based on future rent increases
- Recently renovated to temporarily boost rent
- Very high yield in a stagnant market (usually a reason why)

## How to Calculate True Returns

1. Start with actual current rent (verify with existing leases)
2. Subtract all non-recoverable costs
3. Add all purchase costs to the investment base
4. Calculate the after-tax return based on your personal tax rate
5. Model different scenarios (vacancy, repairs, rent changes)
6. Compare the net return with alternative investments
""",
        "key_takeaways": [
            "Net yield is typically 30-40% lower than advertised gross yield",
            "Budget 4-8% for vacancy and 1-1.5% of property value for annual maintenance",
            "Always verify rents against the local Mietspiegel (rent index)",
            "Tax impact (up to 45% marginal rate) significantly affects true returns",
            "Use cash-on-cash return when evaluating leveraged investments"
        ],
        "author_name": "HeimPath Editorial",
    },
]


def _calculate_reading_time(content: str) -> int:
    """Calculate estimated reading time in minutes (200 WPM, min 1)."""
    import math
    word_count = len(content.split())
    return max(1, math.ceil(word_count / 200))


def upgrade() -> None:
    connection = op.get_bind()

    for article in ARTICLES:
        reading_time = _calculate_reading_time(article["content"])

        # Convert key_takeaways list to JSON string
        import json
        takeaways_json = json.dumps(article.get("key_takeaways", []))
        related_law_ids_json = json.dumps(article.get("related_law_ids", []))
        related_calc_json = json.dumps(article.get("related_calculator_types", []))

        connection.execute(
            sa.text("""
                INSERT INTO article (
                    id, slug, title, meta_description, category, difficulty_level,
                    status, excerpt, content, key_takeaways, reading_time_minutes,
                    view_count, author_name, related_law_ids, related_calculator_types,
                    created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), :slug, :title, :meta_description, :category,
                    :difficulty_level, :status, :excerpt, :content,
                    CAST(:key_takeaways AS jsonb), :reading_time, 0, :author_name,
                    CAST(:related_law_ids AS jsonb), CAST(:related_calc AS jsonb),
                    now(), now()
                )
            """),
            {
                "slug": article["slug"],
                "title": article["title"],
                "meta_description": article["meta_description"],
                "category": article["category"],
                "difficulty_level": article["difficulty_level"],
                "status": article["status"],
                "excerpt": article["excerpt"],
                "content": article["content"],
                "key_takeaways": takeaways_json,
                "reading_time": reading_time,
                "author_name": article["author_name"],
                "related_law_ids": related_law_ids_json,
                "related_calc": related_calc_json,
            }
        )


def downgrade() -> None:
    op.execute("DELETE FROM article")
