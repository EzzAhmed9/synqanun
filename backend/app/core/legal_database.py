from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

legal_engine = create_engine(
    settings.LEGAL_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

LegalSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=legal_engine)

LegalBase = declarative_base()

def get_legal_db():
    db = LegalSessionLocal()
    try:
        yield db
    finally:
        db.close()
