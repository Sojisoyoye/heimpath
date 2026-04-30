"""CLI entrypoint for management commands.

Usage:
    python -m app.cli send-weekly-digest
"""

import logging
import sys

from sqlmodel import Session

from app.core.db import engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def send_weekly_digest() -> None:
    """Create a DB session and dispatch weekly digest emails."""
    from app.services import digest_service

    with Session(engine) as session:
        count = digest_service.send_weekly_digest(session)
        logger.info("Done — %d digest emails sent.", count)


def send_deadline_reminders() -> None:
    """Create a DB session and fire journey deadline reminder notifications."""
    from app.services import deadline_service

    with Session(engine) as session:
        count = deadline_service.send_deadline_reminders(session)
        logger.info("Done — %d deadline reminders sent.", count)


def main() -> None:
    commands = {
        "send-weekly-digest": send_weekly_digest,
        "send-deadline-reminders": send_deadline_reminders,
    }

    if len(sys.argv) < 2 or sys.argv[1] not in commands:
        available = ", ".join(commands)
        logger.error("Usage: python -m app.cli <command>")
        logger.error("Available commands: %s", available)
        sys.exit(1)

    commands[sys.argv[1]]()


if __name__ == "__main__":
    main()
