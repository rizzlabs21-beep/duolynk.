# Requirements Document

## 1. Application Overview

### 1.1 Application Name
DUOLYNK (Nextlex)

### 1.2 Application Description
DUOLYNK is a synchronized web application designed for two partners to share a private digital space. Partners communicate through real-time messaging and participate in six interactive multiplayer games. This release updates the desktop room layout to a fixed-viewport design with an independently scrollable games widget, optimizes mobile responsiveness across all views, introduces a persistent back-to-chat navigation pattern with preserved game state, and enhances chat capabilities with typing indicators, presence, media sharing, and stickers.

---

## 2. User & Usage Scenarios

### 2.1 Target Users
- Couples and long-distance partners seeking a dedicated, private space for messaging and collaborative games.
- Users accessing the platform across desktop, laptop, tablet, and mobile devices.

### 2.2 Core Usage Scenarios
- **Fixed-Screen Desktop Collaboration**: On desktop, users interact within a fixed-height room dashboard featuring a prominent central chat and an independently scrollable games widget on the right side without full-page scrolling.
- **Game Launch & Chat Coexistence**: Launching a game expands the game board into the primary workspace while smoothly shifting the chat into an accessible side panel on desktop, or switching to a full game view with a visible \"Back to Chat\" button on mobile.
- **Enhanced Messaging**: Partners exchange text, media, and stickers while seeing real-time typing indicators and online/last-seen presence status.
- **Mobile Room Experience**: Users on mobile devices seamlessly toggle between full-screen chat and interactive games without layout overflows or broken touches.

---

## 3. Page Structure & Functional Specifications

### 3.1 Page Hierarchy
```
DUOLYNK Web Application
|-- Public Landing Page (/)
|-- Authentication
|   |-- Sign In Page (/signin)
|   `-- Sign Up Page (/signup)
|-- Dashboard (/dashboard)
|-- Room Setup & Management
|   |-- Create Room Modal / Page (/room/create)
|   `-- Join Room Page (/room/join)
`-- Active Room Session (/room/:roomId)
    |-- Top Header (Room Code, Partner Status, Room Lifecycle Actions)
    |-- Desktop Main Workspace (Dynamic Toggle: Primary Chat View <-> Active Game Board)
    |-- Desktop Right Panel (Independently Scrollable Games Widget / Compact Chat Panel)
    `-- Mobile Room Container (Full-screen Chat View <-> Full-screen Game View with Back-to-Chat)
```

