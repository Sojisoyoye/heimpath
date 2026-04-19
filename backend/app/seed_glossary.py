"""Seed German real estate glossary terms into the database.

Populates the glossary_term table with key German RE terminology.
Idempotent: skips terms that already exist (matched by slug).
"""

import logging
import re
import uuid

from sqlmodel import Session, select

from app.models.glossary import GlossaryCategory, GlossaryTerm

logger = logging.getLogger(__name__)


def _slugify(term: str) -> str:
    """Convert a German term to a URL-friendly slug."""
    slug = term.lower()
    # Replace umlauts
    slug = slug.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
    slug = slug.replace("ß", "ss")
    # Replace spaces and special chars with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


# ---------------------------------------------------------------------------
# Glossary seed data
# ---------------------------------------------------------------------------

TERMS: list[dict] = [
    # ── buying_process ─────────────────────────────────────────────────
    {
        "term_de": "Kaufvertrag",
        "term_en": "Purchase Agreement",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "The legally binding contract for buying or selling real estate in Germany.",
        "definition_long": (
            "A Kaufvertrag is the formal purchase agreement between buyer and seller for a property "
            "transaction. In Germany, all real estate purchase agreements must be notarized by a Notar "
            "to be legally valid (§ 311b BGB). The contract covers the purchase price, payment terms, "
            "handover date, and any conditions or encumbrances.\n\n"
            "The notary drafts the contract, reads it aloud to both parties, and ensures both sides "
            "understand their obligations. After signing, the notary initiates the transfer process "
            "including land registry updates and tax notifications."
        ),
        "example_usage": "Before signing the Kaufvertrag, make sure you understand every clause — the notary will read it aloud in German, but you can request a translated draft in advance.",
        "related_terms": ["notar", "grundbuch", "auflassung"],
    },
    {
        "term_de": "Notar",
        "term_en": "Notary",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "A public official who authenticates and notarizes real estate transactions.",
        "definition_long": (
            "In Germany, a Notar (notary) is a legally trained public official who plays a central "
            "role in every real estate transaction. Unlike notaries in many other countries, German "
            "notaries are highly qualified lawyers who are impartial — they represent neither buyer "
            "nor seller but ensure the legality of the transaction.\n\n"
            "The notary drafts the purchase contract, verifies identities, explains legal implications, "
            "manages the escrow account (Notaranderkonto), and handles the registration with the land "
            "registry (Grundbuch). Notary fees are regulated by law and typically run 1.0-1.5% of the "
            "purchase price."
        ),
        "example_usage": "The Notar will schedule a reading appointment where the entire Kaufvertrag is read aloud — this is a legal requirement in Germany.",
        "related_terms": ["kaufvertrag", "notarkosten", "grundbuch"],
    },
    {
        "term_de": "Grundbuch",
        "term_en": "Land Registry",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "The official public register recording property ownership and encumbrances.",
        "definition_long": (
            "The Grundbuch is Germany's official land registry, maintained by local district courts "
            "(Amtsgerichte). It provides a legally binding record of property ownership, mortgages, "
            "easements, and other rights or restrictions attached to a piece of real estate.\n\n"
            "The Grundbuch is divided into three sections (Abteilungen): Abteilung I lists the "
            "current owner(s), Abteilung II records encumbrances and restrictions (e.g., rights of "
            "way, building restrictions), and Abteilung III records mortgages and land charges "
            "(Grundschulden). Ownership is only legally transferred once the new owner is entered "
            "into Abteilung I."
        ),
        "example_usage": "Always request a current Grundbuchauszug before buying — it reveals all mortgages and encumbrances on the property.",
        "related_terms": ["grundbuchauszug", "auflassung", "grundschuld"],
    },
    {
        "term_de": "Grundbuchauszug",
        "term_en": "Land Registry Extract",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "An official copy of the land registry entry for a specific property.",
        "definition_long": (
            "A Grundbuchauszug is a certified extract from the Grundbuch (land registry) that shows "
            "all recorded information about a property. It is an essential document for due diligence "
            "before purchasing real estate.\n\n"
            "The extract shows the current owner, property dimensions, any mortgages or liens, "
            "easements, and building restrictions. You can obtain one from the local Grundbuchamt "
            "(land registry office) if you can demonstrate a legitimate interest, or through your "
            "notary. Banks also require a current Grundbuchauszug for mortgage applications."
        ),
        "example_usage": "The bank required a current Grundbuchauszug no older than three months for the mortgage application.",
        "related_terms": ["grundbuch", "grundschuld", "notar"],
    },
    {
        "term_de": "Auflassung",
        "term_en": "Declaration of Conveyance",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "The formal agreement between buyer and seller to transfer property ownership.",
        "definition_long": (
            "Auflassung is the legal declaration by both buyer and seller, made before a notary, "
            "that they agree to transfer ownership of the property. It is a mandatory step in German "
            "real estate law (§ 925 BGB) and is separate from the purchase agreement itself.\n\n"
            "Typically, the Auflassung is included in the purchase contract but takes effect only "
            "after certain conditions are met (payment, tax clearance). Once complete, the notary "
            "applies for the ownership change in the Grundbuch. An Auflassungsvormerkung (priority "
            "notice) is usually registered immediately to protect the buyer's claim."
        ),
        "example_usage": "The Auflassungsvormerkung was registered in the Grundbuch to protect our purchase claim while awaiting the full ownership transfer.",
        "related_terms": ["kaufvertrag", "grundbuch", "notar"],
    },
    {
        "term_de": "Vorkaufsrecht",
        "term_en": "Right of First Refusal",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "A legal right allowing a party to purchase a property before it can be sold to someone else.",
        "definition_long": (
            "Vorkaufsrecht is a pre-emptive purchase right that can be held by tenants, municipalities, "
            "or other parties. When a property with an active Vorkaufsrecht is sold, the right-holder "
            "can step in and purchase the property at the same terms agreed with the original buyer.\n\n"
            "Municipalities often have a statutory Vorkaufsrecht in certain urban development areas. "
            "Tenants have a Vorkaufsrecht when their rented apartment is converted to a condominium "
            "and sold for the first time (§ 577 BGB). The notary must check for and notify any "
            "Vorkaufsrecht holders as part of the transaction process."
        ),
        "example_usage": "The municipality waived its Vorkaufsrecht, allowing the sale to proceed as planned.",
        "related_terms": ["kaufvertrag", "notar", "eigentumswohnung"],
    },
    {
        "term_de": "Makler",
        "term_en": "Real Estate Agent/Broker",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "A licensed professional who facilitates property sales or rentals.",
        "definition_long": (
            "A Makler is a real estate agent or broker who connects buyers and sellers (or landlords "
            "and tenants). In Germany, agents must hold a trade license (Gewerbeerlaubnis) under "
            "§ 34c GewO and follow specific regulations.\n\n"
            "Since December 2020, the buyer-seller commission split law (Bestellerprinzip for sales) "
            "requires that whoever hires the agent pays at least half the commission. Commission rates "
            "vary by state, typically 3-7% of the purchase price (split between buyer and seller). "
            "The agent earns their commission only upon successful completion of the transaction."
        ),
        "example_usage": "Our Makler found three suitable apartments and arranged viewings within a week.",
        "related_terms": ["maklerprovision", "expose", "kaufvertrag"],
    },
    {
        "term_de": "Exposé",
        "term_en": "Property Listing/Prospectus",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "A detailed property description document prepared by the agent or seller.",
        "definition_long": (
            "An Exposé is a comprehensive property listing document that describes a property for "
            "sale or rent. It typically includes photos, floor plans, location details, technical "
            "specifications, energy certificate data, and the asking price.\n\n"
            "A good Exposé covers: living area (Wohnfläche), plot size (Grundstücksfläche), year "
            "of construction, renovation history, energy rating, monthly costs (Hausgeld for "
            "apartments), and the property's condition. It is the primary marketing document "
            "used by agents and is often the first information a potential buyer receives."
        ),
        "example_usage": "The Exposé showed a spacious 3-room apartment, but we noticed the energy rating was quite poor.",
        "related_terms": ["makler", "energieausweis"],
    },
    {
        "term_de": "Teilungserklärung",
        "term_en": "Declaration of Division",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "The legal document defining individual ownership units within a condominium building.",
        "definition_long": (
            "The Teilungserklärung is a foundational legal document for any condominium (Eigentumswohnung) "
            "building. It divides the property into individual units (Sondereigentum) and common areas "
            "(Gemeinschaftseigentum), and defines each owner's rights and obligations.\n\n"
            "This document specifies what belongs to each unit, common usage rules, cost allocation keys "
            "(Miteigentumsanteile), and any special use rights. It must be reviewed carefully before "
            "purchasing an apartment, as it determines what you can modify in your unit and your share "
            "of common expenses. Changes require unanimous consent of all owners."
        ),
        "example_usage": "The Teilungserklärung showed that the parking space was assigned as Sondernutzungsrecht, not Sondereigentum.",
        "related_terms": ["eigentumswohnung", "hausgeld", "eigentuemergemeinschaft"],
    },
    {
        "term_de": "Energieausweis",
        "term_en": "Energy Performance Certificate",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "A certificate showing a building's energy efficiency rating.",
        "definition_long": (
            "The Energieausweis is a standardized certificate that rates a building's energy efficiency. "
            "It is legally required for all property sales and new rentals in Germany. There are two types: "
            "the Bedarfsausweis (demand-based, calculated from building specifications) and the "
            "Verbrauchsausweis (consumption-based, from actual usage data).\n\n"
            "The certificate uses a color scale from green (efficient) to red (inefficient) with energy "
            "values in kWh/(m²·a). Properties built before 1977 without major renovation typically have "
            "poor ratings. Sellers must present the certificate during viewings, and the energy class "
            "must be included in property advertisements."
        ),
        "example_usage": "The Energieausweis rated the house at energy class F, suggesting significant heating costs and potential renovation needs.",
        "related_terms": ["expose", "nebenkosten"],
    },
    # ── costs_taxes ────────────────────────────────────────────────────
    {
        "term_de": "Grunderwerbsteuer",
        "term_en": "Real Estate Transfer Tax",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "A one-time tax paid by the buyer when purchasing real estate in Germany.",
        "definition_long": (
            "Grunderwerbsteuer is the real estate transfer tax levied on property purchases. The rate "
            "varies by federal state (Bundesland), ranging from 3.5% to 6.5% of the purchase price. "
            "It is one of the largest ancillary costs (Nebenkosten) in a property transaction.\n\n"
            "The tax is triggered by the notarized purchase contract and must be paid before the "
            "ownership transfer can be completed. The tax office (Finanzamt) issues a clearance "
            "certificate (Unbedenklichkeitsbescheinigung) after payment, which is required for the "
            "land registry update. This tax cannot be financed through a mortgage — it must come "
            "from the buyer's own funds."
        ),
        "example_usage": "In Berlin, the Grunderwerbsteuer is 6.0%, so on a €400,000 apartment, you would owe €24,000 in transfer tax alone.",
        "related_terms": ["nebenkosten", "notarkosten", "grundsteuer"],
    },
    {
        "term_de": "Notarkosten",
        "term_en": "Notary Fees",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "Fees charged by the notary for authenticating the property transaction.",
        "definition_long": (
            "Notarkosten are the fees charged by the notary for their services in a real estate "
            "transaction. These fees are legally regulated by the Gerichts- und Notarkostengesetz "
            "(GNotKG) and are not negotiable.\n\n"
            "Notary fees typically amount to approximately 1.0-1.5% of the purchase price and cover "
            "contract drafting, the notarization appointment, escrow account management, and "
            "communication with the land registry and tax office. Additional fees may apply for "
            "mortgage registration (Grundschuldbestellung). The buyer usually pays the notary fees."
        ),
        "example_usage": "The Notarkosten for our €350,000 apartment came to about €4,200, including the Grundschuldbestellung for the mortgage.",
        "related_terms": ["notar", "grunderwerbsteuer", "nebenkosten"],
    },
    {
        "term_de": "Grundsteuer",
        "term_en": "Property Tax",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "An annual municipal tax levied on property owners in Germany.",
        "definition_long": (
            "Grundsteuer is the recurring property tax that every property owner in Germany must pay "
            "to the local municipality. It is calculated based on the assessed value of the property "
            "and the local tax rate (Hebesatz) set by each municipality.\n\n"
            "Following a major reform (effective from 2025), the calculation method varies by state. "
            "The federal model uses property value, land area, and building age. The tax is typically "
            "a few hundred to several thousand euros per year. For rental properties, landlords can "
            "pass the Grundsteuer on to tenants as part of the Nebenkosten."
        ),
        "example_usage": "The Grundsteuer for the apartment was €480 per year, which was included in the monthly Nebenkosten paid by the tenant.",
        "related_terms": ["grunderwerbsteuer", "nebenkosten", "hausgeld"],
    },
    {
        "term_de": "Maklerprovision",
        "term_en": "Agent Commission",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "The commission fee paid to the real estate agent upon successful sale.",
        "definition_long": (
            "Maklerprovision is the commission paid to the real estate agent (Makler) for facilitating "
            "a property sale. Since December 2020, the law requires that whoever hired the agent pays "
            "at least half the commission for residential properties.\n\n"
            "Commission rates vary by region: in most states, it is 3.0-3.57% for each party (buyer "
            "and seller), totaling 6-7.14% including VAT. In some states, the seller traditionally "
            "pays the full commission. The commission is only due after the purchase contract is "
            "notarized and becomes legally binding."
        ),
        "example_usage": "The Maklerprovision was 3.57% each for buyer and seller, adding €12,495 to our purchase costs.",
        "related_terms": ["makler", "nebenkosten", "kaufvertrag"],
    },
    {
        "term_de": "Nebenkosten",
        "term_en": "Ancillary/Additional Costs",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "The additional costs on top of the purchase price when buying property.",
        "definition_long": (
            "Nebenkosten (also called Kaufnebenkosten for purchases) are the additional costs that "
            "come on top of the property purchase price. For buyers, these typically total 7-15% of "
            "the purchase price and include Grunderwerbsteuer (3.5-6.5%), notary and land registry "
            "fees (~1.5-2%), and agent commission (0-3.57%).\n\n"
            "In the rental context, Nebenkosten refers to the ancillary costs on top of the base "
            "rent (Kaltmiete), including heating, water, garbage collection, building insurance, "
            "and Grundsteuer. These are itemized annually in the Nebenkostenabrechnung."
        ),
        "example_usage": "With a purchase price of €300,000 in Bavaria, plan for about €30,000-€35,000 in Nebenkosten.",
        "related_terms": ["grunderwerbsteuer", "notarkosten", "maklerprovision"],
    },
    {
        "term_de": "Hausgeld",
        "term_en": "Condominium Management Fee",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "Monthly fee paid by apartment owners for building management and maintenance.",
        "definition_long": (
            "Hausgeld is the monthly payment made by condominium (Eigentumswohnung) owners to cover "
            "the costs of building management and maintenance. It is calculated based on each owner's "
            "Miteigentumsanteil (co-ownership share) as defined in the Teilungserklärung.\n\n"
            "Hausgeld typically covers: building management (Hausverwaltung), cleaning, maintenance, "
            "insurance, heating costs for common areas, maintenance reserves (Instandhaltungsrücklage), "
            "and sometimes water and heating. It ranges from €2-€5 per square meter per month. If "
            "you rent out the apartment, you can pass on some (but not all) costs to the tenant."
        ),
        "example_usage": "The Hausgeld for the 70m² apartment was €280 per month, of which €70 went to the Instandhaltungsrücklage.",
        "related_terms": ["eigentumswohnung", "teilungserklaerung", "nebenkosten"],
    },
    {
        "term_de": "Grundschuld",
        "term_en": "Land Charge",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "A type of security interest registered against property to secure a mortgage loan.",
        "definition_long": (
            "A Grundschuld is a land charge registered in the Grundbuch (Section III) as security "
            "for a mortgage loan. Unlike a Hypothek (mortgage lien), a Grundschuld is not directly "
            "tied to a specific loan — it remains on the property even after the loan is repaid, "
            "which makes it reusable for future financing.\n\n"
            "Most German banks prefer Grundschuld over Hypothek because of its flexibility. The "
            "registration is done by the notary (Grundschuldbestellung) and costs about 0.3-0.5% "
            "of the mortgage amount. After the loan is fully repaid, the owner can have the "
            "Grundschuld deleted or keep it for future use."
        ),
        "example_usage": "The bank required a Grundschuld of €250,000 to be registered in the Grundbuch before releasing the mortgage funds.",
        "related_terms": ["grundbuch", "darlehen", "notar"],
    },
    # ── financing ──────────────────────────────────────────────────────
    {
        "term_de": "Darlehen",
        "term_en": "Loan/Mortgage",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "A loan provided by a bank to finance a property purchase.",
        "definition_long": (
            "A Darlehen (also Immobiliendarlehen or Baudarlehen) is a loan from a bank or financial "
            "institution used to finance a property purchase. German mortgage loans have specific "
            "characteristics that differ from many other countries.\n\n"
            "Key features include a fixed interest rate period (Zinsbindung) of typically 10-15 years, "
            "an initial repayment rate (Tilgung) of usually 2-3%, and the requirement for "
            "Eigenkapital (equity). After the Zinsbindung expires, the remaining balance is "
            "refinanced at current rates. German banks typically require the borrower to cover "
            "all Nebenkosten from their own funds."
        ),
        "example_usage": "We secured a Darlehen of €280,000 with a 10-year Zinsbindung at 3.2% interest and 2% initial Tilgung.",
        "related_terms": ["zinsbindung", "tilgung", "eigenkapital"],
    },
    {
        "term_de": "Tilgung",
        "term_en": "Repayment/Amortization",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "The portion of the mortgage payment that goes toward reducing the loan principal.",
        "definition_long": (
            "Tilgung refers to the repayment of the loan principal in a mortgage. In Germany, most "
            "mortgages use an annuity structure (Annuitätendarlehen) where the monthly payment stays "
            "constant, but the split between interest and principal repayment shifts over time.\n\n"
            "The initial Tilgungsrate (repayment rate) is typically 2-3% of the loan amount per year. "
            "Higher Tilgung means faster loan repayment but higher monthly payments. Some loans allow "
            "Sondertilgung (special repayments) of 5-10% per year without penalties. A minimum "
            "Tilgung of 1% is required by most banks."
        ),
        "example_usage": "With a 2% Tilgung on our €300,000 loan, our initial monthly repayment was €500, increasing each year as the interest portion decreased.",
        "related_terms": ["darlehen", "sondertilgung", "zinsbindung"],
    },
    {
        "term_de": "Zinsbindung",
        "term_en": "Fixed Interest Rate Period",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "The period during which the mortgage interest rate is fixed and guaranteed.",
        "definition_long": (
            "Zinsbindung is the fixed interest rate period of a German mortgage. During this time, "
            "the interest rate cannot change regardless of market movements. Common periods are "
            "5, 10, 15, or 20 years, with 10 years being the most popular choice.\n\n"
            "A longer Zinsbindung provides more payment security but typically comes with a slightly "
            "higher interest rate. After the Zinsbindung expires, the remaining loan balance "
            "(Restschuld) must be refinanced at then-current rates — this is called "
            "Anschlussfinanzierung. German law allows borrowers to terminate any mortgage after "
            "10 years with 6 months notice (§ 489 BGB), regardless of the agreed Zinsbindung."
        ),
        "example_usage": "We chose a 15-year Zinsbindung at 3.5% to lock in our rate and avoid refinancing risk.",
        "related_terms": ["darlehen", "tilgung", "eigenkapital"],
    },
    {
        "term_de": "Beleihungsauslauf",
        "term_en": "Loan-to-Value Ratio",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "The ratio of the mortgage amount to the property's assessed lending value.",
        "definition_long": (
            "Beleihungsauslauf (also known as LTV — Loan-to-Value) is the ratio between the mortgage "
            "amount and the bank's assessed lending value (Beleihungswert) of the property. This is "
            "a key metric banks use to determine loan terms and interest rates.\n\n"
            "German banks typically assess the Beleihungswert conservatively (80-90% of market value). "
            "A lower Beleihungsauslauf means better interest rates. Most banks offer their best rates "
            "below 60% LTV and require at least 20-30% Eigenkapital for favorable terms. Loans above "
            "80% LTV are possible but come with significantly higher interest rates and stricter "
            "requirements."
        ),
        "example_usage": "With 30% Eigenkapital, our Beleihungsauslauf was 70%, qualifying us for the bank's best interest rate tier.",
        "related_terms": ["darlehen", "eigenkapital", "grundschuld"],
    },
    {
        "term_de": "Eigenkapital",
        "term_en": "Equity/Own Capital",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "The buyer's own funds used to finance part of the property purchase.",
        "definition_long": (
            "Eigenkapital is the buyer's own money used toward the property purchase — the portion "
            "not financed by a bank loan. German banks typically require buyers to cover at least "
            "the Nebenkosten (7-15% of purchase price) from Eigenkapital, with most recommending "
            "20-30% of the total cost.\n\n"
            "Sources of Eigenkapital include savings, securities, existing property equity, family "
            "gifts, and Bausparverträge (building savings contracts). Higher Eigenkapital leads to "
            "better loan terms (lower Beleihungsauslauf). 100% financing (without Eigenkapital) "
            "is rare in Germany and reserved for borrowers with excellent income and credit profiles."
        ),
        "example_usage": "We had €100,000 in Eigenkapital — enough to cover the 20% down payment plus all Nebenkosten for our €400,000 apartment.",
        "related_terms": ["darlehen", "beleihungsauslauf", "nebenkosten"],
    },
    {
        "term_de": "Sondertilgung",
        "term_en": "Special Repayment",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "An extra payment toward the mortgage principal beyond the regular schedule.",
        "definition_long": (
            "Sondertilgung is an additional, unscheduled repayment of the mortgage principal that "
            "goes beyond the regular monthly Tilgung. Most German mortgage contracts allow annual "
            "Sondertilgungen of 5-10% of the original loan amount without penalty.\n\n"
            "Making Sondertilgungen can significantly reduce the total interest paid and shorten the "
            "loan term. Some banks charge a small premium on the interest rate for higher "
            "Sondertilgung allowances. If you make a Sondertilgung beyond the contractually agreed "
            "amount, the bank may charge a Vorfälligkeitsentschädigung (prepayment penalty)."
        ),
        "example_usage": "We used our annual bonus to make a €15,000 Sondertilgung, reducing our loan term by almost two years.",
        "related_terms": ["tilgung", "darlehen", "zinsbindung"],
    },
    {
        "term_de": "Finanzierungsvollmacht",
        "term_en": "Financing Power of Attorney",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "Authorization allowing the bank to register a mortgage on the property before ownership transfer.",
        "definition_long": (
            "A Finanzierungsvollmacht is a power of attorney included in the purchase contract that "
            "allows the buyer's bank to register a Grundschuld (land charge) on the property before "
            "the ownership transfer is complete. This is a standard practice in German property "
            "transactions.\n\n"
            "Without this authorization, the bank could not secure the loan because the buyer is not "
            "yet the registered owner. The seller grants this power in the notarized purchase contract, "
            "enabling the bank to proceed with financing. The Grundschuld is registered alongside the "
            "ownership transfer in the Grundbuch."
        ),
        "example_usage": "The Finanzierungsvollmacht in the Kaufvertrag allowed our bank to register the Grundschuld immediately after signing.",
        "related_terms": ["grundschuld", "kaufvertrag", "darlehen"],
    },
    {
        "term_de": "Annuitätendarlehen",
        "term_en": "Annuity Loan",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "The most common German mortgage type with constant monthly payments.",
        "definition_long": (
            "An Annuitätendarlehen is the standard German mortgage loan structure where the borrower "
            "pays a constant monthly amount (Annuität) throughout the fixed interest rate period. "
            "Each payment consists of an interest portion and a repayment (Tilgung) portion.\n\n"
            "Over time, the interest portion decreases and the Tilgung portion increases as the "
            "outstanding balance shrinks. This means the loan is repaid faster as time goes on. "
            "The initial split is determined by the agreed Tilgungsrate — for example, with 3% "
            "interest and 2% initial Tilgung, the annual payment is 5% of the original loan amount."
        ),
        "example_usage": "Our Annuitätendarlehen has a monthly payment of €1,400 — currently €700 interest and €700 Tilgung.",
        "related_terms": ["darlehen", "tilgung", "zinsbindung"],
    },
    # ── legal ──────────────────────────────────────────────────────────
    {
        "term_de": "BGB",
        "term_en": "German Civil Code",
        "category": GlossaryCategory.LEGAL.value,
        "definition_short": "The foundational civil law code governing contracts, property, and obligations in Germany.",
        "definition_long": (
            "The Bürgerliches Gesetzbuch (BGB) is Germany's civil code, enacted in 1900. It is the "
            "primary source of private law governing contractual relationships, property rights, "
            "family law, and inheritance. For real estate, key sections include Book 2 (Law of "
            "Obligations, especially purchase contracts) and Book 3 (Property Law).\n\n"
            "Important BGB provisions for property buyers include § 433 (purchase obligations), "
            "§ 311b (notarization requirement), § 434-441 (warranty for defects), § 535-580a "
            "(rental law), and § 925 (Auflassung). Understanding the relevant BGB sections helps "
            "foreign buyers know their rights and obligations."
        ),
        "example_usage": "Under § 311b BGB, all real estate purchase contracts must be notarized to be legally binding.",
        "related_terms": ["kaufvertrag", "weg", "mietrecht"],
    },
    {
        "term_de": "WEG",
        "term_en": "Condominium Ownership Act",
        "category": GlossaryCategory.LEGAL.value,
        "definition_short": "The law governing condominium ownership, co-owner rights, and building management.",
        "definition_long": (
            "The Wohnungseigentumsgesetz (WEG) is the German law that regulates condominium ownership "
            "(Wohnungseigentum). It defines the rights and duties of apartment owners, the management "
            "of common property, and the decision-making process within the owners' association "
            "(Eigentümergemeinschaft).\n\n"
            "Key WEG provisions cover: the distinction between Sondereigentum (individual ownership) "
            "and Gemeinschaftseigentum (common property), voting rights at owners' meetings "
            "(Eigentümerversammlungen), the role of the property manager (Verwalter), maintenance "
            "obligations, and the Instandhaltungsrücklage (maintenance reserve). The WEG was "
            "significantly reformed in 2020."
        ),
        "example_usage": "Under the WEG, major building renovations require a resolution at the Eigentümerversammlung.",
        "related_terms": ["eigentumswohnung", "eigentuemergemeinschaft", "teilungserklaerung"],
    },
    {
        "term_de": "Mietrecht",
        "term_en": "Tenancy/Rental Law",
        "category": GlossaryCategory.LEGAL.value,
        "definition_short": "The body of law governing landlord-tenant relationships in Germany.",
        "definition_long": (
            "Mietrecht encompasses all legal provisions governing rental relationships in Germany, "
            "primarily found in §§ 535-580a BGB. German rental law is notably tenant-friendly "
            "compared to many other countries, with strong protections against rent increases and "
            "evictions.\n\n"
            "Key aspects include: rent control (Mietpreisbremse) in designated areas, strict limits "
            "on rent increases (maximum 20% within 3 years, or 15% in tight markets), strong eviction "
            "protection (Kündigungsschutz), security deposit limits (maximum 3 months' Kaltmiete), "
            "and detailed rules for operating cost allocation (Nebenkostenabrechnung)."
        ),
        "example_usage": "Under German Mietrecht, the landlord can only terminate the lease for specific legal reasons, such as personal use (Eigenbedarf).",
        "related_terms": ["mietvertrag", "kaltmiete", "kaution"],
    },
    {
        "term_de": "Eigentümergemeinschaft",
        "term_en": "Owners' Association",
        "category": GlossaryCategory.LEGAL.value,
        "definition_short": "The community of all apartment owners in a condominium building.",
        "definition_long": (
            "An Eigentümergemeinschaft (also Wohnungseigentümergemeinschaft or WEG) is the legally "
            "formed community of all apartment owners in a condominium building. It is automatically "
            "created when the Teilungserklärung is registered, and every apartment buyer becomes a "
            "member.\n\n"
            "The Eigentümergemeinschaft makes decisions about building management, maintenance, "
            "and shared costs at annual owners' meetings (Eigentümerversammlungen). Decisions are "
            "typically made by simple majority vote. A professional Verwalter (property manager) "
            "handles day-to-day management. Before buying an apartment, review the meeting minutes "
            "(Protokolle) to understand upcoming costs and any disputes."
        ),
        "example_usage": "The Eigentümergemeinschaft voted to replace the building's heating system, with costs split according to Miteigentumsanteile.",
        "related_terms": ["weg", "teilungserklaerung", "hausgeld"],
    },
    {
        "term_de": "Gewährleistung",
        "term_en": "Warranty/Guarantee",
        "category": GlossaryCategory.LEGAL.value,
        "definition_short": "The seller's legal liability for defects in the property at the time of sale.",
        "definition_long": (
            "Gewährleistung is the seller's warranty obligation for defects that existed at the time "
            "of property sale. Under §§ 434-441 BGB, the seller is liable for material defects "
            "(Sachmängel) and legal defects (Rechtsmängel).\n\n"
            "In practice, most residential property purchase contracts include a warranty exclusion "
            "clause (Gewährleistungsausschluss) for used properties. However, the seller cannot "
            "exclude liability for defects they knowingly concealed (arglistig verschwiegene Mängel). "
            "For new construction, the warranty period is typically 5 years. Buyers should always "
            "conduct thorough due diligence before purchase."
        ),
        "example_usage": "Despite the Gewährleistungsausschluss in the contract, we could claim damages because the seller had concealed the water damage.",
        "related_terms": ["kaufvertrag", "bgb"],
    },
    {
        "term_de": "Rücktrittsrecht",
        "term_en": "Right of Withdrawal",
        "category": GlossaryCategory.LEGAL.value,
        "definition_short": "The legal right to withdraw from a purchase contract under specific circumstances.",
        "definition_long": (
            "Rücktrittsrecht is the right to withdraw from (rescind) a contract. In German real "
            "estate law, there is generally no automatic cooling-off period after signing the "
            "notarized purchase contract. However, withdrawal is possible in specific circumstances "
            "defined by law or contract.\n\n"
            "Grounds for withdrawal include: fraud or concealed defects by the seller, non-payment "
            "by the buyer (triggering the seller's Rücktrittsrecht), contractually agreed conditions "
            "(e.g., financing contingency), or failure to perform within a set deadline. The "
            "two-week waiting period between receiving the draft contract and the notarization "
            "appointment (§ 17 BeurkG) serves as informal protection for buyers."
        ),
        "example_usage": "We included a Finanzierungsvorbehalt in the Kaufvertrag, giving us a Rücktrittsrecht if our mortgage application was denied.",
        "related_terms": ["kaufvertrag", "gewaehrleistung", "bgb"],
    },
    # ── rental ─────────────────────────────────────────────────────────
    {
        "term_de": "Mietvertrag",
        "term_en": "Rental/Lease Agreement",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "The written contract between landlord and tenant governing a rental property.",
        "definition_long": (
            "A Mietvertrag is the rental agreement between landlord (Vermieter) and tenant (Mieter). "
            "While verbal agreements are technically valid, written contracts are standard practice "
            "and strongly recommended. German rental law (§§ 535-580a BGB) provides extensive "
            "tenant protections that apply regardless of what the contract says.\n\n"
            "A standard Mietvertrag covers: rent amount (Kaltmiete + Nebenkosten), deposit (Kaution), "
            "lease duration (usually indefinite), notice periods, permitted use, renovation "
            "obligations (Schönheitsreparaturen), and house rules. Invalid clauses in a Mietvertrag "
            "are simply void — the tenant is protected by mandatory legal provisions."
        ),
        "example_usage": "Our Mietvertrag specifies a Kaltmiete of €900 plus €200 Nebenkosten for a total monthly rent of €1,100.",
        "related_terms": ["kaltmiete", "warmmiete", "kaution"],
    },
    {
        "term_de": "Kaltmiete",
        "term_en": "Base Rent (Cold Rent)",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "The base monthly rent excluding utilities and ancillary costs.",
        "definition_long": (
            "Kaltmiete (literally 'cold rent') is the base monthly rent for a property, excluding "
            "all ancillary costs (Nebenkosten) such as heating, water, garbage collection, and "
            "building insurance. It is the core rent component and the basis for rent increase "
            "calculations.\n\n"
            "The Kaltmiete is what landlords and comparison tools (Mietspiegel) reference when "
            "comparing rental prices. Rent control (Mietpreisbremse) and rent increase limits "
            "apply to the Kaltmiete. The maximum security deposit (Kaution) is also calculated "
            "as three months' Kaltmiete."
        ),
        "example_usage": "The Mietspiegel for our area shows an average Kaltmiete of €12/m², and our apartment's €11/m² was below market rate.",
        "related_terms": ["warmmiete", "nebenkosten", "mietvertrag"],
    },
    {
        "term_de": "Warmmiete",
        "term_en": "Total Rent (Warm Rent)",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "The total monthly rent including base rent and all ancillary costs.",
        "definition_long": (
            "Warmmiete (literally 'warm rent') is the total monthly rent payment, consisting of "
            "the Kaltmiete (base rent) plus Nebenkosten (ancillary costs including heating, water, "
            "garbage, insurance, etc.). This is the actual amount the tenant pays monthly.\n\n"
            "The Nebenkosten portion of the Warmmiete is usually an advance payment "
            "(Nebenkostenvorauszahlung). Once a year, the landlord must provide a detailed "
            "Nebenkostenabrechnung showing actual costs vs. payments. This can result in a "
            "refund or additional payment for the tenant."
        ),
        "example_usage": "Our Warmmiete is €1,200 per month — €950 Kaltmiete plus €250 Nebenkostenvorauszahlung.",
        "related_terms": ["kaltmiete", "nebenkosten", "nebenkostenabrechnung"],
    },
    {
        "term_de": "Kaution",
        "term_en": "Security Deposit",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "A refundable deposit paid by the tenant as security for the rental agreement.",
        "definition_long": (
            "Kaution (also Mietkaution) is the security deposit a tenant pays at the start of a "
            "rental agreement. German law limits the Kaution to a maximum of three months' "
            "Kaltmiete (net base rent, excluding Nebenkosten). The tenant has the right to pay "
            "it in three equal monthly installments.\n\n"
            "The landlord must keep the Kaution in a separate savings account "
            "(Kautionskonto) and may not mix it with their own funds. Interest earned belongs to "
            "the tenant. Upon move-out, the landlord has a reasonable period (typically 3-6 months) "
            "to return the deposit, after deducting any legitimate claims for damages or unpaid rent."
        ),
        "example_usage": "Our Kaution was three months' Kaltmiete (€2,700), which we paid in three installments of €900.",
        "related_terms": ["mietvertrag", "kaltmiete", "mietrecht"],
    },
    {
        "term_de": "Nebenkostenabrechnung",
        "term_en": "Utility Cost Statement",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "The annual itemized statement of actual ancillary costs prepared by the landlord.",
        "definition_long": (
            "The Nebenkostenabrechnung is an annual statement the landlord must provide to the tenant, "
            "itemizing the actual ancillary costs (Nebenkosten) incurred during the billing period. "
            "The landlord must deliver it within 12 months of the billing period's end — after that, "
            "the tenant cannot be charged additional amounts.\n\n"
            "The statement must list each cost category, the total amount, the allocation key "
            "(e.g., by area, per person, by consumption), and the tenant's share. Only costs listed "
            "in the Betriebskostenverordnung (Operating Cost Regulation) can be passed on. Tenants "
            "have the right to inspect the underlying documents."
        ),
        "example_usage": "The Nebenkostenabrechnung showed we had overpaid by €340, which the landlord refunded to our account.",
        "related_terms": ["nebenkosten", "warmmiete", "kaltmiete"],
    },
    {
        "term_de": "Staffelmiete",
        "term_en": "Graduated Rent",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "A rental arrangement with pre-agreed rent increases at fixed intervals.",
        "definition_long": (
            "Staffelmiete is a rental agreement where future rent increases are pre-determined and "
            "written into the contract at the time of signing. The increases are specified as fixed "
            "amounts or percentages at defined intervals (usually annually).\n\n"
            "The advantages for landlords are predictable income growth without the need for formal "
            "rent increase procedures. For tenants, it provides transparency about future costs. "
            "During a Staffelmiete agreement, the landlord cannot apply additional rent increases "
            "(e.g., referencing the Mietspiegel). However, operating cost adjustments can still "
            "occur. The Mietpreisbremse applies to the starting rent but not to the pre-agreed steps."
        ),
        "example_usage": "Our Staffelmiete agreement starts at €1,000 Kaltmiete and increases by €30 per year for five years.",
        "related_terms": ["mietvertrag", "kaltmiete", "mietrecht"],
    },
    {
        "term_de": "Eigenbedarf",
        "term_en": "Personal Use Need",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "A landlord's legal ground for terminating a lease to use the property themselves.",
        "definition_long": (
            "Eigenbedarf is the most common legal basis for a landlord to terminate a residential "
            "tenancy in Germany. The landlord must demonstrate that they or close family members "
            "need the property for their own use. This is strictly regulated to prevent abuse.\n\n"
            "The landlord must provide a written termination with detailed reasons, and the notice "
            "period depends on the tenancy duration (3-9 months). The tenant can object if "
            "termination would cause undue hardship (Härtefallklausel). Fraudulent Eigenbedarf "
            "claims — where the landlord does not actually move in — can result in damages claims "
            "by the former tenant."
        ),
        "example_usage": "The landlord filed for Eigenbedarf because their daughter needed the apartment for university, giving us 6 months notice.",
        "related_terms": ["mietvertrag", "mietrecht", "kaution"],
    },
    # ── property_types ─────────────────────────────────────────────────
    {
        "term_de": "Eigentumswohnung",
        "term_en": "Condominium/Owner-Occupied Apartment",
        "category": GlossaryCategory.PROPERTY_TYPES.value,
        "definition_short": "An individually owned apartment unit within a multi-unit building.",
        "definition_long": (
            "An Eigentumswohnung (ETW) is a privately owned apartment within a larger building. "
            "The owner holds Sondereigentum (exclusive ownership) of their unit and a proportional "
            "share (Miteigentumsanteil) of the common property (Gemeinschaftseigentum) like "
            "stairways, roof, and facade.\n\n"
            "Owning an Eigentumswohnung means being part of an Eigentümergemeinschaft (owners' "
            "association) and paying monthly Hausgeld for building management and maintenance. "
            "The ownership structure is defined in the Teilungserklärung. ETWs are the most common "
            "form of property investment in German cities."
        ),
        "example_usage": "We bought a 3-room Eigentumswohnung in Hamburg — 85m² with a balcony and underground parking.",
        "related_terms": ["teilungserklaerung", "hausgeld", "eigentuemergemeinschaft"],
    },
    {
        "term_de": "Einfamilienhaus",
        "term_en": "Single-Family House",
        "category": GlossaryCategory.PROPERTY_TYPES.value,
        "definition_short": "A detached house designed for one family, standing on its own plot of land.",
        "definition_long": (
            "An Einfamilienhaus (EFH) is a standalone, detached house intended for a single family. "
            "It sits on its own Grundstück (plot of land), giving the owner full control over both "
            "the building and the land. There is no Eigentümergemeinschaft or shared building "
            "management.\n\n"
            "Einfamilienhäuser are most common in suburban and rural areas. They offer maximum "
            "privacy and freedom for modifications but come with higher maintenance costs and "
            "responsibility. Variants include Reihenhaus (terraced house), Doppelhaushälfte "
            "(semi-detached house), and freistehend (fully detached)."
        ),
        "example_usage": "We found an Einfamilienhaus in the suburbs with a 500m² Grundstück and a garage.",
        "related_terms": ["grundstueck", "grunderwerbsteuer", "grundbuch"],
    },
    {
        "term_de": "Mehrfamilienhaus",
        "term_en": "Multi-Family House",
        "category": GlossaryCategory.PROPERTY_TYPES.value,
        "definition_short": "A residential building with multiple separate apartments, typically as an investment property.",
        "definition_long": (
            "A Mehrfamilienhaus (MFH) is a residential building containing multiple separate "
            "apartments, usually owned by a single entity or individual. Unlike Eigentumswohnungen, "
            "the entire building is one property — there is no Teilungserklärung or "
            "Eigentümergemeinschaft.\n\n"
            "MFHs are popular investment properties because they provide rental income from multiple "
            "units while concentrating management in one location. They require more capital upfront "
            "but offer better returns and risk diversification compared to single apartments. "
            "Management is typically handled by a Hausverwaltung (property management company)."
        ),
        "example_usage": "The investor purchased a Mehrfamilienhaus with 8 apartments, generating a gross rental yield of 5.2%.",
        "related_terms": ["eigentumswohnung", "mietvertrag", "grundbuch"],
    },
    {
        "term_de": "Grundstück",
        "term_en": "Plot of Land",
        "category": GlossaryCategory.PROPERTY_TYPES.value,
        "definition_short": "A defined piece of land registered as a single unit in the land registry.",
        "definition_long": (
            "A Grundstück is a legally defined parcel of land registered as a single entry in the "
            "Grundbuch (land registry). It is identified by its Flurstück number within the local "
            "cadastral system (Kataster). A Grundstück can be developed (bebaut) or undeveloped "
            "(unbebaut).\n\n"
            "When purchasing a Grundstück for building, check the Bebauungsplan (development plan) "
            "to understand what can be built, the Bodenwert (land value) assessment, and any "
            "Altlasten (contamination). Land purchases are subject to the same Grunderwerbsteuer "
            "and notarization requirements as building purchases."
        ),
        "example_usage": "We bought a 600m² Grundstück in a B-Plan area zoned for single-family houses and applied for a building permit.",
        "related_terms": ["grundbuch", "grunderwerbsteuer", "einfamilienhaus"],
    },
    {
        "term_de": "Gewerbeimmobilie",
        "term_en": "Commercial Property",
        "category": GlossaryCategory.PROPERTY_TYPES.value,
        "definition_short": "A property used for commercial or business purposes rather than residential.",
        "definition_long": (
            "A Gewerbeimmobilie is any property used for commercial purposes, including offices "
            "(Büroimmobilien), retail spaces (Einzelhandelsflächen), industrial buildings "
            "(Industrieimmobilien), and mixed-use properties.\n\n"
            "Commercial properties follow different rules than residential: commercial leases have "
            "fewer tenant protections, rent control (Mietpreisbremse) does not apply, and lease "
            "terms are freely negotiable. VAT (Umsatzsteuer) can optionally be applied to "
            "commercial rents, which is advantageous for VAT-registered tenants. Commercial "
            "property investments typically offer higher yields but carry more market risk."
        ),
        "example_usage": "The Gewerbeimmobilie on the ground floor of our building is leased to a pharmacy with a 10-year commercial lease.",
        "related_terms": ["grundstueck", "grunderwerbsteuer", "mietvertrag"],
    },
    {
        "term_de": "Denkmalgeschütztes Gebäude",
        "term_en": "Listed/Heritage-Protected Building",
        "category": GlossaryCategory.PROPERTY_TYPES.value,
        "definition_short": "A building under heritage protection with restrictions on modifications but tax benefits.",
        "definition_long": (
            "A denkmalgeschütztes Gebäude is a building designated as a protected monument "
            "(Baudenkmal) by the local heritage authority (Denkmalschutzbehörde). Any modifications, "
            "renovations, or even minor changes to the exterior or historically significant interior "
            "elements require approval.\n\n"
            "While restrictions can be costly and time-consuming, listed buildings offer significant "
            "tax advantages: owner-occupiers can deduct renovation costs over 10 years (§ 10f EStG), "
            "while investors can claim enhanced depreciation over 12 years (§ 7i EStG). These tax "
            "benefits can make heritage properties attractive investments despite higher renovation "
            "costs."
        ),
        "example_usage": "Our denkmalgeschütztes Gebäude required special approval for new windows, but the tax deductions offset the higher costs.",
        "related_terms": ["eigentumswohnung", "grundbuch"],
    },
    {
        "term_de": "Bauträger",
        "term_en": "Property Developer",
        "category": GlossaryCategory.PROPERTY_TYPES.value,
        "definition_short": "A company that builds or renovates properties for sale to buyers.",
        "definition_long": (
            "A Bauträger is a property developer who builds new residential or commercial properties "
            "on their own land for sale to individual buyers. Unlike a general contractor "
            "(Generalunternehmer), the Bauträger owns the land and sells both the land and the "
            "completed building.\n\n"
            "Buying from a Bauträger is regulated by the Makler- und Bauträgerverordnung (MaBV), "
            "which protects buyers through staged payment plans tied to construction milestones. "
            "The Bauträger provides a warranty (typically 5 years) for construction defects. "
            "Buyers should verify the developer's track record, financial stability, and the "
            "Baubeschreibung (building specification) before committing."
        ),
        "example_usage": "We purchased a Neubau apartment from a Bauträger with payments spread across 7 construction phases according to MaBV.",
        "related_terms": ["kaufvertrag", "gewaehrleistung", "grundbuch"],
    },
    {
        "term_de": "Mietspiegel",
        "term_en": "Rent Index/Rent Mirror",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "An official reference table showing typical local rents for comparable properties.",
        "definition_long": (
            "The Mietspiegel is an official or qualified index of typical rents in a municipality, "
            "used as a reference for rent setting and rent increase disputes. It provides average "
            "rents (Kaltmiete per m²) based on property characteristics like size, age, condition, "
            "and location.\n\n"
            "There are two types: the einfacher Mietspiegel (simple, survey-based) and the "
            "qualifizierter Mietspiegel (qualified, scientifically validated). The Mietspiegel is "
            "the primary tool for determining whether a rent is within the locally comparable range "
            "(ortsübliche Vergleichsmiete). Landlords must reference it when requesting rent "
            "increases, and it is central to Mietpreisbremse enforcement."
        ),
        "example_usage": "According to the Berlin Mietspiegel, the comparable rent for our apartment type is €9.50/m², so the landlord's increase request was justified.",
        "related_terms": ["kaltmiete", "mietrecht", "mietvertrag"],
    },
    {
        "term_de": "Mietpreisbremse",
        "term_en": "Rent Control/Rent Brake",
        "category": GlossaryCategory.RENTAL.value,
        "definition_short": "A regulation limiting new rental prices to 10% above the local average in designated areas.",
        "definition_long": (
            "The Mietpreisbremse (rent brake) is a regulation that limits the rent a landlord can "
            "charge for a new tenancy in designated tight housing markets. The rent for a new lease "
            "may not exceed 10% above the local comparable rent (ortsübliche Vergleichsmiete) as "
            "determined by the Mietspiegel.\n\n"
            "Exceptions include: new construction (first use), extensive modernization, and cases "
            "where the previous tenant's rent was already above the limit. The regulation applies "
            "in many major German cities (Berlin, Munich, Hamburg, etc.) and has been extended "
            "multiple times. Tenants can reclaim excess rent paid if the landlord violates the "
            "Mietpreisbremse."
        ),
        "example_usage": "Thanks to the Mietpreisbremse in Munich, the landlord could only set the rent at €14.50/m² instead of the requested €17/m².",
        "related_terms": ["mietspiegel", "kaltmiete", "mietrecht"],
    },
    # ── Additional important terms ────────────────────────────────────
    {
        "term_de": "Wohnfläche",
        "term_en": "Living Area/Floor Space",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "The officially calculated living area of a property, measured by specific regulations.",
        "definition_long": (
            "Wohnfläche is the living area of a property, calculated according to specific German "
            "regulations — primarily the Wohnflächenverordnung (WoFlV). The calculation includes "
            "full floor space of rooms, kitchens, and bathrooms, but applies different percentages "
            "for balconies (25-50%), rooms with low ceiling heights, and unheated areas.\n\n"
            "The stated Wohnfläche is legally significant: a deviation of more than 10% from the "
            "stated area can justify rent reductions or price adjustments. Buyers and tenants should "
            "verify the stated Wohnfläche, as measurements by different methods can yield different "
            "results. The Wohnfläche determines Hausgeld shares, rent comparisons, and property value."
        ),
        "example_usage": "The Exposé listed 85m² Wohnfläche, but our own measurement using the WoFlV method showed only 79m².",
        "related_terms": ["expose", "kaltmiete", "eigentumswohnung"],
    },
    {
        "term_de": "Instandhaltungsrücklage",
        "term_en": "Maintenance Reserve Fund",
        "category": GlossaryCategory.COSTS_TAXES.value,
        "definition_short": "A mandatory savings fund for future building maintenance and repairs in condominiums.",
        "definition_long": (
            "The Instandhaltungsrücklage (also Erhaltungsrücklage since the 2020 WEG reform) is a "
            "reserve fund that condominium owners must contribute to as part of their Hausgeld. It "
            "is saved for future building maintenance, repairs, and renovations.\n\n"
            "The recommended contribution is €7-€12 per m² per year, depending on the building's "
            "age and condition. When buying an apartment, check the current balance of the "
            "Instandhaltungsrücklage — a low balance may indicate upcoming special assessments "
            "(Sonderumlagen) for deferred maintenance. The reserve amount is not refunded when "
            "selling the apartment; it transfers with the property."
        ),
        "example_usage": "The Eigentümergemeinschaft had an Instandhaltungsrücklage of €180,000 — a healthy amount for the 20-unit building.",
        "related_terms": ["hausgeld", "eigentuemergemeinschaft", "weg"],
    },
    {
        "term_de": "Zwangsversteigerung",
        "term_en": "Foreclosure Auction",
        "category": GlossaryCategory.BUYING_PROCESS.value,
        "definition_short": "A court-ordered public auction of a property, typically due to mortgage default.",
        "definition_long": (
            "Zwangsversteigerung is a court-supervised forced sale of a property, usually initiated "
            "by a creditor (typically a bank) when the owner defaults on their mortgage. The auction "
            "is conducted at the local district court (Amtsgericht) and is open to the public.\n\n"
            "Properties sold at auction can be significantly below market value, but they come with "
            "risks: limited inspection opportunity, no seller warranty, existing tenant rights remain, "
            "and you must pay a deposit of 10% of the assessed value (Verkehrswert) immediately. The "
            "minimum bid in the first round is 50% of the Verkehrswert (7/10 in special cases). "
            "Financing must be secured in advance."
        ),
        "example_usage": "We acquired the apartment at a Zwangsversteigerung for 75% of the Verkehrswert, saving over €80,000 compared to market price.",
        "related_terms": ["grundschuld", "grundbuch", "darlehen"],
    },
    {
        "term_de": "Baulast",
        "term_en": "Building Obligation/Public Law Restriction",
        "category": GlossaryCategory.LEGAL.value,
        "definition_short": "A public law obligation registered against a property that restricts its use or development.",
        "definition_long": (
            "A Baulast is a voluntary commitment by a property owner to the building authority "
            "(Bauamt) to do, tolerate, or refrain from doing something on their property. Unlike "
            "entries in the Grundbuch, Baulasten are recorded in a separate Baulastenverzeichnis "
            "maintained by the building authority.\n\n"
            "Common examples include granting a right of way to a neighboring property, ensuring "
            "minimum distances between buildings, or committing to maintain a certain number of "
            "parking spaces. Baulasten are binding on all future owners. Before purchasing, always "
            "request a Baulastenauskunft from the local building authority — these restrictions "
            "are not visible in the Grundbuch."
        ),
        "example_usage": "The Baulastenauskunft revealed a Baulast requiring us to maintain a 3-meter setback from the property boundary.",
        "related_terms": ["grundbuch", "grundstueck", "bgb"],
    },
    {
        "term_de": "Schufa",
        "term_en": "Credit Reporting Agency",
        "category": GlossaryCategory.FINANCING.value,
        "definition_short": "Germany's main credit reporting agency, essential for mortgage applications and rentals.",
        "definition_long": (
            "Schufa (Schutzgemeinschaft für allgemeine Kreditsicherung) is Germany's primary credit "
            "reporting agency, similar to credit bureaus in other countries. A Schufa report (Schufa-"
            "Auskunft or Bonitätsauskunft) is required for virtually all mortgage applications and "
            "many rental applications.\n\n"
            "Your Schufa score ranges from 0 to 100, with higher scores indicating better "
            "creditworthiness. Factors include payment history, credit accounts, and address "
            "stability. Foreign buyers new to Germany may have no Schufa record, which can "
            "complicate mortgage applications. You can request one free self-disclosure "
            "(Datenkopie) per year directly from Schufa."
        ),
        "example_usage": "The bank required a Schufa-Auskunft as part of the mortgage application — our score of 97 helped secure favorable terms.",
        "related_terms": ["darlehen", "eigenkapital", "beleihungsauslauf"],
    },
]


def seed_glossary(session: Session) -> None:
    """Seed glossary terms into the database. Idempotent."""
    created = 0
    skipped = 0

    for term_data in TERMS:
        slug = _slugify(term_data["term_de"])

        # Check if term already exists
        existing = session.exec(
            select(GlossaryTerm).where(GlossaryTerm.slug == slug)
        ).first()

        if existing:
            skipped += 1
            continue

        term = GlossaryTerm(
            id=uuid.uuid4(),
            term_de=term_data["term_de"],
            term_en=term_data["term_en"],
            slug=slug,
            definition_short=term_data["definition_short"],
            definition_long=term_data["definition_long"],
            category=term_data["category"],
            example_usage=term_data.get("example_usage"),
            related_terms=term_data.get("related_terms", []),
        )
        session.add(term)
        created += 1

    session.commit()
    logger.info("Glossary seed complete: %d created, %d skipped", created, skipped)


if __name__ == "__main__":
    import logging

    from app.core.db import engine

    logging.basicConfig(level=logging.INFO)

    with Session(engine) as session:
        seed_glossary(session)
