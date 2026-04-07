# FocusFlow AI — frontend

Next.js UI for the task breakdown + Pomodoro scheduling flow.

## Structure

```
app/
  layout.tsx       Root layout, loads fonts (Fraunces / Space Grotesk / IBM Plex Mono)
  page.tsx         The whole flow: input → breakdown → schedule → timeline → insights
  globals.css      Tailwind + base styles
components/
  Timeline.tsx     The day rendered as one continuous strip of proportional blocks
lib/
  api.ts           Typed fetch wrapper around the FastAPI backend
```

## Setup

1. `npm install`
2. `cp .env.local.example .env.local` — defaults to `http://localhost:8000`, change if your backend runs elsewhere.
3. Make sure the backend is running first (`uvicorn app.main:app --reload` in the backend project) — the frontend has nothing to talk to otherwise.
4. `npm run dev`
5. Visit `http://localhost:3000`

## Design notes

The signature element is the **Timeline** — the whole day as one horizontal strip, each block's width proportional to its actual duration, rather than a calendar grid. Amber blocks are focus time, teal are breaks; completed blocks dim rather than disappear, so the shape of the day stays visible even as it fills in.

Palette and type choices are defined as Tailwind tokens in `tailwind.config.js` (`work`, `rest`, `ink`, `muted`, etc.) rather than raw hex values scattered through components — change them there if you want to retheme.

## Known limitation

There's no persistence between browser sessions — refreshing the page loses your current session's state (though the data itself is safely stored in Postgres, since every action calls the real API). Wiring up "load my most recent session on page load" would be a natural next step if you want the demo to survive refreshes.
