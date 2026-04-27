from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import sessions, insights
from app.db.session import Base, SessionLocal, engine
from app.models import db_models

PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables are now managed by Alembic migrations
    try:
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

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Without this, unhandled exceptions bypass CORSMiddleware entirely —
    Starlette's default error response is generated above the CORS layer,
    so the browser sees a response with no Access-Control-Allow-Origin
    header and blocks it, surfacing as a confusing 'Failed to fetch' in
    the frontend instead of the real error. This handler runs at a layer
    where CORS headers still get attached, and returns the real error
    message so the frontend (and you) can actually see what went wrong.
    """
    return JSONResponse(status_code=500, content={"detail": str(exc)})


app.include_router(sessions.router)
app.include_router(insights.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
