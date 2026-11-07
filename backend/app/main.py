from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, clients, matters, billing, legal_db, documents, integrations, users, onlyoffice

is_prod = settings.ENVIRONMENT.lower() == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SynQanun Suite — Bilingual (EN/AR) Legal-Tech Platform Backend",
    version="1.0.0",
    docs_url=None if is_prod else "/docs",
    redoc_url=None if is_prod else "/redoc",
    openapi_url=None if is_prod else "/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(clients.router, prefix=settings.API_V1_STR)
app.include_router(matters.router, prefix=settings.API_V1_STR)
app.include_router(matters.client_router, prefix=settings.API_V1_STR)
app.include_router(billing.router, prefix=settings.API_V1_STR)
app.include_router(billing.client_router, prefix=settings.API_V1_STR)
app.include_router(legal_db.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(documents.client_router, prefix=settings.API_V1_STR)
app.include_router(documents.public_download_router, prefix=settings.API_V1_STR)
app.include_router(integrations.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(onlyoffice.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": "SynQanun Suite Backend",
        "status": "online",
        "docs": None if is_prod else "/docs",
        "api": "/api"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "database": "connected"}
