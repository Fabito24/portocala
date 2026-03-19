# portocala

A lightweight Flappy Bird clone built with Vite and React.

## Project Structure

- `flappy-bird/` - main game app
  - `src/` - React components and styles
  - `public/` - static assets
  - `package.json` - dependencies and scripts

## Setup

1. Open terminal in `flappy-bird/`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```
4. Open the local URL shown (usually `http://localhost:5173`).

## How to play (Multiplayer)

- Press `Space` / `Up Arrow` (or click/tap) to make your bird flap upward.
- Each player tries to keep their own bird alive through the pipes.
- Avoid collisions and ground contact; the last surviving bird wins.
- Try to survive as long as possible and beat your high score.

## Quick workflow

- Edit game code in `flappy-bird/src/FlappyBirdGame.jsx` and `flappy-bird/src/App.jsx`.
- Refresh browser to see updates.

## Notes

- Keep changes simple and use React state/effects for game updates.
- If dev server fails, check terminal for errors and fix missing imports or syntax issues.
