# Duolynk

**A private room for two.** Duolynk is a real-time couples app where two people share one private room: they chat, play six games built for exactly two players, and keep a record of the time they spend together.

**Live demo:** [https://app-fxsqj999znr5.appmedo.com](https://app-fxsqj999znr5.appmedo.com)

Built for the **Nexconn Build Challenge 2026**, organized by **Nexconn** and **Reskilll**.

---

## Overview

Most social apps are built for groups. Duolynk is built for a pair. A room holds a maximum of two members, is reached with a short room code, and every feature inside it — chat, games, points, achievements — is designed around that single relationship.

Rooms come in two flavours:

| Type | Behaviour |
| --- | --- |
| **Temporary** | Expires automatically after a chosen window (24 hours to 30 days). Ideal for a trip, a week, or a trial run. |
| **Permanent** | No expiry. Stays until a member closes or deletes it. |

A user can belong to **one room at a time**. Creating or joining a second room is blocked until the current one is left or deleted, which keeps the experience focused and prevents accidental duplicate rooms.

## Key Features

### Private rooms
- Six-character room codes with copy-to-clipboard sharing.
- Join by code, with a preview of the room before entering.
- Creator controls: regenerate the code, close the room, or delete it.
- Live member presence and room countdown.

### Real-time chat
- One-to-one messaging powered by the **Nexconn Chat SDK**.
- Text messages, emoji stickers, and image sharing.
- Typing indicators, delivery state, day separators, and message history.
- Chat is intentionally **not stored in the application database** — the Nexconn channel is the source of truth.

### Six games for two
Every game is server-authoritative and synchronised in real time. Both partners see each other's actions, turns, and results as they happen.

| Game | How it plays |
| --- | --- |
| **Who Knows You Better?** | Both answer a question about themselves, then predict the partner's answer. Correct predictions score. |
| **Brain Battle** | The same questions land on both screens. Faster correct answers score more. |
| **This or That?** | Two options, independent choices, simultaneous reveal. Matches score; differences open a conversation. |
| **Two Minds, One Mission** | Each partner receives a different clue. Both must submit the same answer to unlock the next mission. |
| **Tic-Tac-Toe** | Classic board with server-validated turns, win detection, and draws. |
| **Truth or Dare** | One partner picks Truth or Dare, the other writes the prompt, and the first partner answers — all live. |

Games open in the main area of the room, with chat moving to the side panel so gameplay gets maximum space. A **Quit Game** request must be accepted by both partners before a session ends.

### Duo Points and leaderboard
- Points are awarded from game results plus a capped bonus for time actually spent playing.
- A global leaderboard ranks players by points, games played, wins, and win rate.
- Room creators choose at creation time whether the room participates. Rooms that opt out still play normally but never contribute to rankings.

### Progress and achievements
- Per-room stats: points, games played, games won.
- Achievement badges for first plays, champions, and completed missions.
- Recent game history inside each room.

### Subscriptions (coming soon)
The landing page includes a clearly labelled **Subscriptions — Coming Soon** section. No payment flow is implemented and no plan is on sale.

## Technology Stack

| Layer | Technology |
| --- | --- |
| UI | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui (Radix primitives), lucide-react |
| Routing | React Router |
| Backend | Supabase — PostgreSQL, Row Level Security, RPC functions, Realtime, Edge Functions |
| Chat | Nexconn Chat SDK (`@nexconn/chat`, `@nexconn/engine`) |
| Notifications | Sonner |
| Tooling | Biome, TypeScript compiler, Vitest |

### Architecture notes
- **Server-authoritative games.** Game state, turn order, scoring, and round resolution live in PostgreSQL functions. The client never decides a winner.
- **Row Level Security everywhere.** Every table is protected; room data is readable only by its two members.
- **Realtime sync.** Clients subscribe to `rooms`, `room_members`, `room_stats`, `game_sessions`, and `achievements` so both devices converge without polling.
- **Secrets stay server-side.** The Nexconn app secret is used only inside the `nexconn-token` Edge Function; the browser receives a short-lived token.

## Project Structure

```
.
├── public/                  Static assets
├── src/
│   ├── components/
│   │   ├── brand/           Logo and brand marks
│   │   ├── games/           Six game implementations, frame, stage, quit dialog
│   │   ├── landing/         Marketing sections
│   │   ├── layout/          App shell, navigation
│   │   ├── room/            Chat panel, invite panel, progress, games widget
│   │   └── ui/              shadcn/ui primitives
│   ├── contexts/            Auth context
│   ├── db/                  Supabase client
│   ├── lib/                 API layer, chat adapter, formatting, game metadata
│   ├── pages/               Route-level pages
│   └── types/               Shared TypeScript types
├── supabase/
│   └── functions/
│       └── nexconn-token/   Edge Function issuing Nexconn tokens
├── docs/                    Design documentation
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- A Supabase project
- A Nexconn application (App Key and App Secret)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_NEXCONN_APP_KEY=your-nexconn-app-key
VITE_APP_ID=your-app-id
```

### 3. Prepare the database

Apply the SQL migrations in `supabase/migrations` to your Supabase project (via the Supabase CLI or the SQL editor). They create the schema, Row Level Security policies, game content, and the RPC functions used by the client.

### 4. Configure the Edge Function

The `nexconn-token` function requires two server-side secrets:

```bash
supabase secrets set NEXCONN_APP_KEY=your-nexconn-app-key
supabase secrets set NEXCONN_APP_SECRET=your-nexconn-app-secret
```

Deploy it with:

```bash
supabase functions deploy nexconn-token
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided automatically by the Supabase runtime.

### 5. Run locally

```bash
pnpm dev
```

The app is served at `http://localhost:5173`.

### 6. Build for production

```bash
pnpm build
pnpm preview
```

## Environment Variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Client | Supabase anonymous key (safe for the browser; RLS enforces access) |
| `VITE_NEXCONN_APP_KEY` | Client | Nexconn application key used to initialise the chat SDK |
| `VITE_APP_ID` | Client | Application identifier |
| `NEXCONN_APP_KEY` | Edge Function | Nexconn application key used when minting tokens |
| `NEXCONN_APP_SECRET` | Edge Function | Nexconn application secret — **never exposed to the client** |

> No secret, service-role key, or private credential is committed to this repository.

## Integrations

### Supabase
Provides authentication, PostgreSQL storage, Row Level Security, realtime subscriptions, and the RPC layer that drives rooms and games.

### Nexconn
Provides the one-to-one chat channel: message delivery, media upload, typing indicators, and history. Authentication is delegated to the `nexconn-token` Edge Function so the app secret never reaches the browser.

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm build` | Build the production bundle |
| `pnpm preview` | Preview the production build |
| `pnpm lint` | Run Biome checks |
| `pnpm typecheck` | Run the TypeScript compiler without emitting |

## Design Principles

- **Two people, one room.** Every screen assumes exactly two participants.
- **Nothing is faked.** Games resolve on the server; both devices see the same state.
- **Calm, warm interface.** Soft surfaces, restrained accents, and per-game colour themes drawn from each game's artwork.
- **Accessible by default.** Semantic colour tokens, visible focus states, and touch targets sized for mobile.

## License

This project was created for the Nexconn Build Challenge 2026. All rights reserved by the author.
