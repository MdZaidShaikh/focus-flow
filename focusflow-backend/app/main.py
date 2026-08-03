from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import sessions, insights
from app.db.session import SessionLocal
from app.models import db_models

PLACEHOLDER_USER_ID = "00000000-0000-0000-0000-000000000000"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables are now managed by Alembic migrations
    try:
        db = SessionLocal()
        try:
            existing_user = (
                db.query(db_models.User)
                .filter(db_models.User.id == PLACEHOLDER_USER_ID)
                .first()
            )
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
    allow_origins=["*"],  # TODO: Restrict to your Vercel domain once deployed
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    import traceback
    with open("error.log", "a") as f:
        f.write(f"\\n--- Exception at {request.url} ---\\n")
        traceback.print_exc(file=f)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.middleware("http")
async def rewrite_default_path(request: Request, call_next):
    """
    AWS API Gateway sometimes leaves the stage name (e.g. /default) in the
    request path. FastAPI expects the pure path (e.g. /health).
    This middleware transparently strips /default if it exists.
    """
    path = request.scope.get("path", "")
    if path.startswith("/default"):
        request.scope["path"] = path[8:] or "/"
    return await call_next(request)


app.include_router(sessions.router)
app.include_router(insights.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
