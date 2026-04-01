# FocusFlow

FocusFlow is a task breakdown and Pomodoro scheduling app with AI-generated breakdowns, scheduled work blocks, and insights from past sessions.

## Backend

[focusflow-backend](focusflow-backend) contains the FastAPI service that handles session creation, task breakdowns, Pomodoro scheduling, and insight generation. It includes:

- `app/main.py` for the FastAPI entrypoint and route wiring
- `app/api/routes/` for session and insights endpoints
- `app/services/` for LLM, scheduling, and RAG logic
- `app/models/` and `app/schemas/` for database models and request/response shapes
- `lambda_handler.py`, `Dockerfile`, and dependency files for local and Lambda deployment

## Frontend

[focusflow-frontend](focusflow-frontend) contains the Next.js UI for the full workflow. It includes:

- `app/page.tsx` for the main flow: input, breakdown, schedule, timeline, and insights
- `app/layout.tsx` and `app/globals.css` for the app shell, fonts, and base styling
- `components/Timeline.tsx` for the day view rendered as proportional blocks
- `lib/api.ts` for typed requests to the backend API
