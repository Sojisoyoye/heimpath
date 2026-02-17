from fastapi import APIRouter

from app.api.routes import (
    auth,
    calculators,
    dashboard,
    documents,
    financing,
    items,
    journeys,
    laws,
    login,
    private,
    subscriptions,
    translations,
    users,
    utils,
)
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(journeys.router)
api_router.include_router(subscriptions.router)
api_router.include_router(laws.router)
api_router.include_router(translations.router)
api_router.include_router(documents.router)
api_router.include_router(calculators.router)
api_router.include_router(financing.router)
api_router.include_router(dashboard.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
