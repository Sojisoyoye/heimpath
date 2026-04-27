"""SQLAlchemy ORM models and Pydantic schemas.

This module provides backward compatibility by re-exporting all models and schemas
from the legacy SQLModel-based models file, plus new SQLAlchemy models.

New Code:
- For new SQLAlchemy models, import from app.models.user
- For Pydantic schemas, import from app.schemas (once created)

Legacy Code:
- Existing imports from app.models continue to work
"""

from sqlmodel import SQLModel

from app._models_sqlmodel import (
    Message,
    NewPassword,
    SubscriptionTier,
    Token,
    TokenPayload,
    UpdatePassword,
    User,
    UserBase,
    UserCreate,
    UserPublic,
    UserRegister,
    UsersPublic,
    UserUpdate,
    UserUpdateMe,
)
from app.models.article import (
    Article,
    ArticleCategory,
    ArticleRating,
    ArticleStatus,
    DifficultyLevel,
)
from app.models.base import Base
from app.models.calculator import HiddenCostCalculation
from app.models.contract import ContractAnalysis
from app.models.document import (
    Document,
    DocumentStatus,
    DocumentTranslation,
    DocumentType,
)
from app.models.feedback import Feedback, FeedbackCategory
from app.models.financing import FinancingAssessment
from app.models.glossary import GlossaryCategory, GlossaryTerm
from app.models.journey import (
    FinancingType,
    Journey,
    JourneyPhase,
    JourneyStep,
    JourneyTask,
    JourneyType,
    PropertyType,
    StepStatus,
)
from app.models.legal import (
    CourtRuling,
    Law,
    LawBookmark,
    LawCategory,
    LawJourneyStepLink,
    LawVersion,
    PropertyTypeApplicability,
    RelatedLaw,
    StateVariation,
)
from app.models.mietpreisbremse import MietspiegelEntry
from app.models.notification import (
    Notification,
    NotificationPreference,
    NotificationType,
)
from app.models.ownership_comparison import OwnershipComparison
from app.models.portfolio import (
    PortfolioProperty,
    PortfolioTransaction,
    TransactionType,
)
from app.models.professional import (
    ContactInquiry,
    Professional,
    ProfessionalReview,
    ProfessionalType,
)
from app.models.property_evaluation import PropertyEvaluation
from app.models.roi import ROICalculation
from app.models.user import User as UserV2

__all__ = [
    # SQLModel base class (for Alembic)
    "SQLModel",
    # Legacy SQLModel exports (backward compatibility)
    "Message",
    "NewPassword",
    "Token",
    "TokenPayload",
    "UpdatePassword",
    "User",
    "UserBase",
    "UserCreate",
    "UserPublic",
    "UserRegister",
    "UsersPublic",
    "UserUpdate",
    "UserUpdateMe",
    # New SQLAlchemy models
    "Article",
    "ArticleCategory",
    "ArticleRating",
    "ArticleStatus",
    "Base",
    "DifficultyLevel",
    "Feedback",
    "FeedbackCategory",
    "FinancingAssessment",
    "GlossaryCategory",
    "GlossaryTerm",
    "HiddenCostCalculation",
    "MietspiegelEntry",
    "Notification",
    "NotificationPreference",
    "NotificationType",
    "OwnershipComparison",
    "PortfolioProperty",
    "PortfolioTransaction",
    "TransactionType",
    "ContractAnalysis",
    "ContactInquiry",
    "Professional",
    "ProfessionalReview",
    "ProfessionalType",
    "PropertyEvaluation",
    "ROICalculation",
    "Document",
    "DocumentStatus",
    "DocumentTranslation",
    "DocumentType",
    "CourtRuling",
    "FinancingType",
    "Journey",
    "JourneyPhase",
    "JourneyStep",
    "JourneyTask",
    "JourneyType",
    "Law",
    "LawBookmark",
    "LawCategory",
    "LawJourneyStepLink",
    "LawVersion",
    "PropertyType",
    "PropertyTypeApplicability",
    "RelatedLaw",
    "StateVariation",
    "StepStatus",
    "SubscriptionTier",
    "UserV2",
]
