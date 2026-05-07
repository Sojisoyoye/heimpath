"""Tests for backend/scripts/check_migration_safety.py."""

import sys
from pathlib import Path

# Make the scripts directory importable
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "scripts"))

from check_migration_safety import check_file  # noqa: E402


def _write(tmp_path: Path, content: str) -> str:
    migration = tmp_path / "0001_test_migration.py"
    migration.write_text(content)
    return str(migration)


def test_safe_nullable_false_with_server_default(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "def upgrade() -> None:\n"
        '    op.add_column("t", sa.Column("c", sa.Boolean(), nullable=False, server_default="false"))\n',
    )
    assert check_file(path) == []


def test_unsafe_nullable_false_without_server_default(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "def upgrade() -> None:\n"
        '    op.add_column("t", sa.Column("c", sa.Boolean(), nullable=False))\n',
    )
    errors = check_file(path)
    assert len(errors) == 1
    assert "nullable=False" in errors[0]
    assert "server_default=" in errors[0]


def test_safe_nullable_true_no_server_default(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "def upgrade() -> None:\n"
        '    op.add_column("t", sa.Column("c", sa.String(50), nullable=True))\n',
    )
    assert check_file(path) == []


def test_safe_no_nullable_arg(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "def upgrade() -> None:\n"
        '    op.add_column("t", sa.Column("c", sa.String(50)))\n',
    )
    assert check_file(path) == []


def test_suppression_comment_skips_check(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "def upgrade() -> None:\n"
        '    op.add_column("t", sa.Column("c", sa.Boolean(), nullable=False))  # migration-safety: ok\n',
    )
    assert check_file(path) == []


def test_multiple_columns_one_unsafe(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "def upgrade() -> None:\n"
        '    op.add_column("t", sa.Column("a", sa.Boolean(), nullable=False, server_default="false"))\n'
        '    op.add_column("t", sa.Column("b", sa.Boolean(), nullable=False))\n',
    )
    errors = check_file(path)
    assert len(errors) == 1
    assert '"b"' not in errors[0] or "server_default=" in errors[0]


def test_alter_column_not_checked(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        'def upgrade() -> None:\n    op.alter_column("t", "c", nullable=False)\n',
    )
    assert check_file(path) == []


def test_outside_upgrade_not_checked(tmp_path: Path) -> None:
    path = _write(
        tmp_path,
        "def upgrade() -> None:\n"
        "    pass\n"
        "\n"
        "def downgrade() -> None:\n"
        '    op.add_column("t", sa.Column("c", sa.Boolean(), nullable=False))\n',
    )
    assert check_file(path) == []


def test_empty_file_passes(tmp_path: Path) -> None:
    path = _write(tmp_path, "")
    assert check_file(path) == []
