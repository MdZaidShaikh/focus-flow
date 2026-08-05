from mangum import Mangum
import alembic.config
import alembic.command

from app.main import app

# Run database migrations on cold start
try:
    from sqlalchemy import inspect
    from app.db.session import engine
    
    alembic_cfg = alembic.config.Config("alembic.ini")
    
    # Check if alembic_version table exists; if not, stamp it so it doesn't crash
    inspector = inspect(engine)
    if not inspector.has_table("alembic_version") and inspector.has_table("users"):
        print("Stamping database with initial migration ID...")
        alembic.command.stamp(alembic_cfg, "665bb212118a")
        
    alembic.command.upgrade(alembic_cfg, "head")
except Exception as e:
    print(f"Failed to run database migrations: {e}")

# This is the handler AWS Lambda invokes. API Gateway events are adapted
# into ASGI requests/responses by Mangum, so the same FastAPI app runs
# unchanged locally (uvicorn) and on Lambda.
handler = Mangum(app)
