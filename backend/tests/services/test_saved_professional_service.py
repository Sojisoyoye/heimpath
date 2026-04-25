"""Tests for the saved professional service functions."""

import uuid
from unittest.mock import MagicMock

import pytest

from app.models.professional import Professional, SavedProfessional
from app.services.professional_service import (
    ProfessionalAlreadySavedError,
    ProfessionalNotFoundError,
    SavedProfessionalNotFoundError,
    get_saved_professionals,
    is_professional_saved,
    save_professional,
    unsave_professional,
)


@pytest.fixture
def sample_professional() -> MagicMock:
    """Create a sample professional mock."""
    pro = MagicMock(spec=Professional)
    pro.id = uuid.uuid4()
    pro.name = "Hans Müller"
    pro.type = "lawyer"
    pro.city = "Berlin"
    pro.languages = "German, English"
    return pro


class TestSaveProfessional:
    """Tests for save_professional."""

    def test_save_professional(self, sample_professional: MagicMock) -> None:
        """Test saving a professional creates a record and is_professional_saved returns True."""
        mock_session = MagicMock()

        # get_professional_by_id: returns professional
        mock_scalars_pro = MagicMock()
        mock_scalars_pro.first.return_value = sample_professional
        # is_professional_saved: returns None (not saved yet)
        mock_scalars_saved = MagicMock()
        mock_scalars_saved.first.return_value = None
        mock_session.execute.return_value.scalars.side_effect = [
            mock_scalars_pro,
            mock_scalars_saved,
        ]

        save_professional(mock_session, sample_professional.id, uuid.uuid4())

        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()

    def test_save_professional_not_found(self) -> None:
        """Test that ProfessionalNotFoundError is raised when professional does not exist."""
        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.first.return_value = None

        with pytest.raises(ProfessionalNotFoundError):
            save_professional(mock_session, uuid.uuid4(), uuid.uuid4())

    def test_save_professional_already_saved(
        self, sample_professional: MagicMock
    ) -> None:
        """Test that ProfessionalAlreadySavedError is raised when already saved."""
        mock_session = MagicMock()
        existing_saved = MagicMock(spec=SavedProfessional)

        # get_professional_by_id: returns professional
        mock_scalars_pro = MagicMock()
        mock_scalars_pro.first.return_value = sample_professional
        # is_professional_saved: returns existing record
        mock_scalars_saved = MagicMock()
        mock_scalars_saved.first.return_value = existing_saved
        mock_session.execute.return_value.scalars.side_effect = [
            mock_scalars_pro,
            mock_scalars_saved,
        ]

        with pytest.raises(ProfessionalAlreadySavedError):
            save_professional(mock_session, sample_professional.id, uuid.uuid4())


class TestUnsaveProfessional:
    """Tests for unsave_professional."""

    def test_unsave_professional(self) -> None:
        """Test that unsaving a professional deletes the record."""
        mock_session = MagicMock()
        mock_saved = MagicMock(spec=SavedProfessional)
        mock_session.execute.return_value.scalars.return_value.first.return_value = (
            mock_saved
        )

        unsave_professional(mock_session, uuid.uuid4(), uuid.uuid4())

        mock_session.delete.assert_called_once_with(mock_saved)
        mock_session.commit.assert_called_once()

    def test_unsave_professional_not_found(self) -> None:
        """Test that SavedProfessionalNotFoundError is raised when record not found."""
        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.first.return_value = None

        with pytest.raises(SavedProfessionalNotFoundError):
            unsave_professional(mock_session, uuid.uuid4(), uuid.uuid4())


class TestGetSavedProfessionals:
    """Tests for get_saved_professionals."""

    def test_get_saved_professionals(self) -> None:
        """Test that saved professionals are returned for a user."""
        mock_session = MagicMock()
        mock_saved = MagicMock(spec=SavedProfessional)
        mock_session.execute.return_value.scalars.return_value.all.return_value = [
            mock_saved
        ]

        result = get_saved_professionals(mock_session, uuid.uuid4())

        assert len(result) == 1
        assert result[0] is mock_saved


class TestIsProfessionalSaved:
    """Tests for is_professional_saved."""

    def test_is_professional_saved_false(self) -> None:
        """Test that is_professional_saved returns False when not saved."""
        mock_session = MagicMock()
        mock_session.execute.return_value.scalars.return_value.first.return_value = None

        result = is_professional_saved(mock_session, uuid.uuid4(), uuid.uuid4())

        assert result is False
