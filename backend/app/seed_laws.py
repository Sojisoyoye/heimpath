"""Seed German real estate laws into the database.

Populates the law, court_ruling, and state_variation tables with
real German property law data. Idempotent: skips laws that already
exist (matched by citation).
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models.legal import (
    CourtRuling,
    Law,
    LawCategory,
    PropertyTypeApplicability,
    StateVariation,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Law seed data
# ---------------------------------------------------------------------------

LAWS: list[dict] = [
    # ── buying_process ─────────────────────────────────────────────────
    {
        "citation": "§ 433 BGB",
        "title_de": "Vertragstypische Pflichten beim Kaufvertrag",
        "title_en": "Contractual Obligations in Purchase Agreements",
        "category": LawCategory.BUYING_PROCESS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Defines the mutual obligations of buyer and seller in a purchase agreement.",
        "short_summary": (
            "§ 433 BGB establishes the fundamental obligations in a purchase contract. "
            "The seller must deliver the property and transfer ownership free of defects, "
            "while the buyer must pay the agreed purchase price and accept delivery."
        ),
        "detailed_explanation": (
            "This section forms the backbone of German contract law for property transactions. "
            "It requires the seller to hand over the property in the agreed condition and to transfer "
            "legal title. Any material or legal defects present at the time of transfer can trigger "
            "warranty claims under §§ 434-441 BGB.\n\n"
            "For real estate, the purchase agreement must be notarized (see § 311b BGB). The buyer's "
            "primary obligation is to pay the purchase price, typically deposited into a notary escrow "
            "account (Notaranderkonto) until all conditions for transfer are met.\n\n"
            "The law also addresses risk allocation: once the property is handed over, the risk of "
            "accidental deterioration passes to the buyer, making thorough due diligence essential."
        ),
        "real_world_example": (
            "Maria from Spain agrees to buy an apartment in Munich for €350,000. Under § 433, the seller "
            "must ensure the apartment is free from undisclosed defects (e.g., hidden water damage). Maria "
            "must pay the full price. Both parties sign a notarized contract detailing these obligations."
        ),
        "buyer_implications": (
            "You have the right to receive the property free of material and legal defects. Ensure your "
            "purchase contract includes detailed property descriptions and any agreed repairs."
        ),
        "seller_implications": (
            "You must disclose all known defects. Concealing defects can lead to warranty claims and "
            "potential rescission of the contract even years after the sale."
        ),
    },
    {
        "citation": "§ 311b BGB",
        "title_de": "Verträge über Grundstücke, das Vermögen und den Nachlass",
        "title_en": "Notarization Requirement for Real Estate Contracts",
        "category": LawCategory.BUYING_PROCESS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "All real estate purchase contracts must be notarized to be legally valid.",
        "short_summary": (
            "§ 311b BGB mandates that any contract obligating a party to transfer or acquire ownership "
            "of real estate must be notarized by a German notary. Without notarization, the contract is void."
        ),
        "detailed_explanation": (
            "This is one of the most important provisions for foreign buyers to understand. Unlike many "
            "countries where a simple written agreement suffices, German law requires mandatory notarization "
            "of all real estate purchase contracts. The notary acts as a neutral legal advisor to both parties.\n\n"
            "The notary's role includes: reading the entire contract aloud to both parties, explaining legal "
            "implications, ensuring both parties understand their obligations, and filing the necessary "
            "documents with the land registry (Grundbuch).\n\n"
            "A contract that is not notarized is legally void (nichtig). However, this defect is cured once "
            "the transfer of ownership is completed by registration in the land registry and payment of the "
            "purchase price."
        ),
        "real_world_example": (
            "James from the UK finds a house in Berlin and signs a private purchase agreement with the seller. "
            "This agreement is not legally binding. Only after both parties appear before a notary and the "
            "contract is formally notarized does it become valid and enforceable."
        ),
        "buyer_implications": (
            "You must attend a notary appointment. The notary will explain the contract in detail. If you "
            "do not speak German, a certified interpreter must be present. Budget 1.5-2% of purchase price for notary fees."
        ),
        "seller_implications": (
            "You cannot enforce any agreement made outside notarization. The notary protects both parties equally."
        ),
    },
    {
        "citation": "§ 925 BGB",
        "title_de": "Auflassung",
        "title_en": "Transfer of Ownership (Auflassung)",
        "category": LawCategory.BUYING_PROCESS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "The formal declaration by both parties to transfer property ownership, made before a notary.",
        "short_summary": (
            "§ 925 BGB governs the Auflassung — the formal agreement between seller and buyer to transfer "
            "ownership of real property. It must be declared before a notary with both parties present."
        ),
        "detailed_explanation": (
            "The Auflassung is the real-rights agreement (dingliche Einigung) that, together with registration "
            "in the land registry, completes the transfer of property ownership. It is separate from the "
            "purchase contract (which is merely the obligatory agreement).\n\n"
            "This reflects Germany's 'separation principle' (Trennungsprinzip): the obligation to transfer "
            "(Kaufvertrag) and the actual transfer (Auflassung + registration) are legally distinct acts. "
            "In practice, the Auflassung is usually declared simultaneously with the notarization of the "
            "purchase contract.\n\n"
            "The Auflassung cannot be subject to conditions or time limits. It becomes effective only upon "
            "registration in the Grundbuch."
        ),
        "real_world_example": (
            "During the notary appointment for her Munich apartment purchase, Maria and the seller formally "
            "declare the Auflassung. The notary then submits the application to the land registry. Maria "
            "becomes the legal owner only once the Grundbuch is updated, typically 4-8 weeks later."
        ),
        "buyer_implications": (
            "You are not the legal owner until the land registry is updated. The Auflassung is typically "
            "combined with the purchase contract notarization to save time and costs."
        ),
        "seller_implications": (
            "Once the Auflassung is declared and the land registry updated, ownership transfer is final. "
            "Ensure all payment conditions are met before declaring the Auflassung."
        ),
    },
    {
        "citation": "§ 873 BGB",
        "title_de": "Erwerb durch Einigung und Eintragung",
        "title_en": "Acquisition by Agreement and Registration",
        "category": LawCategory.BUYING_PROCESS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Property rights are transferred only through agreement plus land registry registration.",
        "short_summary": (
            "§ 873 BGB establishes that the transfer, encumbrance, or modification of rights to real "
            "property requires both an agreement between the parties and registration in the land registry (Grundbuch)."
        ),
        "detailed_explanation": (
            "This section codifies a fundamental principle of German property law: no change in real property "
            "rights takes effect without land registry registration. This dual requirement (agreement + registration) "
            "provides legal certainty and protects third parties who rely on the land registry.\n\n"
            "The land registry (Grundbuch) is maintained by the local district court (Amtsgericht) and is considered "
            "to be correct unless proven otherwise (public faith of the land registry, § 892 BGB). This means "
            "buyers can rely on the information in the Grundbuch.\n\n"
            "The registration process typically takes 4-8 weeks after the notary submits the application. "
            "During this period, a priority notice (Vormerkung) protects the buyer's rights."
        ),
        "real_world_example": (
            "After the notary appointment, the notary submits the transfer application to the Grundbuchamt. "
            "Until the registration is completed, the buyer is protected by a priority notice that prevents "
            "the seller from selling to someone else or encumbering the property."
        ),
        "buyer_implications": (
            "You become the legal owner only upon registration. Always verify the Grundbuch extract before "
            "purchasing to check for existing encumbrances, mortgages, or easements."
        ),
        "seller_implications": (
            "Your ownership ends upon registration of the new owner. Existing mortgages must typically be "
            "cleared before or during the transfer process."
        ),
    },
    {
        "citation": "§ 883 BGB",
        "title_de": "Voraussetzungen und Wirkung der Vormerkung",
        "title_en": "Priority Notice (Vormerkung)",
        "category": LawCategory.BUYING_PROCESS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "A priority notice in the land registry secures the buyer's claim to ownership during the transfer process.",
        "short_summary": (
            "§ 883 BGB allows a priority notice (Vormerkung) to be registered in the land registry to "
            "protect a buyer's contractual claim to acquire property. It prevents the seller from selling "
            "to a third party or encumbering the property."
        ),
        "detailed_explanation": (
            "The Vormerkung is a critical protective mechanism in German property transactions. After the "
            "purchase contract is notarized but before ownership is transferred (which can take weeks), "
            "the buyer is vulnerable. The priority notice closes this gap.\n\n"
            "Once registered, any subsequent dispositions by the seller that would conflict with the buyer's "
            "claim are ineffective against the buyer. This includes attempts to sell the property to someone "
            "else, register additional mortgages, or create other encumbrances.\n\n"
            "The notary typically applies for the Vormerkung immediately after notarization. It remains in "
            "the land registry until the full ownership transfer is registered, at which point it is deleted."
        ),
        "real_world_example": (
            "After signing the notarized purchase contract, a Vormerkung is registered for James within days. "
            "Two weeks later, the seller receives a higher offer from another buyer. Thanks to the Vormerkung, "
            "the seller cannot sell to the other buyer — James's claim is secured."
        ),
        "buyer_implications": (
            "The Vormerkung is your safety net during the transfer period. Ensure your notary applies for it "
            "immediately after contract signing. It is standard practice and included in notary fees."
        ),
        "seller_implications": (
            "Once a Vormerkung is registered, you cannot sell or further encumber the property. Only proceed "
            "with notarization when you are certain about the sale."
        ),
    },
    # ── costs_and_taxes ────────────────────────────────────────────────
    {
        "citation": "§ 1 GrEStG",
        "title_de": "Erwerbsvorgänge (Grunderwerbsteuergesetz)",
        "title_en": "Real Estate Transfer Tax (Grunderwerbsteuer)",
        "category": LawCategory.COSTS_AND_TAXES.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Real estate acquisitions in Germany are subject to transfer tax, varying by state from 3.5% to 6.5%.",
        "short_summary": (
            "§ 1 GrEStG defines which transactions trigger real estate transfer tax (Grunderwerbsteuer). "
            "This tax applies to virtually all property acquisitions and is calculated as a percentage of "
            "the purchase price, with rates set individually by each federal state."
        ),
        "detailed_explanation": (
            "The Grunderwerbsteuer is one of the most significant closing costs for property buyers in Germany. "
            "It is triggered by any legal transaction that results in a transfer of ownership of German real "
            "estate, including standard purchases, foreclosure acquisitions, and certain corporate transactions.\n\n"
            "Tax rates vary significantly between German states (Bundesländer), ranging from 3.5% in Bavaria "
            "(Bayern) to 6.5% in Brandenburg, Nordrhein-Westfalen, Saarland, Schleswig-Holstein, and Thüringen. "
            "The tax is calculated on the full purchase price as stated in the notarized contract.\n\n"
            "The tax must be paid before ownership transfer can be completed. The tax office issues a clearance "
            "certificate (Unbedenklichkeitsbescheinigung) which the land registry requires before registering "
            "the new owner. Non-payment blocks the entire transaction."
        ),
        "real_world_example": (
            "Maria buys her Munich apartment for €350,000. Bavaria has the lowest transfer tax rate at 3.5%, "
            "so she pays €12,250 in transfer tax. If she had bought the same apartment in Berlin (6.0%), "
            "she would pay €21,000 — a difference of €8,750."
        ),
        "buyer_implications": (
            "Always factor in the transfer tax for your state when budgeting. The tax is due within one month "
            "of receiving the tax assessment notice. It cannot be financed through the mortgage in most cases."
        ),
        "seller_implications": (
            "While the buyer typically pays the transfer tax, both buyer and seller are jointly liable (Gesamtschuldner). "
            "In practice, the purchase contract assigns the obligation to the buyer."
        ),
    },
    {
        "citation": "§ 17 BNotO",
        "title_de": "Amtspflichten des Notars bei Urkundsgeschäften",
        "title_en": "Notary Fee Obligation",
        "category": LawCategory.COSTS_AND_TAXES.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Notary fees for property transactions are legally regulated and typically amount to 1.5-2% of the purchase price.",
        "short_summary": (
            "§ 17 BNotO together with the GNotKG (Notary Costs Act) regulates the notary's duties and fee "
            "structure. Notary fees are not freely negotiable — they are set by law and apply uniformly across Germany."
        ),
        "detailed_explanation": (
            "In Germany, notary fees for real estate transactions are standardized by the GNotKG (Gerichts- "
            "und Notarkostengesetz). Unlike in some countries, notaries cannot compete on price. The fees "
            "are calculated based on the property value using a degressive scale.\n\n"
            "For a typical property purchase, total notary costs (including land registry fees) amount to "
            "approximately 1.5-2% of the purchase price. This covers: drafting and notarizing the purchase "
            "contract, managing the Auflassung, applying for the Vormerkung, obtaining the tax clearance "
            "certificate, and coordinating with the land registry.\n\n"
            "The notary's statutory duty includes advising both parties impartially, reading the entire contract "
            "aloud, and ensuring both parties understand the legal implications of the transaction."
        ),
        "real_world_example": (
            "For a €400,000 property purchase, notary fees typically total around €6,000-8,000. This includes "
            "the notarization itself, various certifications, and the land registry application. These fees "
            "are the same whether you buy in Munich or Hamburg."
        ),
        "buyer_implications": (
            "Notary fees are non-negotiable and must be budgeted as a fixed closing cost. The buyer traditionally "
            "pays all notary fees. Ensure you understand every clause before signing."
        ),
        "seller_implications": (
            "While the buyer usually pays notary fees, you may be responsible for costs related to releasing "
            "existing mortgages or encumbrances from the property."
        ),
    },
    {
        "citation": "§ 19 GBO",
        "title_de": "Bewilligung (Grundbuchordnung)",
        "title_en": "Land Registry Application and Fees",
        "category": LawCategory.COSTS_AND_TAXES.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Land registry registration requires a formal application and fees of approximately 0.5% of the property value.",
        "short_summary": (
            "§ 19 GBO governs the application process for land registry entries. Any change to the Grundbuch "
            "requires a formal application, typically submitted by the notary, along with prescribed fees."
        ),
        "detailed_explanation": (
            "The Grundbuchordnung (Land Registry Act) establishes the procedural requirements for all entries "
            "in the German land registry. § 19 specifically addresses the consent requirement — entries can "
            "only be made with the consent of the affected party.\n\n"
            "Land registry fees are regulated by the GNotKG and are calculated based on the property value. "
            "For a standard ownership transfer, the fee is approximately 0.5% of the purchase price. Additional "
            "fees apply for registering mortgages, easements, or other encumbrances.\n\n"
            "The land registry is maintained by the local Amtsgericht (district court) and provides a reliable "
            "record of property ownership, mortgages, easements, and other rights. Its entries enjoy public "
            "faith (öffentlicher Glaube), meaning third parties can rely on their accuracy."
        ),
        "real_world_example": (
            "When Maria's ownership is registered, the land registry fee is about €1,750 for her €350,000 "
            "apartment. An additional fee applies for registering her bank's mortgage. The notary handles "
            "all submissions and fee payments on her behalf."
        ),
        "buyer_implications": (
            "Land registry fees are a separate closing cost from notary fees. Always request a current "
            "Grundbuchauszug (land registry extract) before purchase to verify ownership and encumbrances."
        ),
        "seller_implications": (
            "You must consent to the deletion of your ownership entry. Any existing encumbrances you wish "
            "removed require separate deletion applications and fees."
        ),
    },
    {
        "citation": "§ 7 EStG",
        "title_de": "Absetzung für Abnutzung (AfA)",
        "title_en": "Building Depreciation (AfA)",
        "category": LawCategory.COSTS_AND_TAXES.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Property investors can deduct building depreciation from taxable rental income, typically 2-3% annually.",
        "short_summary": (
            "§ 7 EStG allows owners of income-generating properties to deduct annual depreciation (AfA) "
            "on the building value from their taxable income. The rate depends on the building's construction year."
        ),
        "detailed_explanation": (
            "The Absetzung für Abnutzung (AfA) is a crucial tax benefit for property investors in Germany. "
            "It allows the building portion (not the land) of an investment property to be depreciated over "
            "its useful life, reducing taxable rental income.\n\n"
            "Standard depreciation rates: buildings completed after 1925 can be depreciated at 2% per year "
            "(50-year useful life). Buildings completed before 1925 at 2.5% per year (40-year useful life). "
            "Since 2023, new residential buildings can be depreciated at 3% per year (approx. 33-year useful life).\n\n"
            "Only the building value qualifies — the land value must be separated. The tax office typically "
            "uses the Bodenrichtwert (standard land value) to determine the land portion. Investors should "
            "consider having the split professionally assessed to maximize the depreciable building share."
        ),
        "real_world_example": (
            "James buys a rental apartment in Berlin for €300,000. The land is valued at €90,000, leaving "
            "€210,000 as building value. At 2% AfA, he can deduct €4,200 annually from his rental income, "
            "significantly reducing his tax burden over the 50-year depreciation period."
        ),
        "buyer_implications": (
            "AfA is only available for investment properties generating rental income, not for owner-occupied "
            "homes. Keep records of the purchase price allocation between land and building."
        ),
        "landlord_implications": (
            "Claim AfA annually in your tax return. Consider higher depreciation rates for historic buildings "
            "or energy-efficient renovations (Sonder-AfA). Consult a Steuerberater for optimization."
        ),
    },
    # ── rental_law ─────────────────────────────────────────────────────
    {
        "citation": "§ 535 BGB",
        "title_de": "Inhalt und Hauptpflichten des Mietvertrags",
        "title_en": "Rental Agreement - Content and Obligations",
        "category": LawCategory.RENTAL_LAW.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Defines the core obligations of landlords and tenants in a rental agreement.",
        "short_summary": (
            "§ 535 BGB establishes the fundamental obligations in a rental agreement. The landlord must "
            "provide the property in a suitable condition and maintain it throughout the tenancy. The tenant "
            "must pay the agreed rent."
        ),
        "detailed_explanation": (
            "This is the foundational provision for all rental relationships in Germany. The landlord's primary "
            "obligation is to provide the rental property in a condition suitable for the contractually agreed "
            "use and to maintain it in this condition during the entire rental period.\n\n"
            "The tenant's main obligation is to pay the agreed rent on time. The rent typically consists of "
            "the basic rent (Kaltmiete or Nettomiete) plus advance payments for operating costs (Betriebskosten). "
            "German law strongly protects tenants, making it difficult for landlords to terminate leases.\n\n"
            "Key principle: the landlord bears the burden of maintaining the property. Repairs and maintenance "
            "of the building structure, communal areas, and essential systems (heating, plumbing) are the "
            "landlord's responsibility. Only minor cosmetic repairs may be transferred to the tenant via "
            "specific contractual clauses."
        ),
        "real_world_example": (
            "A foreign investor buys a rented apartment in Hamburg. The existing tenancy agreement is protected — "
            "the investor inherits all landlord obligations including maintenance. The tenant's rent and rights "
            "remain unchanged under the principle 'Kauf bricht nicht Miete' (purchase does not break tenancy)."
        ),
        "landlord_implications": (
            "You must maintain the property and respond to repair requests promptly. Failure to maintain the "
            "property can entitle tenants to rent reductions (Mietminderung)."
        ),
        "tenant_implications": (
            "You must pay rent on time and treat the property with care. You have strong protections against "
            "arbitrary rent increases and termination."
        ),
    },
    {
        "citation": "§ 556 BGB",
        "title_de": "Vereinbarungen über Betriebskosten",
        "title_en": "Operating Costs (Betriebskosten)",
        "category": LawCategory.RENTAL_LAW.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Landlords may charge tenants for operating costs only if explicitly agreed and properly accounted for.",
        "short_summary": (
            "§ 556 BGB governs the allocation of operating costs (Betriebskosten) between landlord and tenant. "
            "Operating costs can only be passed to tenants if the rental agreement contains an explicit clause, "
            "and landlords must provide an annual accounting (Betriebskostenabrechnung)."
        ),
        "detailed_explanation": (
            "Operating costs (Nebenkosten) are a significant part of the total rent in Germany. The "
            "Betriebskostenverordnung (BetrKV) defines exactly which costs can be passed on to tenants: "
            "property tax, water/sewage, waste disposal, building insurance, heating, common area electricity, "
            "garden maintenance, chimney sweep, and others.\n\n"
            "The landlord must provide a detailed annual statement within 12 months of the accounting period's end. "
            "If the statement arrives late, the landlord cannot demand additional payments. The tenant has the "
            "right to inspect all underlying invoices.\n\n"
            "For investors: properly managing Betriebskosten is essential. Overcharging or failing to provide "
            "timely statements can result in losing the right to collect, creating significant financial risk."
        ),
        "real_world_example": (
            "An investor receives the 2024 Betriebskostenabrechnung showing tenants were overcharged by €300 each "
            "for heating costs due to an error. The tenants are entitled to a refund, and the investor must "
            "correct the accounting and repay the overcharge."
        ),
        "landlord_implications": (
            "Provide timely and accurate annual operating cost statements. Late statements mean you cannot "
            "demand additional payments from tenants."
        ),
        "tenant_implications": (
            "Review your annual Betriebskostenabrechnung carefully. You have the right to dispute charges "
            "within 12 months and to inspect the underlying invoices."
        ),
    },
    {
        "citation": "§ 558 BGB",
        "title_de": "Mieterhöhung bis zur ortsüblichen Vergleichsmiete",
        "title_en": "Rent Increase to Local Comparative Rent",
        "category": LawCategory.RENTAL_LAW.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Landlords can increase rent up to the local comparative rent level, with strict procedural requirements.",
        "short_summary": (
            "§ 558 BGB allows landlords to increase rent for existing tenancies up to the local comparative "
            "rent (ortsübliche Vergleichsmiete), subject to caps: no more than 20% within three years "
            "(15% in tight housing markets — Kappungsgrenze)."
        ),
        "detailed_explanation": (
            "Rent increases for existing tenancies in Germany are heavily regulated. A landlord can only raise "
            "the rent to match the local comparative rent level, which is determined by the local Mietspiegel "
            "(rent index), comparable properties, or expert opinions.\n\n"
            "The landlord must justify the increase in writing and reference the applicable Mietspiegel. The "
            "tenant has a reflection period and can either agree or refuse. If the tenant refuses, the landlord "
            "must seek court approval.\n\n"
            "Additional restrictions apply in areas with tight housing markets (angespannte Wohnungsmärkte), "
            "where cities like Berlin and Munich have designated lower caps (Kappungsgrenze of 15% over three "
            "years instead of the standard 20%). The Mietpreisbremse (rent brake) further limits rents for new "
            "tenancies in these areas."
        ),
        "real_world_example": (
            "An investor owns a Berlin apartment rented at €8/m². The local Mietspiegel shows comparable "
            "apartments rent for €10/m². The investor can increase rent, but only by a maximum of 15% over "
            "three years due to Berlin's Kappungsgrenze. So the first increase is limited to €9.20/m²."
        ),
        "landlord_implications": (
            "Always reference the Mietspiegel when increasing rent. Follow the formal process exactly, "
            "as procedural errors invalidate the increase. Allow tenants the required reflection period."
        ),
        "tenant_implications": (
            "You can refuse an unjustified rent increase. Check the local Mietspiegel to verify whether "
            "the proposed increase is legitimate. Seek legal advice from a Mieterverein (tenant association) if unsure."
        ),
    },
    {
        "citation": "§ 573 BGB",
        "title_de": "Ordentliche Kündigung des Vermieters",
        "title_en": "Termination by Landlord",
        "category": LawCategory.RENTAL_LAW.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Landlords can only terminate a lease with a legally recognized reason, such as personal use (Eigenbedarf).",
        "short_summary": (
            "§ 573 BGB strictly limits a landlord's right to terminate a residential lease. Permissible reasons "
            "include personal use (Eigenbedarf), significant breach by the tenant, or economic exploitation "
            "(Verwertungskündigung). Notice periods range from 3 to 9 months depending on tenancy duration."
        ),
        "detailed_explanation": (
            "German tenant protection law makes it very difficult for landlords to terminate residential leases. "
            "A landlord needs a 'legitimate interest' (berechtigtes Interesse), which is limited to three categories:\n\n"
            "1. Eigenbedarf (personal use): The landlord or close family members need the property for their own use. "
            "This must be genuine and specific — speculative or pretextual claims are rejected by courts.\n\n"
            "2. Significant breach: The tenant seriously violates contractual obligations, such as persistent "
            "non-payment of rent or causing substantial damage.\n\n"
            "3. Economic exploitation: Continued rental would cause substantial financial disadvantage to the "
            "landlord (very rarely accepted by courts).\n\n"
            "Notice periods depend on tenancy duration: 3 months for up to 5 years, 6 months for 5-8 years, "
            "and 9 months for tenancies longer than 8 years. Tenants can raise a hardship defense (Sozialklausel) "
            "under § 574 BGB."
        ),
        "real_world_example": (
            "An investor buys a rented apartment planning to move in herself. She can claim Eigenbedarf, "
            "but must prove the need is genuine. If the tenant has lived there for 10 years, the notice period "
            "is 9 months. If the elderly tenant raises a hardship defense, the court may extend the tenancy further."
        ),
        "landlord_implications": (
            "Carefully evaluate whether your reason for termination qualifies. Eigenbedarf claims are heavily "
            "scrutinized by courts. Budget for extended timelines if the tenant contests."
        ),
        "tenant_implications": (
            "You cannot be terminated without a legally recognized reason. If you receive a termination notice, "
            "seek immediate legal advice. You may be entitled to a hardship defense."
        ),
    },
    # ── condominium ────────────────────────────────────────────────────
    {
        "citation": "§ 1 WEG",
        "title_de": "Begriffsbestimmungen (Wohnungseigentumsgesetz)",
        "title_en": "Condominium Ownership Act - Definitions",
        "category": LawCategory.CONDOMINIUM.value,
        "property_type": PropertyTypeApplicability.APARTMENT.value,
        "one_line_summary": "Defines condominium ownership as a combination of individual unit ownership and co-ownership of common property.",
        "short_summary": (
            "§ 1 WEG establishes the legal framework for condominium ownership in Germany. It defines "
            "Wohnungseigentum as the combination of Sondereigentum (individual ownership of a specific unit) "
            "and Miteigentum (co-ownership share in common property)."
        ),
        "detailed_explanation": (
            "The Wohnungseigentumsgesetz (WEG) is the foundational law governing condominium ownership in Germany. "
            "§ 1 defines the key concepts that every apartment buyer must understand:\n\n"
            "Sondereigentum (special/individual ownership): This covers the apartment unit itself — walls, floors, "
            "ceilings within the unit, built-in fixtures, and any designated parking spaces or storage rooms. "
            "The owner has full control over their Sondereigentum, subject to community rules.\n\n"
            "Gemeinschaftseigentum (common property): This includes the building structure, roof, stairways, "
            "elevators, gardens, facades, and all shared systems (heating, water, electrical). All owners share "
            "the costs of maintaining common property according to their Miteigentumsanteil (co-ownership share).\n\n"
            "The Teilungserklärung (declaration of division) defines exactly what is Sondereigentum and what is "
            "Gemeinschaftseigentum. This document is registered in the land registry and is binding."
        ),
        "real_world_example": (
            "Maria buys a 3-room apartment with a 12% co-ownership share (Miteigentumsanteil). She owns her unit "
            "exclusively but shares ownership of the lobby, parking, and garden with other owners. She pays 12% "
            "of all common maintenance costs."
        ),
        "buyer_implications": (
            "Before buying a condominium, review the Teilungserklärung carefully to understand exactly what you own "
            "and what is shared. Check the community's financial reserves (Instandhaltungsrücklage) and recent "
            "owners' meeting minutes for planned expenses."
        ),
        "seller_implications": (
            "Provide buyers with the Teilungserklärung, Hausordnung, recent meeting minutes, and current "
            "Hausgeld statements. Disclose any pending special assessments (Sonderumlagen)."
        ),
    },
    {
        "citation": "§ 16 WEG",
        "title_de": "Nutzungen und Kosten",
        "title_en": "Common Charges and Burdens (Hausgeld)",
        "category": LawCategory.CONDOMINIUM.value,
        "property_type": PropertyTypeApplicability.APARTMENT.value,
        "one_line_summary": "Condominium owners must pay monthly Hausgeld covering maintenance, reserves, and operating costs.",
        "short_summary": (
            "§ 16 WEG governs the allocation of common costs and burdens among condominium owners. Each owner "
            "must contribute to common expenses (Hausgeld) according to their co-ownership share, unless the "
            "community resolves a different allocation."
        ),
        "detailed_explanation": (
            "The Hausgeld (monthly condominium fee) is a mandatory payment that covers: operating costs of common "
            "property (cleaning, gardening, insurance), maintenance and repair reserves (Instandhaltungsrücklage), "
            "the property manager's fees (Hausverwaltung), and utilities for common areas.\n\n"
            "The 2020 WEG reform gave owners' communities more flexibility in cost allocation. While the default "
            "is proportional to co-ownership shares, the community can resolve different allocation keys by majority "
            "vote for specific cost types (e.g., elevator costs only charged to upper-floor owners).\n\n"
            "The annual Wirtschaftsplan (budget plan) sets the monthly Hausgeld amounts. After the fiscal year, "
            "the Jahresabrechnung (annual accounting) reconciles actual costs against payments. Owners vote on "
            "both at the Eigentümerversammlung (owners' meeting)."
        ),
        "real_world_example": (
            "James buys a condominium with a monthly Hausgeld of €350. This includes €200 for operating costs, "
            "€100 for the maintenance reserve, and €50 for property management. At the annual meeting, the owners "
            "vote to increase the reserve contribution to €150 due to a planned roof repair."
        ),
        "buyer_implications": (
            "Factor Hausgeld into your monthly budget. Request at least 3 years of annual accountings and check "
            "the maintenance reserve level. A low reserve may indicate upcoming special assessments."
        ),
        "landlord_implications": (
            "Not all Hausgeld components can be passed on to tenants. Only operating costs (Betriebskosten) are "
            "recoverable — the maintenance reserve contribution is not."
        ),
    },
    {
        "citation": "§ 19 WEG",
        "title_de": "Ordnungsmäßige Verwaltung und Benutzung",
        "title_en": "Proper Administration",
        "category": LawCategory.CONDOMINIUM.value,
        "property_type": PropertyTypeApplicability.APARTMENT.value,
        "one_line_summary": "Condominium administration must follow principles of proper management, with decisions made by majority vote.",
        "short_summary": (
            "§ 19 WEG establishes that condominium communities must be managed according to principles of "
            "proper administration. Since the 2020 reform, most decisions can be made by simple majority "
            "of owners present at the meeting."
        ),
        "detailed_explanation": (
            "The 2020 WEG reform significantly modernized condominium governance. § 19 now establishes that each "
            "owner can demand administration that follows ordnungsmäßige Verwaltung (proper administration). "
            "This includes maintaining adequate reserves, obtaining proper insurance, keeping orderly accounts, "
            "and making necessary repairs.\n\n"
            "Key changes from the 2020 reform: the community of owners (Gemeinschaft der Wohnungseigentümer) is "
            "now a fully recognized legal entity. Decisions are made by simple majority vote at owners' meetings, "
            "replacing the old complicated voting rules. Individual owners can also be granted exclusive use rights "
            "to common areas by majority resolution.\n\n"
            "Every owner can challenge community decisions in court within one month if they violate proper "
            "administration principles. The property manager (Verwalter) can be appointed and dismissed by "
            "simple majority vote."
        ),
        "real_world_example": (
            "At the owners' meeting, a majority votes to install electric vehicle charging stations in the "
            "parking garage. Even owners who voted against it must accept the decision if it follows proper "
            "administration principles. Any owner can challenge it in court within one month."
        ),
        "buyer_implications": (
            "Review recent Eigentümerversammlungs-Protokolle (meeting minutes) before buying. Check for "
            "disputed decisions, planned major repairs, or conflicts among owners."
        ),
        "seller_implications": (
            "Disclose any ongoing disputes within the community. Buyers will review meeting minutes and "
            "may be deterred by contentious communities."
        ),
    },
    # ── agent_regulations ──────────────────────────────────────────────
    {
        "citation": "§ 656a BGB",
        "title_de": "Textform",
        "title_en": "Broker Agreement - Text Form Requirement",
        "category": LawCategory.AGENT_REGULATIONS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Broker agreements for residential property must be in text form (written) to be legally valid.",
        "short_summary": (
            "§ 656a BGB (effective since December 2020) requires that broker agreements for residential "
            "property purchases must be in text form. Verbal agreements or implied agreements are not valid."
        ),
        "detailed_explanation": (
            "Since December 23, 2020, any broker agreement for the purchase of residential property (apartments, "
            "single-family homes, undeveloped land) must be in text form (Textform) as defined by § 126b BGB. "
            "This means email or written contracts suffice, but verbal agreements do not.\n\n"
            "This provision was introduced alongside the broker commission sharing law (§ 656c BGB) to provide "
            "transparency and consumer protection. Before this reform, buyers could be surprised by commission "
            "claims from brokers they never formally engaged.\n\n"
            "If the text form requirement is not met, the broker agreement is void, and the broker has no claim "
            "to commission — regardless of whether a transaction was successfully completed."
        ),
        "real_world_example": (
            "A broker shows Maria several apartments in Munich. They never signed a formal agreement. After Maria "
            "buys one of the apartments, the broker claims commission. Under § 656a, the broker has no valid "
            "claim because there was no text-form agreement."
        ),
        "buyer_implications": (
            "Never agree to pay broker commission without a written agreement. If a broker contacts you, "
            "ensure the terms (especially commission rate) are documented in writing before proceeding."
        ),
        "seller_implications": (
            "If you engage a broker, ensure the agreement is in proper text form. The commission sharing "
            "rules under § 656c may affect how costs are split with the buyer."
        ),
    },
    {
        "citation": "§ 656c BGB",
        "title_de": "Vereinbarungen über die Teilung der Maklerprovision",
        "title_en": "Shared Commission Rule (Provisionsteilung)",
        "category": LawCategory.AGENT_REGULATIONS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "When the seller engages a broker, the commission must be shared equally with the buyer (max 50/50 split).",
        "short_summary": (
            "§ 656c BGB mandates that when a broker is engaged by the seller, any agreement requiring the "
            "buyer to pay commission is only valid if the seller pays at least an equal share. The buyer's "
            "share becomes due only after proof of the seller's payment."
        ),
        "detailed_explanation": (
            "This 2020 reform fundamentally changed the broker commission landscape in Germany. Previously, in "
            "many states, the full broker commission (often 5-7% plus VAT) was charged to the buyer alone. "
            "Now, the law ensures fair cost sharing.\n\n"
            "Key rules: If the seller engages the broker and then passes commission costs to the buyer, the "
            "buyer cannot be charged more than the seller pays. The buyer's commission payment is only due "
            "after the seller has demonstrably paid their share. If the seller's payment obligation is waived, "
            "the buyer's obligation also becomes void.\n\n"
            "This applies to residential property purchases (apartments and single-family homes). Commercial "
            "property transactions are not covered by this provision."
        ),
        "real_world_example": (
            "A Berlin seller hires a broker at 7.14% commission (including VAT). Under § 656c, the seller "
            "must pay at least 3.57% and can only pass 3.57% to the buyer. The buyer's payment is not due "
            "until the seller proves their share has been paid."
        ),
        "buyer_implications": (
            "You should never pay more than half the total broker commission. Request proof that the seller "
            "has paid their share before making your payment. This can save thousands of euros."
        ),
        "seller_implications": (
            "You must pay at least half of the broker commission. Factor this into your selling costs. "
            "You cannot contractually shift more than half to the buyer."
        ),
    },
    {
        "citation": "§ 34c GewO",
        "title_de": "Makler, Darlehensvermittler, Bauträger, Baubetreuer",
        "title_en": "Agent License Requirement (Gewerbeordnung)",
        "category": LawCategory.AGENT_REGULATIONS.value,
        "property_type": PropertyTypeApplicability.ALL.value,
        "one_line_summary": "Real estate agents in Germany need a license (Erlaubnis) from the local trade authority to operate legally.",
        "short_summary": (
            "§ 34c GewO requires anyone acting commercially as a real estate agent (Immobilienmakler) to hold "
            "a license issued by the local Gewerbeamt (trade office). The license requires proof of reliability "
            "and financial standing."
        ),
        "detailed_explanation": (
            "In Germany, the real estate brokerage profession is regulated under trade law. Anyone wishing to "
            "work as a real estate agent must obtain a permit under § 34c GewO from the responsible local "
            "authority (Gewerbeamt or IHK - Industrie- und Handelskammer).\n\n"
            "The license requires: a clean criminal record (polizeiliches Führungszeugnis), no insolvency "
            "proceedings, adequate professional indemnity insurance, and proof of financial stability. Since "
            "2018, licensed agents must also complete 20 hours of continuing education every three years "
            "(Weiterbildungspflicht).\n\n"
            "Operating without a license is an administrative offense (Ordnungswidrigkeit) and can result "
            "in fines of up to €50,000. Clients who deal with unlicensed agents may have limited legal "
            "recourse in case of disputes."
        ),
        "real_world_example": (
            "Before engaging a broker, Maria checks their § 34c GewO license by asking for the license "
            "number and verifying it with the local Gewerbeamt. This protects her from dealing with "
            "unlicensed operators who may not carry professional indemnity insurance."
        ),
        "buyer_implications": (
            "Always verify that your real estate agent holds a valid § 34c GewO license. Ask for the "
            "license number and the issuing authority. This ensures professional accountability and insurance coverage."
        ),
        "seller_implications": (
            "Only engage licensed agents. If you engage an unlicensed agent, the broker agreement may be "
            "unenforceable, and you may lack insurance protection if something goes wrong."
        ),
    },
]


# ---------------------------------------------------------------------------
# Court rulings seed data
# ---------------------------------------------------------------------------

COURT_RULINGS: list[dict] = [
    # Rulings for § 433 BGB
    {
        "law_citation": "§ 433 BGB",
        "court_name": "Bundesgerichtshof (BGH)",
        "case_number": "V ZR 18/19",
        "ruling_date": datetime(2019, 11, 15, tzinfo=timezone.utc),
        "title": "Seller's Duty to Disclose Known Defects",
        "summary": (
            "The BGH ruled that sellers must disclose all defects known to them at the time of sale, "
            "even if the purchase contract contains a general exclusion of warranty. Fraudulent concealment "
            "overrides contractual warranty exclusions."
        ),
        "significance": (
            "This ruling strengthens buyer protection by ensuring that sellers cannot hide behind boilerplate "
            "warranty exclusion clauses. Foreign buyers should always inquire specifically about known defects."
        ),
    },
    # Rulings for § 311b BGB
    {
        "law_citation": "§ 311b BGB",
        "court_name": "Bundesgerichtshof (BGH)",
        "case_number": "V ZR 249/12",
        "ruling_date": datetime(2013, 9, 20, tzinfo=timezone.utc),
        "title": "Healing of Notarization Defects",
        "summary": (
            "The BGH confirmed that a purchase contract lacking proper notarization becomes valid once the "
            "property transfer (Auflassung) is registered in the land registry and the purchase price is paid. "
            "The defect in form is healed retroactively."
        ),
        "significance": (
            "Important for understanding that the notarization requirement, while strict, can be cured. "
            "However, relying on this healing is risky and not advisable."
        ),
    },
    # Rulings for § 558 BGB
    {
        "law_citation": "§ 558 BGB",
        "court_name": "Bundesgerichtshof (BGH)",
        "case_number": "VIII ZR 217/14",
        "ruling_date": datetime(2015, 5, 13, tzinfo=timezone.utc),
        "title": "Requirements for Rent Increase Referencing Mietspiegel",
        "summary": (
            "The BGH clarified that a rent increase notice referencing the local Mietspiegel must identify "
            "the specific category and rent range applicable to the property. A mere reference to the "
            "Mietspiegel without specific classification is insufficient."
        ),
        "significance": (
            "Landlord-investors must carefully identify the correct Mietspiegel category for their property. "
            "An improperly referenced rent increase can be invalidated by the tenant."
        ),
    },
    # Rulings for § 573 BGB
    {
        "law_citation": "§ 573 BGB",
        "court_name": "Bundesgerichtshof (BGH)",
        "case_number": "VIII ZR 127/20",
        "ruling_date": datetime(2021, 3, 10, tzinfo=timezone.utc),
        "title": "Eigenbedarf Must Be Genuine and Specific",
        "summary": (
            "The BGH confirmed that Eigenbedarf (personal use) claims must be genuine and specific at the "
            "time of termination. A landlord cannot claim Eigenbedarf speculatively or for a vaguely defined "
            "future need. The concrete circumstances must be stated in the termination letter."
        ),
        "significance": (
            "Investors purchasing tenanted properties should be aware that claiming Eigenbedarf is subject to "
            "strict scrutiny. Courts protect long-term tenants, especially elderly or vulnerable individuals."
        ),
    },
    # Rulings for § 656c BGB
    {
        "law_citation": "§ 656c BGB",
        "court_name": "Bundesgerichtshof (BGH)",
        "case_number": "I ZR 113/22",
        "ruling_date": datetime(2023, 6, 8, tzinfo=timezone.utc),
        "title": "Commission Sharing Applies to All Residential Transactions",
        "summary": (
            "The BGH ruled that the commission sharing rule under § 656c applies broadly to all residential "
            "property purchases, including multi-unit residential buildings. The seller-engaged broker cannot "
            "charge the buyer a higher share than the seller pays."
        ),
        "significance": (
            "This ruling expanded the scope of commission sharing, providing additional cost protection for "
            "residential property buyers across all building types."
        ),
    },
]


# ---------------------------------------------------------------------------
# State variations seed data (for § 1 GrEStG)
# ---------------------------------------------------------------------------

STATE_VARIATIONS: list[dict] = [
    {
        "state_code": "BW",
        "state_name": "Baden-Württemberg",
        "rate": "5.0%",
        "description": "Baden-Württemberg applies a real estate transfer tax rate of 5.0%, effective since November 2011.",
    },
    {
        "state_code": "BY",
        "state_name": "Bayern",
        "rate": "3.5%",
        "description": "Bavaria has the lowest transfer tax rate in Germany at 3.5%, unchanged since the federal baseline. Bavaria has never raised the rate above the federal minimum.",
    },
    {
        "state_code": "BE",
        "state_name": "Berlin",
        "rate": "6.0%",
        "description": "Berlin applies a transfer tax rate of 6.0%, effective since January 2014.",
    },
    {
        "state_code": "BB",
        "state_name": "Brandenburg",
        "rate": "6.5%",
        "description": "Brandenburg applies the maximum transfer tax rate of 6.5%, effective since July 2015.",
    },
    {
        "state_code": "HB",
        "state_name": "Bremen",
        "rate": "5.0%",
        "description": "Bremen applies a transfer tax rate of 5.0%, effective since January 2014.",
    },
    {
        "state_code": "HH",
        "state_name": "Hamburg",
        "rate": "5.5%",
        "description": "Hamburg applies a transfer tax rate of 5.5%, effective since January 2023.",
    },
    {
        "state_code": "HE",
        "state_name": "Hessen",
        "rate": "6.0%",
        "description": "Hessen applies a transfer tax rate of 6.0%, effective since August 2014.",
    },
    {
        "state_code": "MV",
        "state_name": "Mecklenburg-Vorpommern",
        "rate": "6.0%",
        "description": "Mecklenburg-Vorpommern applies a transfer tax rate of 6.0%, effective since July 2019.",
    },
    {
        "state_code": "NI",
        "state_name": "Niedersachsen",
        "rate": "5.0%",
        "description": "Lower Saxony applies a transfer tax rate of 5.0%, effective since January 2014.",
    },
    {
        "state_code": "NW",
        "state_name": "Nordrhein-Westfalen",
        "rate": "6.5%",
        "description": "North Rhine-Westphalia applies the maximum transfer tax rate of 6.5%, effective since January 2015.",
    },
    {
        "state_code": "RP",
        "state_name": "Rheinland-Pfalz",
        "rate": "5.0%",
        "description": "Rhineland-Palatinate applies a transfer tax rate of 5.0%, effective since March 2012.",
    },
    {
        "state_code": "SL",
        "state_name": "Saarland",
        "rate": "6.5%",
        "description": "Saarland applies the maximum transfer tax rate of 6.5%, effective since January 2015.",
    },
    {
        "state_code": "SN",
        "state_name": "Sachsen",
        "rate": "5.5%",
        "description": "Saxony applies a transfer tax rate of 5.5%, effective since January 2023.",
    },
    {
        "state_code": "ST",
        "state_name": "Sachsen-Anhalt",
        "rate": "5.0%",
        "description": "Saxony-Anhalt applies a transfer tax rate of 5.0%, effective since March 2012.",
    },
    {
        "state_code": "SH",
        "state_name": "Schleswig-Holstein",
        "rate": "6.5%",
        "description": "Schleswig-Holstein applies the maximum transfer tax rate of 6.5%, effective since January 2014.",
    },
    {
        "state_code": "TH",
        "state_name": "Thüringen",
        "rate": "6.5%",
        "description": "Thuringia applies the maximum transfer tax rate of 6.5%, effective since January 2017.",
    },
]


# ---------------------------------------------------------------------------
# Seed function
# ---------------------------------------------------------------------------


def seed_laws(session: Session) -> None:
    """Seed German real estate laws, court rulings, and state variations.

    Idempotent: skips laws that already exist (matched by citation).
    """

    inserted_count = 0
    skipped_count = 0

    # Build a map of citation -> law_id for linking court rulings / state variations
    citation_to_id: dict[str, uuid.UUID] = {}

    for law_data in LAWS:
        existing = session.exec(
            select(Law).where(Law.citation == law_data["citation"])
        ).first()

        if existing:
            skipped_count += 1
            citation_to_id[law_data["citation"]] = existing.id
            continue

        law = Law(
            id=uuid.uuid4(),
            **law_data,
        )
        session.add(law)
        session.flush()  # Get the generated id
        citation_to_id[law_data["citation"]] = law.id
        inserted_count += 1

    logger.info(
        "Laws: inserted=%d, skipped=%d (already existed)",
        inserted_count,
        skipped_count,
    )

    # Insert court rulings
    ruling_inserted = 0
    for ruling_data in COURT_RULINGS:
        citation = ruling_data.pop("law_citation")
        law_id = citation_to_id.get(citation)
        if not law_id:
            logger.warning("No law found for citation '%s', skipping ruling", citation)
            ruling_data["law_citation"] = citation  # Restore for next run
            continue

        existing = session.exec(
            select(CourtRuling).where(
                CourtRuling.law_id == law_id,
                CourtRuling.case_number == ruling_data["case_number"],
            )
        ).first()

        if existing:
            ruling_data["law_citation"] = citation
            continue

        ruling = CourtRuling(
            id=uuid.uuid4(),
            law_id=law_id,
            **ruling_data,
        )
        session.add(ruling)
        ruling_inserted += 1
        ruling_data["law_citation"] = citation  # Restore for idempotency

    logger.info("Court rulings: inserted=%d", ruling_inserted)

    # Insert state variations (for § 1 GrEStG)
    transfer_tax_citation = "§ 1 GrEStG"
    transfer_tax_law_id = citation_to_id.get(transfer_tax_citation)

    variation_inserted = 0
    if transfer_tax_law_id:
        for sv_data in STATE_VARIATIONS:
            existing = session.exec(
                select(StateVariation).where(
                    StateVariation.law_id == transfer_tax_law_id,
                    StateVariation.state_code == sv_data["state_code"],
                )
            ).first()

            if existing:
                continue

            variation = StateVariation(
                id=uuid.uuid4(),
                law_id=transfer_tax_law_id,
                state_code=sv_data["state_code"],
                state_name=sv_data["state_name"],
                variation_title="Real Estate Transfer Tax Rate (Grunderwerbsteuersatz)",
                variation_value=sv_data["rate"],
                variation_description=sv_data["description"],
            )
            session.add(variation)
            variation_inserted += 1
    else:
        logger.warning(
            "Transfer tax law (%s) not found, skipping state variations",
            transfer_tax_citation,
        )

    logger.info("State variations: inserted=%d", variation_inserted)

    session.commit()
    logger.info("Law seed data committed successfully")
