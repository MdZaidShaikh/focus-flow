from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import sessions, insights
from app.db.session import Base, SessionLocal, engine
from app.models import db_models

PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables and a placeholder user on startup so the app is usable
    # immediately after a local database is available.
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            existing_user = db.query(db_models.User).filter(db_models.User.id == PLACEHOLDER_USER_ID).first()
            if not existing_user:
                db.add(
                    db_models.User(
                        id=PLACEHOLDER_USER_ID,
                        cognito_sub="placeholder-sub",
                        email="placeholder@example.com",
                    )
                )
                db.commit()
        finally:
            db.close()
    except Exception as exc:  # pragma: no cover - defensive startup path
        print(f"Startup database initialization skipped: {exc}")

    yield


app = FastAPI(
    title="FocusFlow AI",
    description="Task breakdown + Pomodoro scheduling with RAG-powered insights",
    version="0.1.0",
    lifespan=lifespan,
)

# Allows the Next.js dev server to call this API across origins. Tighten
# allow_origins to your actual deployed frontend URL before going to prod.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(sessions.router)
# app.include_router(insights.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
