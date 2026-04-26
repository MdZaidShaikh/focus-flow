# FocusFlow AI — backend

Task breakdown + Pomodoro scheduling, with RAG-powered insights over past sessions.

## Structure

```
app/
  main.py                  FastAPI app, wires up routers
  core/config.py           Settings (env vars via pydantic-settings)
  db/session.py            SQLAlchemy engine + get_db dependency
  models/db_models.py       ORM models: User, Session, Task, PomodoroBlock, SessionEmbedding
  schemas/schemas.py        Pydantic request/response models
  services/
    llm_service.py         Gemini calls: structured-output breakdown, embeddings, insight synthesis
    scheduler_service.py   Plain-Python pomodoro packing (no LLM — deliberate)
    rag_service.py         pgvector similarity search + embedding storage
  api/routes/
    sessions.py            POST /sessions, /breakdown, /schedule, PATCH /blocks/{id}, /complete
    insights.py            GET /insights — the RAG endpoint
lambda_handler.py           Mangum adapter — same app runs on Lambda or locally
Dockerfile                  Lambda container image build
requirements.txt
.env.example
```

## Prerequisites

- Python 3.11+
- Docker Desktop (WSL2 backend) — for local Postgres
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com) (separate from any Gemini Advanced/Pro consumer subscription — the API is billed independently)

## Local setup (Windows / PowerShell)

**1. Create a virtual environment and install dependencies**

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**2. Start Postgres with pgvector**

```
docker run -d --name focusflow-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=focusflow -p 5432:5432 pgvector/pgvector:pg16
```

Verify it's up: `docker ps` should show `focusflow-db` with status "Up".

If you ever hit `password authentication failed` after re-running this command, it means a stale data volume from a previous attempt is still around. Wipe it and start clean:
```
docker rm -f focusflow-db
docker volume prune
```
then re-run the `docker run` command above.

**3. Set up your `.env` file**

```
copy .env.example .env
```

Edit `.env` and fill in:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/focusflow
GEMINI_API_KEY=<your real key>
```

Note the username is `postgres` (the default user Docker creates), not `focusflow` — a mismatch here is the most common cause of connection errors.

If `.env.example` doesn't show up in Windows Explorer, use `dir -Force` in PowerShell instead — Explorer sometimes hides dotfiles. If creating `.env` manually in Notepad, wrap the filename in quotes (`".env"`) in the Save As dialog with "Save as type" set to "All Files," or Windows will silently append `.txt`.

**4. Enable pgvector and create tables**

```
docker exec -it focusflow-db psql -U postgres -d focusflow -c "CREATE EXTENSION IF NOT EXISTS vector;"
python -c "from app.db.session import Base, engine; from app.models import db_models; Base.metadata.create_all(engine)"
```

Verify: `docker exec -it focusflow-db psql -U postgres -d focusflow -c "\dt"` should list `users`, `sessions`, `tasks`, `pomodoro_blocks`, `session_embeddings`.

**5. Insert a placeholder user**

Auth isn't wired up yet (see "What's stubbed" below), so `sessions.py` uses a hardcoded `PLACEHOLDER_USER_ID`. A matching row must exist in `users` or session creation will fail on the foreign key:

```
docker exec -it focusflow-db psql -U postgres -d focusflow -c "INSERT INTO users (id, cognito_sub, email) VALUES ('00000000-0000-0000-0000-000000000000', 'placeholder-sub', 'placeholder@example.com');"
```

**6. Run the app**

```bash
python -m uvicorn app.main:app --reload
```

Visit `http://localhost:8000/docs` for the interactive Swagger UI.

## Testing the full flow

Run these in order from the Swagger UI (`/docs`):

1. `GET /health` → confirms the app boots.
2. `POST /sessions` → creates a session, returns a `session_id`.
   ```json
   {
     "raw_input": "Finish job applications for the week, review DSA notes, prep for an interview",
     "day_start": "2026-07-08T09:00:00",
     "day_end": "2026-07-08T17:00:00"
   }
   ```
3. `POST /sessions/{session_id}/breakdown` → calls Gemini, generates subtasks. Safe to re-run — it replaces the previous breakdown rather than appending to it.
4. `POST /sessions/{session_id}/schedule` → packs subtasks into Pomodoro blocks. Also safe to re-run.
5. (optional) `PATCH /sessions/blocks/{block_id}` with `{"completed": true}` on a few blocks — use the block's own `id` column, not `task_id`. Find block IDs with:
   ```
   docker exec -it focusflow-db psql -U postgres -d focusflow -c "SELECT id, task_id, is_break FROM pomodoro_blocks WHERE session_id = '<your session_id>' LIMIT 5;"
   ```
6. `POST /sessions/{session_id}/complete` → summarizes the session and stores its embedding.
7. `GET /insights?query=...` → retrieves similar past sessions via pgvector and asks Gemini to synthesize a pattern. With only one completed session, expect a fairly thin answer ("not enough data yet") — this is correct behavior, not a bug. RAG needs a few sessions with actual variation (some `actual_pomodoros` values different from `estimated_pomodoros`) before it has a real pattern to surface.

## Known notes and gotchas

- **Gemini responses aren't deterministic by default** — re-running `/breakdown` on identical input can produce different phrasing and estimates. Expected behavior. Set `temperature=0` in the `interactions.create` call in `llm_service.py` if you want reproducible output for a demo.
- **Embeddings are stored at full 3072 dimensions** (`gemini-embedding-001`'s native output), matching `Vector(3072)` in `db_models.py`. This was previously truncated to 768 via `output_dimensionality` for a smaller/faster index — a reasonable alternative if you want to optimize for storage/query speed over full fidelity later.

## What's stubbed / not yet wired up

- **Auth**: `PLACEHOLDER_USER_ID` in `sessions.py` stands in for a real Cognito JWT decode. Add a dependency that verifies the token (via `python-jose` and the Cognito JWKS endpoint) and extracts the `sub` claim.
- **Alembic migrations**: tables are created directly via `create_all` for now. Any schema change currently means manually dropping and recreating the affected table(s) — add Alembic before this goes anywhere near real data.
- **CI/CD**: GitHub Actions workflow (lint/test → build image → push to ECR → update Lambda) is the next piece to add.
- **Frontend**: currently tested entirely through Swagger (`/docs`) — no Next.js UI yet.

## Deploying to Lambda

Build and push the Docker image to ECR, then point a Lambda function (container image type) at it, with `lambda_handler.handler` as the entrypoint. Put the Lambda behind API Gateway (HTTP API is cheaper than REST API for this use case) and attach a Cognito authorizer once auth is wired up on the frontend.
