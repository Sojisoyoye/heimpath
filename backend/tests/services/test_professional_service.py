"""Tests for the Professional Service admin functions."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.models.professional import Professional, ProfessionalType
from app.services.professional_service import (
    ProfessionalNotFoundError,
    create_professional,
    delete_professional,
    update_professional,
)


def _make_professional(**overrides: object) -> MagicMock:
    """Create a mock Professional with default test values."""
    defaults: dict[str, object] = {
        "id": uuid.uuid4(),
        "name": "Test Lawyer",
        "type": ProfessionalType.LAWYER.value,
        "city": "Berlin",
        "languages": "German, English",
        "description": "Test description",
        "email": "test@example.de",
        "phone": None,
        "website": None,
        "is_verified": False,
        "average_rating": 0.0,
        "review_count": 0,
        "recommendation_rate": None,
        "review_highlights": None,
    }
    defaults.update(overrides)
    mock = MagicMock(spec=Professional)
    for key, value in defaults.items():
        setattr(mock, key, value)
    return mock


class TestCreateProfessional:
    """Tests for create_professional."""

    def test_create_professional(self) -> None:
        """Creating a professional adds it to the session and commits."""
        session = MagicMock(spec=["add", "commit", "refresh"])
        data = {
            "name": "Dr. Mueller",
            "type": ProfessionalType.LAWYER.value,
            "city": "Munich",
            "languages": "German, English",
            "is_verified": False,
        }

        result = create_professional(session, data)

        session.add.assert_called_once()
        session.commit.assert_called_once()
        session.refresh.assert_called_once_with(result)
        assert result.name == "Dr. Mueller"
        assert result.city == "Munich"

    def test_create_professional_with_optional_fields(self) -> None:
        """Creating a professional with all optional fields populated."""
        session = MagicMock(spec=["add", "commit", "refresh"])
        data = {
            "name": "Steuerberater Schmidt",
            "type": ProfessionalType.TAX_ADVISOR.value,
            "city": "Frankfurt",
            "languages": "German",
            "description": "Experienced tax advisor",
            "email": "schmidt@tax.de",
            "phone": "+49 69 123456",
            "website": "https://schmidt-tax.de",
            "is_verified": True,
        }

        result = create_professional(session, data)

        assert result.email == "schmidt@tax.de"
        assert result.phone == "+49 69 123456"
        assert result.website == "https://schmidt-tax.de"


class TestUpdateProfessional:
    """Tests for update_professional."""

    def test_update_professional(self) -> None:
        """Partial update sets only the provided fields."""
        professional = _make_professional(name="Old Name", city="Berlin")
        session = MagicMock(spec=["execute", "add", "commit", "refresh"])
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = professional
        session.execute.return_value.scalars.return_value = scalars_mock

        result = update_professional(session, professional.id, {"name": "New Name"})

        assert result.name == "New Name"
        assert result.city == "Berlin"
        session.commit.assert_called_once()

    def test_update_professional_not_found(self) -> None:
        """Updating a non-existent professional raises ProfessionalNotFoundError."""
        session = MagicMock(spec=["execute"])
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = None
        session.execute.return_value.scalars.return_value = scalars_mock

        with pytest.raises(ProfessionalNotFoundError):
            update_professional(session, uuid.uuid4(), {"name": "X"})


class TestDeleteProfessional:
    """Tests for delete_professional."""

    def test_delete_professional(self) -> None:
        """Deleting a professional removes it and commits."""
        professional = _make_professional()
        session = MagicMock(spec=["execute", "delete", "commit"])
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = professional
        session.execute.return_value.scalars.return_value = scalars_mock

        delete_professional(session, professional.id)

        session.delete.assert_called_once_with(professional)
        session.commit.assert_called_once()

    def test_delete_professional_not_found(self) -> None:
        """Deleting a non-existent professional raises ProfessionalNotFoundError."""
        session = MagicMock(spec=["execute"])
        scalars_mock = MagicMock()
        scalars_mock.first.return_value = None
        session.execute.return_value.scalars.return_value = scalars_mock

        with pytest.raises(ProfessionalNotFoundError):
            delete_professional(session, uuid.uuid4())
