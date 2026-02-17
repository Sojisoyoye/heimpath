"""SQLAlchemy ORM models and Pydantic schemas.

This module provides backward compatibility by re-exporting all models and schemas
from the legacy SQLModel-based models file, plus new SQLAlchemy models.

New Code:
- For new SQLAlchemy models, import from app.models.user, app.models.item
- For Pydantic schemas, import from app.schemas (once created)

Legacy Code:
- Existing imports from app.models continue to work
"""

from sqlmodel import SQLModel

from app._models_sqlmodel import (
    Item,
    ItemBase,
    ItemCreate,
    ItemPublic,
    ItemsPublic,
    ItemUpdate,
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
from app.models.base import Base
from app.models.calculator import HiddenCostCalculation
from app.models.document import (
    Document,
    DocumentStatus,
    DocumentTranslation,
    DocumentType,
)
from app.models.financing import FinancingAssessment
from app.models.item import Item as ItemV2
from app.models.journey import (
    FinancingType,
    Journey,
    JourneyPhase,
    JourneyStep,
    JourneyTask,
    PropertyType,
    StepStatus,
)
from app.models.roi import ROICalculation
from app.models.user import User as UserV2

__all__ = [
    # SQLModel base class (for Alembic)
    "SQLModel",
    # Legacy SQLModel exports (backward compatibility)
    "Item",
    "ItemBase",
    "ItemCreate",
    "ItemPublic",
    "ItemsPublic",
    "ItemUpdate",
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
    "Base",
    "FinancingAssessment",
    "HiddenCostCalculation",
    "ROICalculation",
    "Document",
    "DocumentStatus",
    "DocumentTranslation",
    "DocumentType",
    "FinancingType",
    "ItemV2",
    "Journey",
    "JourneyPhase",
    "JourneyStep",
    "JourneyTask",
    "PropertyType",
    "StepStatus",
    "SubscriptionTier",
    "UserV2",
]
