from sqlmodel import Session, create_engine, select

from app import crud
from app.core.config import settings
from app.core.seed_professionals import seed_professionals
from app.core.seed_reviews import seed_reviews
from app.models import User, UserCreate
from app.seed_glossary import seed_glossary
from app.seed_laws import seed_laws

# Pool sizing assumptions (verify in Neon dashboard before scaling):
#   - Neon pgBouncer mode: session pooling (Neon default for Direct connections).
#     In session mode each SQLAlchemy connection maps 1:1 to a pgBouncer slot.
#     In transaction mode the ceiling would be lower — switch to transaction mode
#     for higher concurrency, but PreparedStatement support is disabled.
#   - Neon Starter tier: 100 max connections via pgBouncer.
#   - Effective max per deployment = (_POOL_SIZE + _POOL_MAX_OVERFLOW) * WEB_CONCURRENCY * max_replicas
#     With WEB_CONCURRENCY=2 and max_replicas=2: (3+5)*2*2 = 32 connections (32% of Starter limit).
_POOL_SIZE = 3
_POOL_MAX_OVERFLOW = 5
_POOL_TIMEOUT_SECONDS = 30
_POOL_RECYCLE_SECONDS = 1800

engine = create_engine(
    str(settings.SQLALCHEMY_DATABASE_URI),
    pool_size=_POOL_SIZE,
    max_overflow=_POOL_MAX_OVERFLOW,
    pool_timeout=_POOL_TIMEOUT_SECONDS,
    pool_pre_ping=True,  # validates connections before use; recovers after DB restarts
    pool_recycle=_POOL_RECYCLE_SECONDS,  # evict connections every 30 min before Azure drops them
    # Enforce a per-statement wall-clock limit so runaway queries cannot hold a
    # pool slot indefinitely.  PostgreSQL cancels the query and raises
    # QueryCanceled; SQLAlchemy surfaces this as OperationalError which deps.py
    # converts to HTTP 504.
    connect_args={
        "options": f"-c statement_timeout={settings.DB_STATEMENT_TIMEOUT_MS}"
    },
)


# make sure all SQLModel models are imported (app.models) before initializing DB
# otherwise, SQLModel might fail to initialize relationships properly
# for more details: https://github.com/fastapi/full-stack-fastapi-template/issues/28


def init_db(session: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next lines
    # from sqlmodel import SQLModel

    # This works because the models are already imported and registered from app.models
    # SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(User).where(User.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
        )
        user = crud.create_user(session=session, user_create=user_in)
        user.onboarding_completed = True
        user.email_verified = True
        session.add(user)
        session.commit()

    seed_laws(session)
    seed_professionals(session)
    seed_reviews(session)
    seed_glossary(session)


def get_pool_stats() -> dict[str, int]:
    """Return current DB connection pool statistics.

    Use in admin endpoints and startup logging to surface pool pressure
    before it becomes a service-degrading pool exhaustion event.
    """
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "max_overflow": _POOL_MAX_OVERFLOW,
        # Per-process cap: pool_size + max_overflow per worker process.
        # pool.checkedout() tracks this process's connections against the same limit.
        "effective_max_per_worker": _POOL_SIZE + _POOL_MAX_OVERFLOW,
        "checked_out": pool.checkedout(),
        "checked_in": pool.checkedin(),
        "overflow": pool.overflow(),
    }