### 3.2 Public Landing Page (/)
- **Top Navigation Bar**: Brand logo, navigation pills (Home, Games, Leaderboard, Rewards, About), Sign In button, and Get Started button.
- **Hero Section**: Warm background palette with organic accents, descriptive badge, main headline \"Turn Distance into Togetherness\", primary \"Start Your Journey\" action, and couple illustration (`https://miaoda-conversation-file.s3cdn.medo.dev/user-fxshglounmkg/app-fxsqj999znr5/20261121/DUOLYNK_exact_hero_art_crop.png`).
- **Feature Showcase & Metrics**: Four game preview cards and bottom statistics strip (\"10K+ Happy Couples\", \"4.9/5 Love it!\").

### 3.3 Authentication & Room Setup Pages (/signin, /signup, /dashboard, /room/create, /room/join)
- **Sign In / Sign Up**: Account registration and session login with validation.
- **Dashboard**: User room overview, room creation triggers, and join-by-code entry.
- **Room Create / Join**: Generate or validate unique room codes with a strict 2-participant capacity limit.

### 3.4 Active Room Session (/room/:roomId)

#### 3.4.1 Desktop Room Layout & Behavior
- **Fixed Viewport Architecture**: Page-level vertical scrolling is disabled on desktop screens. The interface occupies exactly 100% of the viewport height.
- **Top Bar**: Displays the active Room Code prominently, online/last-seen presence status of the partner, and room controls (Close / Delete).
- **Dual-Pane Layout (Default Chat Mode)**:
  - **Main Left/Center Area**: Large, prominent real-time chat interface occupying the majority of the screen space.
  - **Right Side Panel (Games Widget)**: Dedicated games catalog widget. Only this widget scrolls vertically to accommodate all game cards while the rest of the page remains fixed.
- **Dual-Pane Layout (Active Game Mode)**:
  - When a game is launched, bidirectional transition animations (left-to-right / right-to-left) shift the active game board into the main central workspace.
  - The chat interface shrinks into an accessible side panel, allowing ongoing conversation during gameplay.
  - A prominent \"Back to Chat\" button on the game interface allows restoring chat to the primary focus without losing current game progress.
- **Branding Preservation**: Retains existing application logo, font boldness, typography hierarchy, and core color palette.

#### 3.4.2 Mobile & Responsive Optimization
- **Mobile Adaptation**: Fully responsive layouts across mobile phones and tablets, eliminating horizontal overflow, overlapping buttons, and broken tap targets.
- **View Switching**: When a game is selected on mobile, it opens in full-screen focus with a persistent, high-visibility \"Back to Chat\" button positioned at the top header.
- **State Persistence**: Switching between mobile chat view and game view maintains active game session state and input progress.

#### 3.4.3 Enhanced Chat Features
- **Typing Indicator**: Real-time visual indicator displaying \"Partner is typing...\" when the other participant enters text.
- **Online & Last-Seen Status**: Real-time presence indicator showing whether the partner is currently connected or their last-seen timestamp.
- **Media Sharing**: Ability to send and receive image/media files directly within the message stream.
- **Sticker Support**: Integrated sticker picker and display for expressive couple interactions.
- **Core Messaging**: Text input, timestamps, delivery indicators, and distinct bubble styling for sender and receiver.

#### 3.4.4 Games Widget & 6 Synchronized Games
- **Games Widget**: Visual cards for all six games with titles, icons, and one-click launch triggers, supporting smooth internal scrolling.
- **Game 1: Tic-Tac-Toe**: Turn-based 3x3 interactive board with synchronized moves, turn timer, and score tracker.
- **Game 2: Who Knows You Better?**: Dual-phase response submission and guessing rounds with compatibility scoring.
- **Game 3: Brain Battle**: Synchronized trivia challenge with live countdown timer and score comparison.
- **Game 4: This or That?**: Binary preference voting with simultaneous reveal and match rate calculation.
- **Game 5: Two Minds, One Mission**: Cooperative clue-sharing puzzles requiring dual-partner inputs.
- **Game 6: Truth or Dare for Couples**: Category selection (Romantic, Playful, Deep, Daring), synchronized card flip, and turn completion tracking.

---

## 4. Business Rules & Core Logic

### 4.1 Room Membership & Isolation
- Strictly capped at two authenticated users per room. Additional join attempts are blocked.
- All messages, presence events, and game state updates are isolated to the two connected room members.

### 4.2 Layout State & Navigation Rules
- On desktop, page-level scroll is locked (`overflow: hidden` on container); scrollbars are restricted exclusively to message lists and the right-hand games widget.
- Selecting a game smoothly transitions the game board to the primary area and compresses the chat into the companion side view.
- Clicking \"Back to Chat\" reverses the layout priority without terminating or resetting the active game state unless the game round is explicitly closed by a player.

### 4.3 Chat Real-Time State Rules
- Typing indicator activates upon user keystrokes in the message composer and automatically clears after 3 seconds of inactivity or upon message send.
- Presence status updates reactively upon room connection, disconnection, or window focus changes.

---

## 5. Exceptions & Edge Cases

| Scenario | Trigger Condition | System Behavior |
| :--- | :--- | :--- |
| Navigation During Active Game | User clicks \"Back to Chat\" mid-game | Switch view back to chat focus while keeping game state active in memory; display resume badge on the games widget. |
| Small Screen Horizontal Overflow | Mobile browser rendered on narrow viewport | Apply responsive stacking and fluid widths; prevent horizontal scrollbars on all screens. |
| Disconnected Partner During Game | Partner loses network connection during active match | Display partner reconnecting banner; hold game state for reconnection before forfeiting round. |
| Closed Room Access | Participant accesses a closed room | Show read-only message history; disable message composer and game launching. |
| Third Participant Entry | Third user enters valid room code | Display room full notification (maximum 2 participants) and deny entry. |

---

## 6. Acceptance Criteria

1. On desktop screens, the room dashboard features a fixed viewport layout with no whole-page vertical scroll, displaying the room code at the top, a prominent chat area, and an independently scrollable games widget on the right.
2. Existing application branding, logo, font boldness, and color theme are strictly preserved.
3. Launching any of the six games on desktop moves the game to the primary workspace with smooth bidirectional transition animations while keeping the chat accessible in a side panel.
4. Every game screen on both desktop and mobile displays a visible, fully functional \"Back to Chat\" button that preserves active game state when navigating.
5. On mobile devices, pages, navigation, chat, and games render without layout overlaps, clipping, or horizontal scrolling issues.
6. The chat module supports real-time typing indicators (\"Partner is typing...\"), partner online/last-seen status, media file sending, and sticker selection.
7. All six multiplayer games (Tic-Tac-Toe, Who Knows You Better, Brain Battle, This or That, Two Minds One Mission, and Truth or Dare) operate with real-time state synchronization between both room participants.
8. Room access strictly enforces a maximum capacity of two participants.

---

## 7. Out of Scope for Current Release

- Voice and video calling capabilities.
- Video streaming feeds or shared video reels.
- Multi-couple or group rooms exceeding two users.
- Global matchmaking or public user directories.