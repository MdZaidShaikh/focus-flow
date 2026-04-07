from mangum import Mangum

from app.main import app

# This is the handler AWS Lambda invokes. API Gateway events are adapted
# into ASGI requests/responses by Mangum, so the same FastAPI app runs
# unchanged locally (uvicorn) and on Lambda.
handler = Mangum(app)
