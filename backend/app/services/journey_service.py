"""Journey Service.

Provides journey generation, progression, and management for the
guided property buying process.
"""

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
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


# Step templates for the German property buying journey
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
            {"title": "Research average prices in your area", "is_required": True},
            {"title": "Understand price per sqm trends", "is_required": True},
            {"title": "Learn about Makler (agent) fees", "is_required": True},
        ],
        related_laws=["BGB §433-453 (Kaufvertrag)"],
    ),
    StepTemplate(
        step_number=3,
        phase=JourneyPhase.RESEARCH,
        title="Find a Property",
        description="Search for properties matching your criteria.",
        estimated_duration_days=30,
        content_key="property_search",
        prerequisites=[2],
        tasks=[
            {"title": "Set up alerts on ImmoScout24, Immowelt", "is_required": True},
            {"title": "Contact local Makler (agents)", "is_required": False},
            {"title": "Schedule viewings", "is_required": True},
            {"title": "Take notes and photos at viewings", "is_required": True},
        ],
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
        step_number=9,
        phase=JourneyPhase.PREPARATION,
        title="Prepare Required Documents",
        description="Gather all documents needed for the property purchase.",
        estimated_duration_days=7,
        content_key="documents_prep",
        prerequisites=[5],
        tasks=[
            {"title": "Obtain proof of identity (passport/ID)", "is_required": True},
            {"title": "Get proof of address in Germany", "is_required": True},
            {"title": "Prepare bank statements", "is_required": True},
            {
                "title": "Gather employment contract/proof of income",
                "is_required": True,
            },
        ],
        conditions={"has_german_residency": False},
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
        step_number=14,
        phase=JourneyPhase.BUYING,
        title="Sign at the Notary",
        description="Attend the notary appointment and sign the purchase contract.",
        estimated_duration_days=1,
        content_key="notary_signing",
        prerequisites=[13],
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
            {"title": "Transfer utilities to your name", "is_required": True},
        ],
        related_laws=["GBO §13 (Eintragungsgrundsatz)"],
    ),
]


class JourneyService:
    """Service for managing property buying journeys.

    Handles journey generation based on questionnaire answers,
    step progression, and progress tracking.
    """

    def __init__(self) -> None:
        """Initialize the journey service."""
        self._step_templates = STEP_TEMPLATES

    def _should_include_step(
        self, template: StepTemplate, answers: QuestionnaireAnswers
    ) -> bool:
        """Check if a step should be included based on questionnaire answers."""
        if template.conditions is None:
            return True

        for field, valid_values in template.conditions.items():
            answer_value = getattr(answers, field, None)
            if answer_value is None:
                continue

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

    def generate_journey(
        self,
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
        # Create the journey
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
            started_at=datetime.now(timezone.utc),
        )
        session.add(journey)
        session.flush()  # Get journey ID

        # Generate steps based on conditions
        step_number_map: dict[int, int] = {}  # Original -> New step number
        current_step = 0

        for template in self._step_templates:
            if not self._should_include_step(template, answers):
                continue

            current_step += 1
            step_number_map[template.step_number] = current_step

            # Map prerequisites to new step numbers
            prerequisites = None
            if template.prerequisites:
                mapped_prereqs = [
                    step_number_map.get(p)
                    for p in template.prerequisites
                    if p in step_number_map
                ]
                if mapped_prereqs:
                    prerequisites = json.dumps(mapped_prereqs)

            step = JourneyStep(
                journey_id=journey.id,
                step_number=current_step,
                phase=template.phase,
                title=template.title,
                description=template.description,
                estimated_duration_days=template.estimated_duration_days,
                content_key=template.content_key,
                prerequisites=prerequisites,
                related_laws=json.dumps(template.related_laws)
                if template.related_laws
                else None,
                estimated_costs=json.dumps(template.estimated_costs)
                if template.estimated_costs
                else None,
            )
            session.add(step)
            session.flush()

            # Create tasks for this step
            for i, task_data in enumerate(template.tasks):
                task = JourneyTask(
                    step_id=step.id,
                    order=i,
                    title=task_data["title"],
                    is_required=task_data.get("is_required", True),
                    description=task_data.get("description"),
                    resource_url=task_data.get("resource_url"),
                    resource_type=task_data.get("resource_type"),
                )
                session.add(task)

        session.commit()
        session.refresh(journey)
        return journey

    def get_journey(
        self,
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
        self,
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
        self,
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
        self,
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
        step = self.get_step(session, journey.id, step_id)

        # Check prerequisites if starting or completing
        if new_status in (StepStatus.IN_PROGRESS, StepStatus.COMPLETED):
            if step.prerequisites:
                prereq_steps = json.loads(step.prerequisites)
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
            next_step = self._get_next_incomplete_step(session, journey)
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
        self,
        session: Session,
        step: JourneyStep,
        task_id: uuid.UUID,
        is_completed: bool,
    ) -> JourneyTask:
        """Update a task's completion status.

        Args:
            session: Database session.
            step: JourneyStep object.
            task_id: Task UUID.
            is_completed: New completion status.

        Returns:
            Updated JourneyTask.
        """
        statement = select(JourneyTask).where(
            JourneyTask.id == task_id,
            JourneyTask.step_id == step.id,
        )
        task = session.exec(statement).first()
        if not task:
            raise JourneyError(f"Task {task_id} not found")

        task.is_completed = is_completed
        task.completed_at = datetime.now(timezone.utc) if is_completed else None
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    def _get_next_incomplete_step(
        self,
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
        self,
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
        return self._get_next_incomplete_step(session, journey)

    def get_progress(
        self,
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
            s
            for s in steps
            if s.status not in (StepStatus.COMPLETED, StepStatus.SKIPPED)
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


# Singleton instance
_journey_service: JourneyService | None = None


@lru_cache
def get_journey_service() -> JourneyService:
    """Get the journey service singleton."""
    global _journey_service
    if _journey_service is None:
        _journey_service = JourneyService()
    return _journey_service
