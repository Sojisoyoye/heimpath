"""Journey Service.

Provides journey generation, progression, and management for the
guided property buying process.
"""

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlmodel import Session, select

from app.models.journey import (
    Journey,
    JourneyPhase,
    JourneyStep,
    JourneyTask,
    StepStatus,
)
from app.schemas.journey import QuestionnaireAnswers
from app.services.calculator_service import COST_DEFAULTS, STATE_RATES


class JourneyError(Exception):
    """Base exception for journey-related errors."""

    pass


class JourneyNotFoundError(JourneyError):
    """Raised when a journey is not found."""

    pass


class StepNotFoundError(JourneyError):
    """Raised when a journey step is not found."""

    pass


class InvalidStepTransitionError(JourneyError):
    """Raised when an invalid step transition is attempted."""

    pass


@dataclass
class StepTemplate:
    """Template for generating a journey step."""

    step_number: int
    phase: JourneyPhase
    title: str
    description: str
    estimated_duration_days: int
    content_key: str
    tasks: list[dict[str, Any]]
    conditions: dict[str, Any] | None = None  # Conditions for including this step
    prerequisites: list[int] | None = None
    related_laws: list[str] | None = None
    estimated_costs: dict[str, Any] | None = None


# Step templates for the German property buying journey.
# step_number is a stable template identifier, not a list position — gaps and
# non-sequential values are expected when conditional steps are inserted.
STEP_TEMPLATES: list[StepTemplate] = [
    # RESEARCH PHASE
    StepTemplate(
        step_number=1,
        phase=JourneyPhase.RESEARCH,
        title="Define Your Property Goals",
        description="Clarify what you're looking for in a property and set realistic expectations.",
        estimated_duration_days=7,
        content_key="research_goals",
        tasks=[
            {"title": "List your must-have features", "is_required": True},
            {"title": "Set your budget range", "is_required": True},
            {"title": "Choose preferred locations", "is_required": True},
            {"title": "Decide on property type", "is_required": False},
        ],
    ),
    StepTemplate(
        step_number=2,
        phase=JourneyPhase.RESEARCH,
        title="Understand the German Property Market",
        description="Learn about property prices, market trends, and regional differences.",
        estimated_duration_days=5,
        content_key="market_research",
        prerequisites=[1],
        tasks=[
            {
                "title": "Research average prices in your target area",
                "is_required": True,
            },
            {"title": "Understand price per sqm trends", "is_required": True},
            {
                "title": "Learn about Makler (agent) fees in your state",
                "is_required": True,
            },
            {
                "title": "Compare Grunderwerbsteuer (transfer tax) rates across states",
                "is_required": True,
            },
            {
                "title": "Research neighborhood amenities and infrastructure",
                "is_required": False,
            },
        ],
        related_laws=["BGB §433-453 (Kaufvertrag)"],
    ),
    StepTemplate(
        step_number=3,
        phase=JourneyPhase.RESEARCH,
        title="Find a Property",
        description="Search for properties matching your criteria and gather key information during viewings.",
        estimated_duration_days=30,
        content_key="property_search",
        prerequisites=[2],
        tasks=[
            {"title": "Set up alerts on ImmoScout24, Immowelt", "is_required": True},
            {"title": "Contact local Makler (agents)", "is_required": False},
            {"title": "Schedule and attend viewings", "is_required": True},
            {"title": "Take notes and photos at viewings", "is_required": True},
            {
                "title": "Request the property exposé from the agent",
                "is_required": True,
            },
            {
                "title": "Check the Grundbuchauszug (land registry extract)",
                "is_required": True,
            },
            {
                "title": "Review the Energieausweis (energy certificate)",
                "is_required": True,
            },
            {
                "title": "Verify building permits and planning permissions",
                "is_required": False,
            },
            {
                "title": "Check for encumbrances or easements on the property",
                "is_required": False,
            },
            {
                "title": "Consider commissioning a building survey",
                "is_required": False,
            },
        ],
        related_laws=["GBO (Grundbuchordnung)", "EnEV (Energieeinsparverordnung)"],
    ),
    StepTemplate(
        step_number=4,
        phase=JourneyPhase.RESEARCH,
        title="Evaluate Your Property",
        description="Assess the value and potential of properties you've found.",
        estimated_duration_days=7,
        content_key="property_evaluation",
        prerequisites=[3],
        tasks=[
            {"title": "Run evaluation calculator", "is_required": True},
            {"title": "Review cashflow analysis", "is_required": True},
            {"title": "Understand cost breakdown", "is_required": True},
            {"title": "Compare with market averages", "is_required": True},
        ],
    ),
    # Task order matters: _personalize_buying_costs() accesses tasks by index
    # (0=transfer tax, 1=notary, 2=land registry, 3=agent commission).
    StepTemplate(
        step_number=5,
        phase=JourneyPhase.RESEARCH,
        title="Learn About Buying Costs",
        description="Understand all the additional costs beyond the purchase price.",
        estimated_duration_days=3,
        content_key="buying_costs",
        prerequisites=[4],
        tasks=[
            {
                "title": "Calculate Grunderwerbsteuer (property transfer tax)",
                "is_required": True,
            },
            {"title": "Estimate notary fees (1.5-2%)", "is_required": True},
            {"title": "Factor in land registry fees (0.5%)", "is_required": True},
            {
                "title": "Budget for agent commission if applicable",
                "is_required": False,
            },
        ],
        estimated_costs={
            "grunderwerbsteuer": "3.5-6.5% (varies by state)",
            "notary_fees": "1.5-2%",
            "land_registry": "0.5%",
            "agent_commission": "3-7% (if applicable)",
        },
    ),
    # PREPARATION PHASE
    StepTemplate(
        step_number=6,
        phase=JourneyPhase.PREPARATION,
        title="Check Your Finances",
        description="Assess your financial situation and determine your borrowing capacity.",
        estimated_duration_days=7,
        content_key="finance_check",
        prerequisites=[5],
        tasks=[
            {"title": "Calculate your available savings", "is_required": True},
            {"title": "Review your monthly income and expenses", "is_required": True},
            {"title": "Check your SCHUFA credit score", "is_required": True},
            {"title": "Gather salary statements (last 3 months)", "is_required": True},
        ],
        conditions={"financing_type": ["mortgage", "mixed"]},
    ),
    StepTemplate(
        step_number=7,
        phase=JourneyPhase.PREPARATION,
        title="Get Mortgage Pre-Approval",
        description="Secure a financing commitment from a bank before property hunting.",
        estimated_duration_days=14,
        content_key="mortgage_preapproval",
        prerequisites=[6],
        tasks=[
            {
                "title": "Compare mortgage offers from multiple banks",
                "is_required": True,
            },
            {"title": "Submit mortgage application", "is_required": True},
            {
                "title": "Receive Finanzierungsbestätigung (financing confirmation)",
                "is_required": True,
            },
        ],
        conditions={"financing_type": ["mortgage", "mixed"]},
        related_laws=["BGB §488-505 (Darlehensvertrag)"],
    ),
    StepTemplate(
        step_number=8,
        phase=JourneyPhase.PREPARATION,
        title="Compare Mortgage Offers",
        description="Compare different mortgage offers to find the best terms for your situation.",
        estimated_duration_days=7,
        content_key="mortgage_comparison",
        prerequisites=[7],
        tasks=[
            {"title": "Compare interest rates", "is_required": True},
            {"title": "Review loan terms", "is_required": True},
            {"title": "Understand application requirements", "is_required": True},
            {"title": "Prepare application documents", "is_required": True},
        ],
        conditions={"financing_type": ["mortgage", "mixed"]},
    ),
    StepTemplate(
        step_number=18,
        phase=JourneyPhase.PREPARATION,
        title="Prepare Proof of Funds",
        description="As a cash buyer, you need to prove you have the funds available. Prepare bank documentation and plan your transfer.",
        estimated_duration_days=7,
        content_key="proof_of_funds",
        tasks=[
            {
                "title": "Gather recent bank statements (last 3-6 months)",
                "is_required": True,
            },
            {
                "title": "Request a proof of funds letter from your bank",
                "is_required": True,
            },
            {
                "title": "Open a German bank account if you don't have one",
                "is_required": True,
            },
            {
                "title": "Plan your funds transfer (exchange rates, fees, timing)",
                "is_required": True,
            },
        ],
        conditions={"financing_type": ["cash"]},
        prerequisites=[5],
        related_laws=[
            "GwG §10-11 (Sorgfaltspflichten — Anti-money laundering due diligence)"
        ],
    ),
    StepTemplate(
        step_number=9,
        phase=JourneyPhase.PREPARATION,
        title="Prepare Required Documents",
        description="Gather all documents needed for the property purchase, tailored to your situation.",
        estimated_duration_days=7,
        content_key="documents_prep",
        prerequisites=[5],
        tasks=[
            # Universal tasks — all buyers
            {"title": "Obtain proof of identity (passport/ID)", "is_required": True},
            {"title": "Get proof of address in Germany", "is_required": True},
            {"title": "Prepare recent bank statements", "is_required": True},
            # Non-resident tasks
            {
                "title": "Get apostilled or translated copies of personal documents",
                "is_required": True,
                "conditions": {"has_german_residency": False},
            },
            {
                "title": "Obtain proof of legal residency or visa documentation",
                "is_required": True,
                "conditions": {"has_german_residency": False},
            },
            # Mortgage/mixed tasks
            {
                "title": "Gather salary statements and employment contract",
                "is_required": True,
                "conditions": {"financing_type": ["mortgage", "mixed"]},
            },
            {
                "title": "Request your SCHUFA credit report",
                "is_required": True,
                "conditions": {"financing_type": ["mortgage", "mixed"]},
            },
        ],
    ),
    # BUYING PHASE
    StepTemplate(
        step_number=10,
        phase=JourneyPhase.BUYING,
        title="Property Due Diligence",
        description="Thoroughly investigate the property before making an offer.",
        estimated_duration_days=14,
        content_key="due_diligence",
        prerequisites=[3],
        tasks=[
            {
                "title": "Review the property exposé",
                "is_required": True,
            },
            {
                "title": "Request Grundbuchauszug (land registry extract)",
                "is_required": True,
            },
            {
                "title": "Review Energieausweis (energy certificate)",
                "is_required": True,
            },
            {"title": "Check for encumbrances or easements", "is_required": True},
            {"title": "Verify building permits and compliance", "is_required": True},
            {"title": "Consider hiring a property surveyor", "is_required": False},
            {
                "title": "Review HOA documents (Teilungserklärung)",
                "is_required": False,
            },
            {
                "title": "Consider hiring a real estate lawyer (Immobilienanwalt)",
                "is_required": False,
            },
        ],
        related_laws=["GBO (Grundbuchordnung)", "EnEV (Energieeinsparverordnung)"],
    ),
    StepTemplate(
        step_number=11,
        phase=JourneyPhase.BUYING,
        title="Make an Offer",
        description="Negotiate and submit your purchase offer.",
        estimated_duration_days=7,
        content_key="make_offer",
        prerequisites=[10],
        tasks=[
            {"title": "Determine your offer price", "is_required": True},
            {"title": "Submit written offer (Kaufangebot)", "is_required": True},
            {"title": "Negotiate terms if needed", "is_required": False},
            {"title": "Receive seller acceptance", "is_required": True},
        ],
    ),
    StepTemplate(
        step_number=12,
        phase=JourneyPhase.BUYING,
        title="Choose a Notar",
        description="Select a notary to handle the purchase contract.",
        estimated_duration_days=7,
        content_key="choose_notary",
        prerequisites=[11],
        tasks=[
            {"title": "Research local notaries", "is_required": True},
            {"title": "Schedule appointment", "is_required": True},
            {"title": "Provide required documents to notary", "is_required": True},
        ],
        related_laws=["BeurkG (Beurkundungsgesetz)", "BNotO (Bundesnotarordnung)"],
    ),
    StepTemplate(
        step_number=13,
        phase=JourneyPhase.BUYING,
        title="Review Purchase Contract",
        description="Carefully review the Kaufvertrag before signing.",
        estimated_duration_days=14,
        content_key="review_contract",
        prerequisites=[12],
        tasks=[
            {"title": "Receive draft Kaufvertrag from notary", "is_required": True},
            {"title": "Review all terms and conditions", "is_required": True},
            {"title": "Clarify any questions with notary", "is_required": True},
            {"title": "Consider professional contract review", "is_required": False},
        ],
        related_laws=["BGB §311b (Formvorschriften)"],
    ),
    StepTemplate(
        step_number=19,
        phase=JourneyPhase.BUYING,
        title="Secure Final Loan Commitment",
        description="After reviewing the purchase contract, submit it to your bank to receive the binding loan commitment (Darlehenszusage) before the notary appointment.",
        estimated_duration_days=14,
        content_key="loan_commitment",
        tasks=[
            {
                "title": "Submit the purchase contract draft to your bank",
                "is_required": True,
            },
            {
                "title": "Complete any remaining loan application documents",
                "is_required": True,
            },
            {
                "title": "Receive the formal loan commitment (Darlehenszusage)",
                "is_required": True,
            },
            {
                "title": "Review and sign the loan agreement (Darlehensvertrag)",
                "is_required": True,
            },
        ],
        conditions={"financing_type": ["mortgage", "mixed"]},
        prerequisites=[13],
        related_laws=[
            "BGB §488-505 (Darlehensvertrag)",
            "BGB §492 (Schriftform bei Verbraucherdarlehen)",
        ],
    ),
    StepTemplate(
        step_number=14,
        phase=JourneyPhase.BUYING,
        title="Sign at the Notary",
        description="Attend the notary appointment and sign the purchase contract.",
        estimated_duration_days=1,
        content_key="notary_signing",
        prerequisites=[13, 19],
        tasks=[
            {"title": "Bring valid ID to appointment", "is_required": True},
            {"title": "Listen to full contract reading", "is_required": True},
            {"title": "Sign the Kaufvertrag", "is_required": True},
            {"title": "Receive notarized copies", "is_required": True},
        ],
    ),
    # CLOSING PHASE
    StepTemplate(
        step_number=15,
        phase=JourneyPhase.CLOSING,
        title="Complete Payment",
        description="Transfer the purchase price to the seller.",
        estimated_duration_days=14,
        content_key="payment",
        prerequisites=[14],
        tasks=[
            {
                "title": "Wait for Auflassungsvormerkung (priority notice)",
                "is_required": True,
            },
            {"title": "Receive payment request from notary", "is_required": True},
            {"title": "Transfer purchase price", "is_required": True},
            {"title": "Confirm receipt with notary", "is_required": True},
        ],
        related_laws=["BGB §925 (Auflassung)"],
    ),
    StepTemplate(
        step_number=16,
        phase=JourneyPhase.CLOSING,
        title="Pay Transfer Tax",
        description="Pay the Grunderwerbsteuer to the tax office.",
        estimated_duration_days=30,
        content_key="transfer_tax",
        prerequisites=[14],
        tasks=[
            {"title": "Receive tax assessment from Finanzamt", "is_required": True},
            {"title": "Pay Grunderwerbsteuer", "is_required": True},
            {
                "title": "Receive Unbedenklichkeitsbescheinigung (tax clearance)",
                "is_required": True,
            },
        ],
        related_laws=["GrEStG (Grunderwerbsteuergesetz)"],
    ),
    StepTemplate(
        step_number=17,
        phase=JourneyPhase.CLOSING,
        title="Ownership Transfer",
        description="Complete the transfer and receive the keys.",
        estimated_duration_days=30,
        content_key="ownership_transfer",
        prerequisites=[15, 16],
        tasks=[
            {"title": "Notary submits for land registry update", "is_required": True},
            {"title": "Receive updated Grundbuchauszug", "is_required": True},
            {"title": "Collect keys from seller", "is_required": True},
            {
                "title": "Arrange utility transfer with seller (Übergabe)",
                "is_required": True,
            },
        ],
        related_laws=["GBO §13 (Eintragungsgrundsatz)"],
    ),
    # RENTAL INVESTOR STEPS (conditional on property_use = rent_out)
    StepTemplate(
        step_number=20,
        phase=JourneyPhase.RESEARCH,
        title="Understand Landlord Obligations",
        description="Learn about German landlord duties, tenant protections, and rental regulations before purchasing an investment property.",
        estimated_duration_days=5,
        content_key="rental_landlord_law",
        conditions={"property_use": ["rent_out"]},
        prerequisites=[2],
        tasks=[
            {
                "title": "Study BGB Mietrecht (§535-580a) tenant protection basics",
                "is_required": True,
            },
            {
                "title": "Understand Mietpreisbremse (rent control) rules in your target area",
                "is_required": True,
            },
            {
                "title": "Learn Kaution (deposit) regulations — max 3 months' cold rent",
                "is_required": True,
            },
            {
                "title": "Review Kündigungsschutz (eviction protection) requirements",
                "is_required": True,
            },
            {
                "title": "Check local Zweckentfremdungsverbot (prohibition of misuse) rules",
                "is_required": False,
            },
        ],
        related_laws=[
            "BGB §535-580a (Mietrecht)",
            "MietpreisbremseVO (Rent Control Ordinance)",
        ],
    ),
    StepTemplate(
        step_number=21,
        phase=JourneyPhase.RESEARCH,
        title="Analyze Rental Yield",
        description="Calculate expected rental returns, compare with local Mietspiegel, and assess the investment viability.",
        estimated_duration_days=5,
        content_key="rental_yield_analysis",
        conditions={"property_use": ["rent_out"]},
        prerequisites=[4],
        tasks=[
            {
                "title": "Look up local Mietspiegel (rent index) for your target area",
                "is_required": True,
            },
            {
                "title": "Calculate gross Mietrendite (rental yield) for the property",
                "is_required": True,
            },
            {
                "title": "Estimate net yield after costs (Hausgeld, maintenance, vacancy)",
                "is_required": True,
            },
            {
                "title": "Compare yields with market averages using the ROI calculator",
                "is_required": True,
            },
            {
                "title": "Research comparable rental listings in the neighborhood",
                "is_required": False,
            },
        ],
    ),
    StepTemplate(
        step_number=22,
        phase=JourneyPhase.PREPARATION,
        title="Plan Property Management",
        description="Decide between self-management and hiring a Hausverwaltung, and understand the associated costs.",
        estimated_duration_days=7,
        content_key="rental_property_management",
        conditions={"property_use": ["rent_out"]},
        prerequisites=[5],
        tasks=[
            {
                "title": "Compare self-management vs Hausverwaltung (property management agency)",
                "is_required": True,
            },
            {
                "title": "Get quotes from local Hausverwaltung companies (typically 20-30 EUR/unit/month)",
                "is_required": True,
            },
            {
                "title": "Understand WEG-Verwaltung vs Mietverwaltung responsibilities",
                "is_required": True,
            },
            {
                "title": "Plan for maintenance reserve (Instandhaltungsrücklage)",
                "is_required": False,
            },
        ],
    ),
    StepTemplate(
        step_number=23,
        phase=JourneyPhase.BUYING,
        title="Prepare Rental Tax Strategy",
        description="Understand tax obligations for rental income in Germany, including deductions and depreciation.",
        estimated_duration_days=7,
        content_key="rental_tax_strategy",
        conditions={"property_use": ["rent_out"]},
        prerequisites=[10],
        tasks=[
            {
                "title": "Learn about Anlage V (income from renting) tax filing",
                "is_required": True,
            },
            {
                "title": "Identify deductible expenses (mortgage interest, repairs, Hausverwaltung fees)",
                "is_required": True,
            },
            {
                "title": "Understand AfA (Absetzung für Abnutzung) — 2% linear depreciation over 50 years",
                "is_required": True,
            },
            {
                "title": "Consider consulting a Steuerberater (tax advisor) for rental income",
                "is_required": False,
            },
        ],
        related_laws=[
            "EStG §21 (Einkünfte aus Vermietung und Verpachtung)",
            "EStG §7 (AfA — Absetzung für Abnutzung)",
        ],
    ),
    # OWNERSHIP PHASE (post-purchase onboarding — all buyers)
    StepTemplate(
        step_number=25,
        phase=JourneyPhase.OWNERSHIP,
        title="Complete Property Registration",
        description="Finalize ownership records, complete the handover, and transfer all utilities and registrations to your name.",
        estimated_duration_days=7,
        content_key="ownership_registration",
        prerequisites=[17],
        tasks=[
            {
                "title": "Confirm Grundbuch (land register) transfer is complete with notary",
                "is_required": True,
            },
            {
                "title": "Obtain all property keys and complete Übergabeprotokoll (handover protocol)",
                "is_required": True,
            },
            {
                "title": "Transfer utilities (electricity, gas, water, internet) to your name",
                "is_required": True,
            },
            {
                "title": "Register new address at Bürgeramt (Anmeldung)",
                "is_required": True,
                "conditions": {"property_use": ["live_in"]},
            },
            {
                "title": "Set up mail forwarding (Nachsendeauftrag) via Deutsche Post",
                "is_required": False,
            },
        ],
    ),
    StepTemplate(
        step_number=26,
        phase=JourneyPhase.OWNERSHIP,
        title="Arrange Property Insurance",
        description="Secure essential insurance coverage for your property, including building, liability, and contents insurance.",
        estimated_duration_days=5,
        content_key="ownership_insurance",
        prerequisites=[25],
        tasks=[
            {
                "title": "Arrange Wohngebäudeversicherung (building insurance)",
                "is_required": True,
            },
            {
                "title": "Consider Haus- und Grundbesitzerhaftpflicht (property liability insurance)",
                "is_required": True,
            },
            {
                "title": "Evaluate Elementarschadenversicherung (natural disaster) coverage for your region",
                "is_required": False,
            },
            {
                "title": "Set up Hausratversicherung (contents insurance)",
                "is_required": True,
                "conditions": {"property_use": ["live_in"]},
            },
            {
                "title": "Verify WEG building insurance policy covers your unit",
                "is_required": False,
                "conditions": {"property_type": ["apartment"]},
            },
        ],
    ),
    StepTemplate(
        step_number=27,
        phase=JourneyPhase.OWNERSHIP,
        title="Set Up Property Management",
        description="Establish ongoing management for your property — from condo administration to maintenance planning.",
        estimated_duration_days=7,
        content_key="ownership_management",
        prerequisites=[25],
        tasks=[
            {
                "title": "Contact WEG-Verwaltung and register as new owner",
                "is_required": True,
                "conditions": {"property_type": ["apartment"]},
            },
            {
                "title": "Set up Hausgeld (condo fees) payment via Dauerauftrag",
                "is_required": True,
                "conditions": {"property_type": ["apartment"]},
            },
            {
                "title": "Review Teilungserklärung and Hausordnung (house rules)",
                "is_required": False,
                "conditions": {"property_type": ["apartment"]},
            },
            {
                "title": "Plan annual maintenance budget (Instandhaltungsrücklage)",
                "is_required": True,
                "conditions": {"property_type": ["house"]},
            },
            {
                "title": "Identify local tradespeople for repairs (plumber, electrician, heating)",
                "is_required": False,
                "conditions": {"property_type": ["house"]},
            },
            {
                "title": "Register for waste collection (Müllabfuhr) service",
                "is_required": True,
            },
            {
                "title": "Schedule heating system inspection (Heizungswartung)",
                "is_required": False,
            },
        ],
    ),
    StepTemplate(
        step_number=28,
        phase=JourneyPhase.OWNERSHIP,
        title="Handle Property Tax & Finance",
        description="Set up property tax payments, track mortgage costs, and prepare for tax filing obligations.",
        estimated_duration_days=5,
        content_key="ownership_tax_finance",
        prerequisites=[25],
        tasks=[
            {
                "title": "Register for Grundsteuer (property tax) at local Finanzamt",
                "is_required": True,
            },
            {
                "title": "Set up Grundsteuer payment via Dauerauftrag (quarterly or annual)",
                "is_required": True,
            },
            {
                "title": "Track mortgage payments and request annual interest statement",
                "is_required": True,
                "conditions": {"financing_type": ["mortgage", "mixed"]},
            },
            {
                "title": "Prepare for Anlage V rental income tax filing",
                "is_required": True,
                "conditions": {"property_use": ["rent_out"]},
            },
            {
                "title": "Keep records of all property expenses for tax deduction",
                "is_required": True,
            },
        ],
    ),
    # RENTAL SETUP PHASE (rent-out investors only)
    StepTemplate(
        step_number=24,
        phase=JourneyPhase.RENTAL_SETUP,
        title="Set Up Rental Operations",
        description="Prepare everything needed to start renting out your property: lease template, tenant screening, and utility accounting.",
        estimated_duration_days=14,
        content_key="rental_operations_setup",
        conditions={"property_use": ["rent_out"]},
        prerequisites=[25],
        tasks=[
            {
                "title": "Prepare a Mietvertrag (lease agreement) using a standard template",
                "is_required": True,
            },
            {
                "title": "Set up tenant screening process (SCHUFA check, income verification)",
                "is_required": True,
            },
            {
                "title": "Plan Nebenkostenabrechnung (utility cost accounting) for tenants",
                "is_required": True,
            },
            {
                "title": "Arrange landlord insurance (Haus- und Grundbesitzerhaftpflicht)",
                "is_required": True,
            },
            {
                "title": "Create a Wohnungsübergabeprotokoll (handover protocol) template",
                "is_required": False,
            },
        ],
        related_laws=[
            "BGB §535 (Mietvertrag)",
            "BetrKV (Betriebskostenverordnung)",
            "HeizkostenV (Heizkostenverordnung)",
        ],
    ),
]


