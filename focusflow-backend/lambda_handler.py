from mangum import Mangum
import alembic.config
import alembic.command

from app.main import app

# Run database migrations on cold start
try:
    alembic_cfg = alembic.config.Config("alembic.ini")
    alembic.command.upgrade(alembic_cfg, "head")
except Exception as e:
    print(f"Failed to run database migrations: {e}")

# This is the handler AWS Lambda invokes. API Gateway events are adapted
# into ASGI requests/responses by Mangum, so the same FastAPI app runs
# unchanged locally (uvicorn) and on Lambda.
handler = Mangum(app)
