"""Seed professional directory data.

Populates the professional table with sample verified professionals
across different types and cities. Idempotent: skips if professionals
already exist.
"""

import logging

from sqlmodel import Session, select

from app.models.professional import Professional, ProfessionalType

logger = logging.getLogger(__name__)

LANG_DE_EN = "German, English"

PROFESSIONALS: list[dict] = [
    # --- Lawyers ---
    {
        "name": "Dr. Anna Fischer",
        "type": ProfessionalType.LAWYER.value,
        "city": "Berlin",
        "languages": LANG_DE_EN,
        "description": (
            "Specializes in German real estate law with over 15 years of experience "
            "helping international buyers navigate property transactions."
        ),
        "email": "fischer@example-law.de",
        "phone": "+49 30 1234567",
        "website": "https://fischer-law.example.de",
    },
    {
        "name": "Mehmet Yılmaz",
        "type": ProfessionalType.LAWYER.value,
        "city": "Munich",
        "languages": "German, English, Turkish",
        "description": (
            "Real estate attorney focusing on cross-border property acquisitions "
            "and investment structures for foreign nationals."
        ),
        "email": "yilmaz@example-legal.de",
        "phone": "+49 89 2345678",
    },
    {
        "name": "Sarah O'Brien",
        "type": ProfessionalType.LAWYER.value,
        "city": "Frankfurt",
        "languages": "German, English, French",
        "description": (
            "Bilingual property lawyer assisting expats with due diligence, "
            "contract review, and title registration in Hesse."
        ),
        "email": "obrien@example-law.de",
    },
    # --- Notaries ---
    {
        "name": "Dr. Klaus Weber",
        "type": ProfessionalType.NOTARY.value,
        "city": "Berlin",
        "languages": LANG_DE_EN,
        "description": (
            "Public notary with extensive experience in property purchase "
            "contracts and land registry proceedings."
        ),
        "email": "weber@example-notar.de",
        "phone": "+49 30 3456789",
        "website": "https://notariat-weber.example.de",
    },
    {
        "name": "Maria Gonzalez-Schmidt",
        "type": ProfessionalType.NOTARY.value,
        "city": "Hamburg",
        "languages": "German, English, Spanish",
        "description": (
            "Notary specializing in international property transactions "
            "with a focus on Latin American and European buyers."
        ),
        "email": "gonzalez@example-notar.de",
        "phone": "+49 40 4567890",
    },
    {
        "name": "Dr. Thomas Braun",
        "type": ProfessionalType.NOTARY.value,
        "city": "Munich",
        "languages": LANG_DE_EN,
        "description": (
            "Experienced notary handling residential and commercial property "
            "transactions in the greater Munich area."
        ),
        "email": "braun@example-notar.de",
    },
    # --- Tax Advisors ---
    {
        "name": "Li Wei Chen",
        "type": ProfessionalType.TAX_ADVISOR.value,
        "city": "Frankfurt",
        "languages": "German, English, Mandarin",
        "description": (
            "Tax advisor specializing in real estate taxation for international "
            "investors, including property transfer tax and rental income."
        ),
        "email": "chen@example-tax.de",
        "phone": "+49 69 5678901",
        "website": "https://chen-tax.example.de",
    },
    {
        "name": "Fatima Al-Rashid",
        "type": ProfessionalType.TAX_ADVISOR.value,
        "city": "Düsseldorf",
        "languages": "German, English, Arabic",
        "description": (
            "Certified tax advisor helping property buyers understand German "
            "tax obligations, depreciation benefits, and deductions."
        ),
        "email": "alrashid@example-tax.de",
        "phone": "+49 211 6789012",
    },
    {
        "name": "Stefan Müller",
        "type": ProfessionalType.TAX_ADVISOR.value,
        "city": "Berlin",
        "languages": LANG_DE_EN,
        "description": (
            "Tax consultant with deep expertise in Grunderwerbsteuer (property "
            "transfer tax) and cross-border tax planning."
        ),
        "email": "mueller@example-tax.de",
    },
    # --- Mortgage Brokers ---
    {
        "name": "James Cooper",
        "type": ProfessionalType.MORTGAGE_BROKER.value,
        "city": "Berlin",
        "languages": LANG_DE_EN,
        "description": (
            "Independent mortgage broker helping expats secure competitive "
            "financing from German banks. Specializes in non-resident mortgages."
        ),
        "email": "cooper@example-finance.de",
        "phone": "+49 30 7890123",
        "website": "https://cooper-finance.example.de",
    },
    {
        "name": "Yuki Tanaka",
        "type": ProfessionalType.MORTGAGE_BROKER.value,
        "city": "Munich",
        "languages": "German, English, Japanese",
        "description": (
            "Mortgage specialist connecting international buyers with German "
            "lenders. Expert in KfW financing and energy-efficient properties."
        ),
        "email": "tanaka@example-finance.de",
        "phone": "+49 89 8901234",
    },
    {
        "name": "Elena Petrova",
        "type": ProfessionalType.MORTGAGE_BROKER.value,
        "city": "Hamburg",
        "languages": "German, English, Russian",
        "description": (
            "Certified financial advisor helping foreign nationals navigate "
            "the German mortgage market with access to 300+ lending partners."
        ),
        "email": "petrova@example-finance.de",
    },
    # --- Real Estate Agents ---
    {
        "name": "Marco Rossi",
        "type": ProfessionalType.REAL_ESTATE_AGENT.value,
        "city": "Munich",
        "languages": "German, English, Italian",
        "description": (
            "Licensed real estate agent specializing in residential properties "
            "for international buyers in Munich and surrounding areas."
        ),
        "email": "rossi@example-immo.de",
        "phone": "+49 89 9012345",
        "website": "https://rossi-immobilien.example.de",
    },
    {
        "name": "Priya Sharma",
        "type": ProfessionalType.REAL_ESTATE_AGENT.value,
        "city": "Berlin",
        "languages": "German, English, Hindi",
        "description": (
            "Berlin-based agent with deep knowledge of emerging neighborhoods "
            "and investment opportunities for international buyers."
        ),
        "email": "sharma@example-immo.de",
        "phone": "+49 30 0123456",
    },
    {
        "name": "Hans-Peter Richter",
        "type": ProfessionalType.REAL_ESTATE_AGENT.value,
        "city": "Düsseldorf",
        "languages": LANG_DE_EN,
        "description": (
            "Established real estate agent in the Rhineland area with 20+ years "
            "of experience and a network of trusted legal and financial partners."
        ),
        "email": "richter@example-immo.de",
        "phone": "+49 211 1234567",
        "website": "https://richter-immobilien.example.de",
    },
]


def seed_professionals(session: Session) -> None:
    """Seed sample professionals into the database. Idempotent."""
    existing_count = session.execute(select(Professional).limit(1)).scalars().first()

    if existing_count:
        logger.info("Professionals already seeded, skipping.")
        return

    inserted = 0
    for data in PROFESSIONALS:
        professional = Professional(**data, is_verified=True)
        session.add(professional)
        inserted += 1

    session.commit()
    logger.info("Seeded %d professionals.", inserted)

    # Seed reviews after professionals are created
    from app.core.seed_reviews import seed_reviews

    seed_reviews(session)