def _format_eur(amount: float) -> str:
    """Format a float as a rounded EUR string (e.g. '18,000 EUR')."""
    return f"{amount:,.0f} EUR"


def _personalize_cost_task(
    original: dict[str, Any],
    title: str,
    pct: float,
    budget: int,
    cost_suffix: str = "",
) -> tuple[dict[str, Any], str]:
    """Build a personalized cost task and its estimated_costs string.

    Args:
        original: Original task dict to spread into the result.
        title: Personalized task title.
        pct: Cost percentage rate.
        budget: User's budget in euros.
        cost_suffix: Optional suffix inside the parentheses (e.g. ", if applicable").

    Returns:
        (task_dict, cost_label) tuple.
    """
    amount = budget * (pct / 100)
    desc = f"Estimated: {_format_eur(amount)} ({pct}% of {_format_eur(budget)})"
    cost_label = f"{_format_eur(amount)} ({pct}%{cost_suffix})"
    return {**original, "title": title, "description": desc}, cost_label


def _personalize_buying_costs(
    template: StepTemplate, answers: QuestionnaireAnswers
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Personalize Step 5 buying-cost tasks using the user's budget and state.

    Returns a (tasks, estimated_costs) tuple ready to be stored on the step.
    """
    budget = answers.budget_euros
    state_entry = STATE_RATES.get(answers.property_location)
    fallback_costs = template.estimated_costs or {}

    notary_pct = COST_DEFAULTS.notary_fee_percent
    registry_pct = COST_DEFAULTS.land_registry_fee_percent
    agent_pct = COST_DEFAULTS.agent_commission_percent

    tasks: list[dict[str, Any]] = []
    estimated_costs: dict[str, Any] = {}

    # --- Transfer tax task (state-dependent) ---
    original_tax_task = template.tasks[0]
    if state_entry:
        state_name, tax_rate = state_entry
        title = f"Calculate Grunderwerbsteuer ({tax_rate}% in {state_name})"
        if budget is not None:
            task, cost_label = _personalize_cost_task(
                original_tax_task, title, tax_rate, budget
            )
            tasks.append(task)
        else:
            tasks.append({**original_tax_task, "title": title, "description": None})
            cost_label = f"{tax_rate}% in {state_name}"
        estimated_costs["grunderwerbsteuer"] = cost_label
    else:
        tasks.append(original_tax_task)
        estimated_costs["grunderwerbsteuer"] = fallback_costs.get(
            "grunderwerbsteuer", "3.5-6.5% (varies by state)"
        )

    # --- Notary, land registry, agent tasks (budget-dependent only) ---
    cost_specs: list[tuple[int, str, float, str, str]] = [
        (1, f"Estimate notary fees ({notary_pct}%)", notary_pct, "notary_fees", ""),
        (
            2,
            f"Factor in land registry fees ({registry_pct}%)",
            registry_pct,
            "land_registry",
            "",
        ),
        (
            3,
            f"Budget for agent commission ({agent_pct}%)",
            agent_pct,
            "agent_commission",
            ", if applicable",
        ),
    ]
    for idx, title, pct, cost_key, suffix in cost_specs:
        original = template.tasks[idx]
        if budget is not None:
            task, cost_label = _personalize_cost_task(
                original, title, pct, budget, cost_suffix=suffix
            )
            tasks.append(task)
            estimated_costs[cost_key] = cost_label
        else:
            tasks.append(original)
            estimated_costs[cost_key] = fallback_costs.get(cost_key, f"{pct}%")

    # --- Total estimated ---
    if budget is not None:
        tax_rate_val = state_entry[1] if state_entry else 0
        total = budget * ((tax_rate_val + notary_pct + registry_pct + agent_pct) / 100)
        estimated_costs["total_estimated"] = _format_eur(total)

    return tasks, estimated_costs


def _matches_conditions(
    conditions: dict[str, Any] | None, answers: QuestionnaireAnswers
) -> bool:
    """Check if a set of conditions matches the questionnaire answers.

    Used for both step-level and task-level conditional inclusion.
    """
    if conditions is None:
        return True

    for field, valid_values in conditions.items():
        answer_value = getattr(answers, field, None)
        # If the answer is None, the condition cannot be satisfied — exclude
        # the step/task. Every conditioned field (financing_type, property_use,
        # has_german_residency) is always provided for new journeys; None only
        # occurs for legacy journeys that predate the field.
        if answer_value is None:
            return False

        # Handle enum values
        if hasattr(answer_value, "value"):
            answer_value = answer_value.value

        # Handle boolean conditions
        if isinstance(valid_values, bool):
            if answer_value != valid_values:
                return False
        # Handle list of valid values
        elif isinstance(valid_values, list):
            if answer_value not in valid_values:
                return False

    return True


def _should_include_step(template: StepTemplate, answers: QuestionnaireAnswers) -> bool:
    """Check if a step should be included based on questionnaire answers."""
    return _matches_conditions(template.conditions, answers)


def generate_journey(
    session: Session,
    user_id: uuid.UUID,
    title: str,
    answers: QuestionnaireAnswers,
) -> Journey:
    """Generate a personalized journey based on questionnaire answers.

    Args:
        session: Database session.
        user_id: User's UUID.
        title: Journey title.
        answers: Questionnaire answers for personalization.

    Returns:
        Created Journey with generated steps.
    """
    # Create the journey, pre-filling property_goals from questionnaire so
    # Research Step 1 "Define Your Property Goals" loads with the type already selected.
    journey = Journey(
        user_id=user_id,
        title=title,
        property_type=answers.property_type,
        property_location=answers.property_location,
        financing_type=answers.financing_type,
        is_first_time_buyer=answers.is_first_time_buyer,
        has_german_residency=answers.has_german_residency,
        budget_euros=answers.budget_euros,
        target_purchase_date=answers.target_purchase_date,
        property_use=answers.property_use,
        started_at=datetime.now(timezone.utc),
        property_goals={
            "preferred_property_type": answers.property_type.value,
            "budget_min_euros": answers.budget_min_euros,
            "budget_max_euros": answers.budget_euros,
            "property_use": answers.property_use,
        },
    )
    session.add(journey)
    session.flush()  # Get journey ID

    # Generate steps based on conditions
    step_number_map: dict[int, int] = {}  # Original -> New step number
    current_step = 0

    for template in STEP_TEMPLATES:
        if not _should_include_step(template, answers):
            continue

        current_step += 1
        step_number_map[template.step_number] = current_step

        # Map prerequisites to new step numbers
        prerequisites: list[int] | None = None
        if template.prerequisites:
            mapped_prereqs = [
                step_number_map.get(p)
                for p in template.prerequisites
                if p in step_number_map
            ]
            if mapped_prereqs:
                prerequisites = [p for p in mapped_prereqs if p is not None]

        # Personalize buying costs step with user's budget and state
        tasks_data = template.tasks
        step_estimated_costs = template.estimated_costs
        if template.content_key == "buying_costs":
            tasks_data, step_estimated_costs = _personalize_buying_costs(
                template, answers
            )

        step = JourneyStep(
            journey_id=journey.id,
            step_number=current_step,
            phase=template.phase,
            title=template.title,
            description=template.description,
            estimated_duration_days=template.estimated_duration_days,
            content_key=template.content_key,
            prerequisites=prerequisites,
            related_laws=template.related_laws,
            estimated_costs=step_estimated_costs,
        )
        session.add(step)
        session.flush()

        # Create tasks for this step, filtering by task-level conditions
        task_order = 0
        for task_data in tasks_data:
            if not _matches_conditions(task_data.get("conditions"), answers):
                continue
            task = JourneyTask(
                step_id=step.id,
                order=task_order,
                title=task_data["title"],
                is_required=task_data.get("is_required", True),
                description=task_data.get("description"),
                resource_url=task_data.get("resource_url"),
                resource_type=task_data.get("resource_type"),
            )
            session.add(task)
            task_order += 1

    session.commit()
    session.refresh(journey)
    return journey


def get_journey(
    session: Session,
    journey_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Journey:
    """Get a journey by ID, ensuring it belongs to the user.

    Args:
        session: Database session.
        journey_id: Journey UUID.
        user_id: User's UUID.

    Returns:
        Journey object.

    Raises:
        JourneyNotFoundError: If journey not found or doesn't belong to user.
    """
    statement = select(Journey).where(
        Journey.id == journey_id,
        Journey.user_id == user_id,
    )
    journey = session.exec(statement).first()
    if not journey:
        raise JourneyNotFoundError(f"Journey {journey_id} not found")
    return journey


def get_user_journeys(
    session: Session,
    user_id: uuid.UUID,
    active_only: bool = True,
) -> list[Journey]:
    """Get all journeys for a user.

    Args:
        session: Database session.
        user_id: User's UUID.
        active_only: If True, only return active journeys.

    Returns:
        List of Journey objects.
    """
    statement = select(Journey).where(Journey.user_id == user_id)
    if active_only:
        statement = statement.where(Journey.is_active == True)  # noqa: E712
    statement = statement.order_by(Journey.created_at.desc())
    return list(session.exec(statement).all())


def get_step(
    session: Session,
    journey_id: uuid.UUID,
    step_id: uuid.UUID,
) -> JourneyStep:
    """Get a specific step.

    Args:
        session: Database session.
        journey_id: Journey UUID.
        step_id: Step UUID.

    Returns:
        JourneyStep object.

    Raises:
        StepNotFoundError: If step not found.
    """
    statement = select(JourneyStep).where(
        JourneyStep.id == step_id,
        JourneyStep.journey_id == journey_id,
    )
    step = session.exec(statement).first()
    if not step:
        raise StepNotFoundError(f"Step {step_id} not found")
    return step


def update_step_status(
    session: Session,
    journey: Journey,
    step_id: uuid.UUID,
    new_status: StepStatus,
) -> JourneyStep:
    """Update a step's status.

    Args:
        session: Database session.
        journey: Journey object.
        step_id: Step UUID.
        new_status: New status to set.

    Returns:
        Updated JourneyStep.

    Raises:
        StepNotFoundError: If step not found.
        InvalidStepTransitionError: If prerequisites not met.
    """
    step = get_step(session, journey.id, step_id)

    # Check prerequisites if starting or completing
    if new_status in (StepStatus.IN_PROGRESS, StepStatus.COMPLETED):
        if step.prerequisites:
            prereq_steps: list[int] = step.prerequisites
            for prereq_num in prereq_steps:
                prereq_statement = select(JourneyStep).where(
                    JourneyStep.journey_id == journey.id,
                    JourneyStep.step_number == prereq_num,
                )
                prereq = session.exec(prereq_statement).first()
                if prereq and prereq.status != StepStatus.COMPLETED:
                    raise InvalidStepTransitionError(
                        f"Prerequisite step {prereq_num} must be completed first"
                    )

    # Update timestamps
    now = datetime.now(timezone.utc)
    if new_status == StepStatus.IN_PROGRESS and not step.started_at:
        step.started_at = now
    elif new_status == StepStatus.COMPLETED:
        step.completed_at = now

    step.status = new_status
    session.add(step)

    # Update journey's current step if progressing
    if new_status == StepStatus.COMPLETED:
        next_step = _get_next_incomplete_step(session, journey)
        if next_step:
            journey.current_step_number = next_step.step_number
            journey.current_phase = next_step.phase
        else:
            # Journey complete
            journey.completed_at = now
        session.add(journey)

    session.commit()
    session.refresh(step)
    return step


def update_task_status(
    session: Session,
    step: JourneyStep,
    task_id: uuid.UUID,
    is_completed: bool,
    journey: Journey,
) -> JourneyTask:
    """Update a task's completion status.

    Automatically syncs the parent step status:
    - First task checked on a not_started step → in_progress
    - All tasks completed → completed (advances journey)
    - Task unchecked on a completed step → in_progress

    Args:
        session: Database session.
        step: JourneyStep object.
        task_id: Task UUID.
        is_completed: New completion status.
        journey: Journey object for step advancement on completion.

    Returns:
        Updated JourneyTask.

    Raises:
        JourneyError: If task not found.
    """
    statement = select(JourneyTask).where(
        JourneyTask.id == task_id,
        JourneyTask.step_id == step.id,
    )
    task = session.exec(statement).first()
    if not task:
        raise JourneyError(f"Task {task_id} not found")

    now = datetime.now(timezone.utc)
    task.is_completed = is_completed
    task.completed_at = now if is_completed else None
    session.add(task)

    # Sync step status based on task completion
    _sync_step_status_from_tasks(session, step, task, journey)

    session.commit()
    session.refresh(task)
    return task


def _sync_step_status_from_tasks(
    session: Session,
    step: JourneyStep,
    updated_task: JourneyTask,
    journey: Journey | None,
) -> None:
    """Sync step status based on task completion state.

    Args:
        session: Database session.
        step: Parent step.
        updated_task: The task that was just updated (in-memory, not yet committed).
        journey: Journey object for advancing current step on completion.
    """
    # Load all sibling tasks
    all_tasks_stmt = select(JourneyTask).where(JourneyTask.step_id == step.id)
    all_tasks = list(session.exec(all_tasks_stmt).all())

    # Build completion map, using the in-memory state for the updated task
    completed_count = 0
    for t in all_tasks:
        is_done = (
            updated_task.is_completed if t.id == updated_task.id else t.is_completed
        )
        if is_done:
            completed_count += 1

    total_tasks = len(all_tasks)
    if total_tasks == 0:
        return
    all_complete = completed_count == total_tasks
    any_complete = completed_count > 0
    now = datetime.now(timezone.utc)

    if all_complete and step.status != StepStatus.COMPLETED:
        # All tasks done → mark step completed
        step.status = StepStatus.COMPLETED
        step.completed_at = now
        if not step.started_at:
            step.started_at = now
        session.add(step)

        # Advance journey to next step
        if journey:
            next_step = _get_next_incomplete_step(session, journey)
            if next_step:
                journey.current_step_number = next_step.step_number
                journey.current_phase = next_step.phase
            else:
                journey.completed_at = now
            session.add(journey)

    elif not all_complete and step.status == StepStatus.COMPLETED:
        # Task unchecked on a completed step → revert to in_progress
        step.status = StepStatus.IN_PROGRESS
        step.completed_at = None
        session.add(step)

        # Revert journey current step if needed
        if journey and journey.current_step_number > step.step_number:
            journey.current_step_number = step.step_number
            journey.current_phase = step.phase
            journey.completed_at = None
            session.add(journey)

    elif not any_complete and step.status == StepStatus.IN_PROGRESS:
        # All tasks unchecked on an in_progress step → revert to not_started
        step.status = StepStatus.NOT_STARTED
        step.started_at = None
        session.add(step)

    elif any_complete and step.status == StepStatus.NOT_STARTED:
        # First task checked → move to in_progress
        step.status = StepStatus.IN_PROGRESS
        step.started_at = now
        session.add(step)


def _get_next_incomplete_step(
    session: Session,
    journey: Journey,
) -> JourneyStep | None:
    """Get the next incomplete step in the journey."""
    statement = (
        select(JourneyStep)
        .where(
            JourneyStep.journey_id == journey.id,
            JourneyStep.status != StepStatus.COMPLETED,
            JourneyStep.status != StepStatus.SKIPPED,
        )
        .order_by(JourneyStep.step_number)
    )
    return session.exec(statement).first()


def get_next_step(
    session: Session,
    journey: Journey,
) -> JourneyStep | None:
    """Get the next recommended step for a journey.

    Args:
        session: Database session.
        journey: Journey object.

    Returns:
        Next JourneyStep or None if journey is complete.
    """
    return _get_next_incomplete_step(session, journey)


def get_progress(
    session: Session,
    journey: Journey,
) -> dict[str, Any]:
    """Calculate journey progress.

    Args:
        session: Database session.
        journey: Journey object.

    Returns:
        Progress dictionary with stats.
    """
    statement = select(JourneyStep).where(JourneyStep.journey_id == journey.id)
    steps = list(session.exec(statement).all())

    total_steps = len(steps)
    completed_steps = sum(1 for s in steps if s.status == StepStatus.COMPLETED)

    # Calculate by phase
    phases: dict[str, dict[str, int]] = {}
    for phase in JourneyPhase:
        phase_steps = [s for s in steps if s.phase == phase]
        phases[phase.value] = {
            "total": len(phase_steps),
            "completed": sum(
                1 for s in phase_steps if s.status == StepStatus.COMPLETED
            ),
        }

    # Estimate remaining days
    remaining_steps = [
        s for s in steps if s.status not in (StepStatus.COMPLETED, StepStatus.SKIPPED)
    ]
    estimated_days = sum(s.estimated_duration_days or 0 for s in remaining_steps)

    return {
        "journey_id": journey.id,
        "total_steps": total_steps,
        "completed_steps": completed_steps,
        "current_step_number": journey.current_step_number,
        "current_phase": journey.current_phase,
        "progress_percentage": (completed_steps / total_steps * 100)
        if total_steps > 0
        else 0,
        "estimated_days_remaining": estimated_days if estimated_days > 0 else None,
        "phases": phases,
    }
