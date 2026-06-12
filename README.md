# Random Pair Picker

A simple Next.js app for randomly matching people from Group A with people from Group B.

## Features

- Single-page Next.js + React app
- One-time matching with no repeats
- Spin-style Group B picker animation
- Undo last match
- CSV export
- State saved in `localStorage`
- Deploys to Vercel

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:

   ```bash
   npm run dev
   ```

3. Open the app in your browser:

   ```bash
   http://localhost:3000
   ```

## Local Run

- `npm run dev` starts the app in development mode
- `npm run build` creates a production build
- `npm run start` runs the production server after a build

## Vercel Deployment

1. Push this project to a Git repository.
2. Import the repository into Vercel.
3. Keep the default Next.js framework preset.
4. Deploy.

No backend or database is required.

## CSV Export

The exported file is named `random-pair-matches.csv` and includes:

- `Number`
- `Group A`
- `Group B`
