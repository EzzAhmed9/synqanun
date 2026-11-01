from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, clients, matters, billing, legal_db, documents

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SynQanun Suite — Bilingual (EN/AR) Legal-Tech Platform Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
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

@app.get("/")
def root():
    return {
        "project": "SynQanun Suite Backend",
        "status": "online",
        "docs": "/docs",
        "api": "/api"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "database": "connected"}
