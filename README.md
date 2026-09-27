# Loan Management System — Frontend

Operations workspace for borrowers, grades, and loan product configuration.

## Requirements

- Node.js 20 or newer
- The loan management API running locally (default `http://localhost:3000`)

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

The app is served at `http://localhost:5173`. Set `VITE_API_BASE_URL` in `.env` if the API is not at `http://localhost:3000/api`.

## Scripts

- `npm run dev` — development server
- `npm run typecheck` — TypeScript project check
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm run build` — typecheck and production build
