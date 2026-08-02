# FocusFlow AI — Backend

The engine room of FocusFlow. It handles task breakdown via Gemini, mathematical Pomodoro packing, and RAG-powered vector similarity search using `pgvector`.

## 🏗️ Deep Architecture

The backend is written in **Python (FastAPI)** and uses **SQLAlchemy** for database ORM.

### 1. The RAG Pipeline (`pgvector` & Gemini)
When a session is completed, `llm_service.py` sends the raw tasks to Gemini to generate a 3,072-dimensional Embedding Vector representing the semantic meaning of that work session. We store this vector natively in PostgreSQL using the `pgvector` extension.
When the user asks for insights, `rag_service.py` converts their query into a vector, calculates the Cosine Distance directly in SQL against past sessions, and feeds the closest matching sessions back into Gemini to synthesize an answer.

### 2. Algorithmic Pomodoro Scheduling
While task breakdown is handled by AI (using Pydantic Structured Outputs to enforce JSON conformity), the actual Pomodoro scheduling (`scheduler_service.py`) is intentionally done via strict Python algorithms. This guarantees mathematical precision when packing 25-minute focus blocks and 5-minute breaks into a rigid time window (e.g., 9:00 AM to 5:00 PM), preventing the AI from hallucinating invalid times.

### 3. Serverless Execution (AWS Lambda)
To scale perfectly while minimizing cost, the API does not run on a dedicated server. We use **Mangum** (`lambda_handler.py`) to wrap the FastAPI application into an AWS Lambda-compatible format. When an HTTP request hits AWS API Gateway, it wakes up the Lambda function, processes the request, and spins back down.

---

## 🛠️ Setup Instructions

### Local Development Setup (Windows / PowerShell)

1. **Start PostgreSQL with pgvector (via Docker)**
   ```bash
   docker run -d --name focusflow-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=focusflow -p 5432:5432 pgvector/pgvector:pg16
   ```

2. **Python Environment Setup**
   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**
   Copy `.env.example` to `.env` and fill in your Gemini API key and local Database URL:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/focusflow
   GEMINI_API_KEY=your_key_here
   ```

4. **Initialize Database Tables**
   Run Alembic migrations to enable `pgvector` and create the schema:
   ```bash
   alembic upgrade head
   ```
   *(Note: You must manually insert a placeholder user into the database for foreign key constraints if auth is stubbed).*

5. **Run the API**
   ```bash
   python -m uvicorn app.main:app --reload
   ```
   Visit `http://localhost:8000/docs` to test endpoints directly via Swagger UI.

---

### Production Deployment (AWS)

FocusFlow Backend is deployed to AWS Lambda via Docker container images to avoid the 250MB Lambda size limit.

1. **AWS Infrastructure**
   - Provision an **AWS RDS PostgreSQL** instance and execute `CREATE EXTENSION vector;`.
   - Setup an **AWS Cognito User Pool** for authentication.

2. **CI/CD Deployment**
   The `.github/workflows/deploy.yml` automates the entire deployment:
   - Authenticates with AWS using IAM credentials.
   - Builds the Python application into a Docker image using the provided `Dockerfile`.
   - Pushes the image to **Amazon ECR** (Elastic Container Registry).
   - Triggers an update to the **AWS Lambda** function to pull the latest image.

3. **API Gateway configuration**
   Ensure an HTTP API Gateway is attached to your Lambda function and CORS is enabled to allow frontend communication. Our FastAPI `main.py` includes path-stripping middleware (`rewrite_default_path`) to gracefully handle the `/default` stage prefix injected by API Gateway.
