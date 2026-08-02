# FocusFlow AI — Frontend

The Next.js user interface for the FocusFlow application. It manages the user flow from raw input to task breakdown, visual Pomodoro scheduling, and RAG-powered insights.

## 🏗️ Deep Architecture

The frontend is built with **Next.js (React)**, utilizing modern React hooks for state management and **Tailwind CSS** for rapid, consistent styling.

### 1. The Timeline Engine
The signature UI element of FocusFlow is the **Timeline** (`components/Timeline.tsx`). Instead of rendering a standard calendar grid, it parses the Pomodoro blocks and renders them as one continuous horizontal strip. The width of each block is mathematically proportional to its duration (e.g., a 25-minute focus block is 5x wider than a 5-minute break block). Completed blocks visually dim, allowing the shape of the day to stay visible as the user progresses.

### 2. Authentication & State
We use **AWS Amplify** (`AmplifyProvider.tsx`) to integrate with AWS Cognito. 
- The user logs in via a hosted UI or custom form.
- Amplify retrieves a secure JWT (JSON Web Token).
- This JWT is automatically attached to the `Authorization: Bearer <token>` header of every outgoing fetch request in `lib/api.ts`.
- *Current State Constraint:* Currently, the session data relies heavily on React state. Refreshing the browser loses the current active session in the UI, though it remains safely persisted in the backend database.

### 3. Styling & Theming
Instead of raw hex values scattered throughout components, the entire color palette (e.g., `work`, `rest`, `ink`, `muted`) is defined in `tailwind.config.ts`. This token-based design system allows for instant re-theming without component changes.

---

## 🛠️ Setup Instructions

### Local Development Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   By default, `NEXT_PUBLIC_API_URL` points to `http://localhost:8000`. Leave this if you are running the FastAPI backend locally via Docker/uvicorn.

3. **Start the Development Server:**
   *Note: Ensure the backend is running first, or the frontend will have no API to communicate with.*
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` in your browser.

### Production Deployment (Vercel)

FocusFlow's frontend is optimized for zero-config deployment on Vercel.

1. **Connect to Vercel:** Import your GitHub repository into Vercel.
2. **Environment Variables:** In the Vercel dashboard, add the `NEXT_PUBLIC_API_URL` environment variable and point it to your AWS API Gateway endpoint (e.g., `https://abcdefg.execute-api.us-east-2.amazonaws.com`).
3. **Deploy:** Vercel will automatically build (`next build`) and deploy the application to the Edge network. Every subsequent `git push` to the `main` branch will trigger an automatic production deployment.
