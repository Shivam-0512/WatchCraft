# WATCHCRAFT — COMPLETE SOURCE-CODE DEEP DIVE, ENGINEERING DOCUMENTATION & INTERVIEW PREPARATION GUIDE

> **Author & Architect Reference**: Shivam (WatchCraft Project)  
> **Document Type**: Comprehensive Engineering Specification, Architectural Deep Dive & Senior Technical Interview Preparation Guide  
> **Target Audience**: Internship Technical Interviewers, System Architects, Senior Full-Stack Engineers  
> **Version**: 1.0.0 (Production Verified)  
> **Repository Ground Truth**: `Shivam-0512/WatchCraft`

---

## TABLE OF CONTENTS

0. [WatchCraft in Simple Terms (The Plain-English Mental Model & Analogies)](#0-watchcraft-in-simple-terms-the-plain-english-mental-model--analogies)
1. [Executive Summary & Project Overview](#1-executive-summary--project-overview)
2. [High-Level Architecture & End-to-End System Topology](#2-high-level-architecture--end-to-end-system-topology)
3. [Technology Stack Deep Dive (Why & How Each Library Is Used)](#3-technology-stack-deep-dive-why--how-each-library-is-used)
4. [Frontend Architecture & User Experience Flow](#4-frontend-architecture--user-experience-flow)
5. [Object-Oriented Backend Architecture (OOP Bonus Deep Dive)](#5-object-oriented-backend-architecture-oop-bonus-deep-dive)
6. [Socket.IO & WebSockets: Real-Time Communication Engine](#6-socketio--websockets-real-time-communication-engine)
7. [YouTube IFrame Player & Real-Time Synchronization Engine](#7-youtube-iframe-player--real-time-synchronization-engine)
8. [Real-Time Chat, Reactions & Participant State Management](#8-real-time-chat-reactions--participant-state-management)
9. [Role-Based Access Control (RBAC) & Security Architecture](#9-role-based-access-control-rbac--security-architecture)
10. [Database Architecture, Mongoose Schemas & Room Lifecycle](#10-database-architecture-mongoose-schemas--room-lifecycle)
11. [The 3D Room, Hybrid Rendering & First-Person Experience](#11-the-3d-room-hybrid-rendering--first-person-experience)
12. [Fullscreen, Camera Reset & Local Presentation State](#12-fullscreen-camera-reset--local-presentation-state)
13. [Backend Request Lifecycle, Express & Server Startup](#13-backend-request-lifecycle-express--server-startup)
14. [Production Deployment & Environment Configuration](#14-production-deployment--environment-configuration)
15. [Scalability Analysis: Current State & Future Distributed Architecture](#15-scalability-analysis-current-state--future-distributed-architecture)
16. [Engineering Decisions & Architectural Trade-offs](#16-engineering-decisions--architectural-trade-offs)
17. [Comprehensive Technical Interview Question Bank (80+ Questions & Answers)](#17-comprehensive-technical-interview-question-bank-80-questions--answers)
18. [Complete Technical Demonstration & Interview Presentation Script](#18-complete-technical-demonstration--interview-presentation-script)
19. [Guided Source Code Reading Plan & 10-Phase Curriculum](#19-guided-source-code-reading-plan--10-phase-curriculum)
20. [Glossary & Quick Revision Master Sheet](#20-glossary--quick-revision-master-sheet)

---

# 0. WATCHCRAFT IN SIMPLE TERMS (THE PLAIN-ENGLISH MENTAL MODEL & ANALOGIES)

> **Why this section exists**: Technical interviewers often ask: *"Explain this project to me like I am a 10-year-old"* or *"Give me the high-level intuition before we look at code."* This chapter breaks down how WatchCraft works using intuitive real-world analogies, step-by-step stories, and conversational explanations.

---

### 0.1 The Big Picture: What is WatchCraft?
Imagine you and your best friends want to watch a movie or anime episode together. Usually, everyone sits on the same living room couch, looking at the TV screen, holding the remote, eating snacks, and reacting to funny scenes.

Now imagine your friends live in different cities or different countries. One is sitting at their desk on a MacBook, another is lying in bed with an iPhone. 

**WatchCraft is the digital version of that cozy living room.** 
It gives you a virtual 3D apartment where everyone sits on the couch, looking at the same TV. When the host presses play, pauses, or skips forward, the video stays in exact frame-by-frame lockstep on everyone's screen. You can look around the room with your mouse or phone touchscreen, chat in real-time, shoot floating heart reactions across the room, and pass around control of the TV remote.

---

### 0.2 The Secret Trick: Why WatchCraft is 1,000x Lighter Than Discord Screen Sharing
When people think of a "watch party", they usually think of sharing their screen on Discord or Zoom. But screen sharing has huge problems:
- **It destroys internet bandwidth**: The host's computer has to record its own screen 30 times a second, compress millions of pixels, and upload a heavy video stream (2 to 5 Megabits per second).
- **The video looks blurry**: Text is fuzzy, fast action gets pixelated, and sound often falls out of sync.
- **Your laptop fan starts screaming**: Re-encoding video burns battery and CPU.

#### 💡 The Real-World Analogy: The Orchestra Conductor & Metronome
WatchCraft does **not** send video files or video pixels over the internet. Not a single pixel.

Instead, think of our server as an **Orchestra Conductor**:
1. When the host plays a video, the server does not stream video to anyone. Instead, it whispers a tiny note: *"Everyone, open YouTube video `dQw4w9WgXcQ` and start playing at minute 01:25."*
2. Each person's browser (Alice's laptop, Bob's iPhone) connects directly to **YouTube's multi-billion dollar CDN servers** to stream pristine 1080p or 4K video.
3. Every second, our server acts like a conductor tapping a metronome: *"We are at 01:26... 01:27... 01:28."*
4. If Bob's internet lags by half a second, his browser hears the conductor and gently nudges his video forward so he catches right back up.

Because we only send tiny text notes (under 100 bytes) instead of heavy video pixels (megabytes), WatchCraft runs butter-smooth even on 4G cellular data!

---

### 0.3 The 5 Core Mental Models & Analogies

#### 1. Sockets vs. Regular Websites: The Open Speakerphone vs. Snail Mail
- **Normal Websites (HTTP)** are like **Snail Mail**:
  Your browser sends a letter to the server: *"Please send me the home page."* The server mails back the page and hangs up. If someone in your watch party pauses the video 2 seconds later, how would you know? You can't, unless you send a letter every second asking *"Did they pause yet? Did they pause yet?"* (which is wasteful and slow).
- **WatchCraft (Socket.IO / WebSockets)** is like **An Open Speakerphone Call**:
  When you join a room, your browser dials the server and leaves the phone line open. The millisecond the host touches the Pause button, their phone says *"Paused at 02:14!"* into the phone line, and everyone else's phone instantly hears it and pauses. Zero delay.

#### 2. The Backend Structure: The Grand Hotel
To keep the server code clean and organized, we built it using Object-Oriented Programming (OOP), structured like a luxury hotel:
- 🏢 **`RoomRegistry` = The Hotel Front Desk**:
  The master ledger. It knows every active room in the hotel. When a user sends a message, the Front Desk does a super-fast lookup (`_socketToRoom`) to instantly know which room that person is in without searching through hundreds of rooms.
- 🛋️ **`Room` = The Hotel Suite**:
  An individual room where friends gather. It holds the TV, the current video timestamp, the list of guests on the couch, and a 15-minute cleanup timer (if everyone steps out temporarily, the suite stays open for 15 minutes before the lights shut off).
- 👤 **`Participant` = The Hotel Guest**:
  A person inside the suite. Each guest holds a keycard with their role:
  - 👑 **Host (VIP)**: Created the room. Holds the primary remote control. Can change videos, kick people, or promote others.
  - 🛡️ **Moderator**: Has a remote control to play, pause, and seek.
  - 👤 **Member**: Can watch and chat. If they want to change the video, they must press "Raise Hand" (Request Control).
- 💂‍♂️ **`MessageHandler` = The Hotel Bouncer & Concierge**:
  Whenever someone tries to do something (e.g., *"Change the video to MrBeast"*), the Bouncer inspects their keycard: *"Are you the Host or a Moderator? Yes? Go ahead. No? Action denied."*

#### 3. The 3D Room: The Glass Window in an Oil Painting
People often ask: *"How did you put a real interactive YouTube video inside a 3D Three.js room?"*

Inside a 3D game engine (WebGL), you cannot easily display a live YouTube video because YouTube is an external website protected by Google security policies.

**Our ingenious solution**: We used **Three.js** and **CSS3DRenderer** together:
- Imagine an artist paints a realistic 3D oil painting of a cozy living room with a TV stand.
- In the center of the TV frame, the artist cuts a physical rectangular hole.
- Behind that hole, we slide a real, working web browser window running the official YouTube player.
- Using 3D math (`CSS3DRenderer`), whenever you turn your head to look around the room, the YouTube window rotates and angles at the exact same millimeter as the 3D room.
- To your eyes, it looks like a real 3D television mounted on the wall!

#### 4. The Remote Control (Role-Based Access Control)
In a real living room with 10 people, if everyone grabbed the TV remote at the same time, it would be chaotic—someone would pause every 5 seconds, someone would skip forward, someone would switch the video.
- WatchCraft solves this with **The Living Room Remote Model**:
  - The **Host** holds the remote by default.
  - A **Member** who wants to change the song clicks "Request Control" (raises their hand).
  - The Host sees a prompt: *"Bob is requesting control. Grant or Deny?"*
  - The Host can promote Bob to **Moderator** (handing him a secondary remote) or transfer the **Host** crown completely.
  - If a stranger joins and spams the chat, the Host clicks "Remove" and the server kicks that user straight out of the room.

#### 5. Phone vs. PC: Seamless Adaptation
- **On a Laptop/PC**: You hold the left mouse button and drag to look around the room. You have a full keyboard for chatting and shortcuts.
- **On a Mobile Phone**: You swipe with your thumb to turn your head. Because phone screens are small, the chat and participant lists tuck neatly into a bottom slide-out drawer so they never block the TV screen!

---

### 0.4 Step-by-Step Story: Alice & Bob's Movie Night
To see how all these pieces fit together in real life, follow Alice and Bob:

```
[ Alice (Host, on PC) ]                     [ WatchCraft Server ]                     [ Bob (Friend, on Phone) ]
          │                                           │                                           │
  1. Creates Room "Anime Night" ─────────────────────>│ 1. Front Desk registers Suite              │
          │                                           │                                           │
  2. Pastes YouTube link ────────────────────────────>│ 2. Sets Video ID & time = 0               │
          │                                           │                                           │
  3. Sends link to Bob                                │                                           │
     (watchcraft.app/room/XYZ) ──────────────────────────────────────────────────────────────────>│
          │                                           │                                           │
          │                                           │<── 4. Bob opens link on phone             │
          │                                           │    "Hey, what's playing right now?"       │
          │                                           │                                           │
          │                                           │─── 5. Server responds: ──────────────────>│
          │                                           │    "Video #123 at 04:15, playing!"        │
          │                                           │                                           │
          │                                           │    Bob's phone loads YouTube,             │
          │                                           │    jumps to 04:15, and hits play!         │
          │                                           │                                           │
          │<────── 6. "Bob joined the room!" <────────┤                                           │
          │                                           │                                           │
          │                                           │<── 7. Bob taps "❤️ Heart" Reaction ───────│
          │<────── 8. Floating ❤️ bounces in 3D <─────┤                                           │
          │                                           │                                           │
  9. Alice pauses at 10:30 ──────────────────────────>│ 9. Server stores: paused at 10:30        │
          │                                           │─── 10. Server tells Bob: "Pause now!" ───>│
          │                                           │    Bob's player pauses at 10:30!          │
```

1. **Room Creation**: Alice opens WatchCraft and types "Anime Night". The server's Front Desk (`RoomRegistry`) creates a new `Room` and gives Alice the 👑 Host crown.
2. **Video Loading**: Alice pastes a YouTube URL. The server saves the video ID and notifies her room.
3. **Bob Joins**: Bob taps the link on WhatsApp on his iPhone. His phone connects to the server via WebSockets.
4. **The Greeting Handshake**: Bob asks, *"What's currently playing?"* The server responds: *"Video #123, currently at 4 minutes and 15 seconds, and it is currently playing."*
5. **Instant Catch-up**: Bob's browser loads the video, jumps straight to 4:15, and hits play. Both Alice and Bob are now seeing the exact same frame at the exact same second!
6. **Live Social Reactions**: Bob loves the scene and taps the "❤️" button. The server broadcasts it, and a 3D animated heart floats across Alice's screen.
7. **Synchronized Pause**: Alice pauses to grab a snack. Her browser emits a `pause` event with timestamp `10:30`. The server relays it to Bob. Bob's phone pauses at `10:30` within 30 milliseconds.
8. **Handling Trolls**: If an unwelcome guest joins, Alice clicks "Remove User". The server immediately kicks the troll's socket, removes them from the participant roster, and redirects their browser back to the home screen.

---

### 0.5 The 60-Second Elevator Pitch (What to Say in an Interview)

When an interviewer says: **"So, tell me about WatchCraft and how it works"**, deliver this confident, structured answer:

> *"WatchCraft is a real-time synchronized YouTube watch-party platform that combines a retro 2D virtual exploration world with an immersive, seated first-person 3D theater room.*
>
> *The core technical problem I solved was eliminating the heavy bandwidth and lag of traditional screen sharing. Instead of re-encoding and streaming video pixels over WebRTC—which eats megabits of bandwidth and degrades quality—WatchCraft acts as an authoritative synchronization conductor. Our Node.js and Socket.IO backend transmits sub-100-byte state packets, while clients stream pristine 1080p directly from YouTube's CDN. I implemented sub-second drift detection to snap desynchronized players back into frame-perfect lockstep.*
>
> *On the backend, I designed a clean Object-Oriented architecture with a RoomRegistry, Room domain entities, Participant models, and a MessageHandler enforcing role-based access control with an O(1) socket lookup table.*
>
> *On the frontend, I engineered a hybrid 3D rendering pipeline using Three.js for the ambient WebGL apartment and CSS3DRenderer to project a real, interactive YouTube iframe into 3D perspective space, complete with clamped first-person camera kinematics and mobile touch controls.*
>
> *The entire system is deployed in production with dual-tier in-memory and MongoDB persistence."*

---

# 1. EXECUTIVE SUMMARY & PROJECT OVERVIEW

### 1.1 What WatchCraft Is
**WatchCraft** is an interactive, real-time synchronized YouTube watch-party web application engineered with a dual-paradigm user interface:
1. **A Retro 2D Virtual Exploration Layer**: An RPG-style interactive room (`GameRoomScreen.jsx`) where users control an avatar with keyboard (WASD) or point-and-click mouse movement, interact with non-player characters (NPC Heli), inspect legal policies and portfolio artwork, and boot up an operating-system desktop simulation (`WatchlyDesktop.jsx`).
2. **An Immersive First-Person 3D Theater Room**: A seated cinema experience (`WatchRoom3D.jsx`) built with Three.js (WebGL) and CSS3DRenderer, featuring a 3D apartment environment, animated ambient computer screens, first-person camera look (with 180° horizontal and 40° vertical clamping), mobile finger drag touch controls, live low-latency chat, animated reactions, dynamic role management, and an authoritative YouTube playback synchronization engine.

### 1.2 The Problem WatchCraft Solves
Traditional watch parties (e.g., Discord screen share, standard video portals) suffer from three critical engineering and UX flaws:
1. **Bandwidth Inefficiency & Quality Degradation**: Screen sharing re-encodes video pixels over WebRTC, consuming massive outbound bandwidth (2–5 Mbps per streamer) and introducing compression artifacts, frame drops, and audio desynchronization. WatchCraft eliminates video re-streaming entirely: only lightweight mathematical state packets (`videoId`, `currentTime`, `playState`) are transmitted over WebSockets (~120 bytes per event), allowing each client to stream pristine 1080p/4K video directly from YouTube's edge CDN.
2. **Host-Participant Playback Drift**: Network jitter, buffering stalls, and tab throttling cause clients in naive watch-party apps to drift apart by seconds or minutes. WatchCraft enforces an authoritative server clock with drift-correction thresholds (sub-second seek snaps) and periodic heartbeat broadcasts.
3. **Sterile, Flat User Experience**: Conventional watch party platforms are simple video boxes adjacent to a standard text list. WatchCraft transforms remote viewing into a spatial, social event where users explore a shared aesthetic world before gathering in a 3D living room theater.

### 1.3 Target Audience & Use Cases
- **Remote Friends & Watch Groups**: Synchronous anime binge-watching, educational study groups, movie nights, and music listening sessions.
- **Content Creators & Community Hosts**: Moderated community watch parties where hosts can promote moderators, grant control requests, or remove disruptive participants.
- **Spatial Web Showcase**: Demonstrating how modern web browsers can seamlessly composite WebGL 3D graphics, CSS3D transformed DOM elements, WebSockets, and third-party media APIs without external native plugins.

---

# 2. HIGH-LEVEL ARCHITECTURE & END-TO-END SYSTEM TOPOLOGY

WatchCraft employs a decoupled client-server architecture split between a high-performance single-page application (SPA) frontend and an event-driven Node.js backend backed by MongoDB.

### 2.1 System Architecture Diagram

```mermaid
graph TB
    subgraph Client [Frontend Browser Application - React 18 + Vite]
        UI[App.jsx / StartScreen.jsx]
        RPG[GameRoomScreen.jsx - 2D Interactive RPG Room]
        Desktop[ComputerSystem.jsx / WatchlyDesktop.jsx - OS Simulation]
        Room3D[WatchRoom3D.jsx - Three.js WebGL + CSS3DRenderer]
        YTAPI[YouTube IFrame Player API - Embedded 1280x720 Player]
        SocketClient[socket.js - Socket.IO Client Singleton]
    end

    subgraph CDN [External Infrastructure & Content Delivery]
        Netlify[Netlify CDN - Static Web Assets]
        YouTubeCDN[Google / YouTube Video Streaming CDN]
    end

    subgraph Server [Backend Application - Node.js + Express + Socket.IO]
        Express[index.js - Express HTTP & REST Router]
        RoomsRouter[routes/rooms.js - REST Room APIs]
        SocketServer[Socket.IO Server - WebSocket Transport]
        MsgHandler[MessageHandler.js - Event Controller & RBAC Validator]
        Registry[RoomRegistry.js - In-Memory Active Room Directory]
        RoomObj[Room.js - Room Domain Entity & Sync Clock]
        ParticipantObj[Participant.js - Participant Domain Entity]
    end

    subgraph Persistence [Database Layer]
        MongoDB[(MongoDB Atlas / Local - Room Metadata & TTL Index)]
        Mongoose[Room.model.js - Mongoose Schema & Queries]
    end

    %% Client Internal Connections
    UI --> RPG
    RPG --> Desktop
    Desktop --> Room3D
    Room3D --> YTAPI
    Room3D --> SocketClient

    %% External Media Connection
    YTAPI -.->|Direct 1080p Video Stream| YouTubeCDN
    Netlify -.->|Serves Static Bundle| Client

    %% Client-Server Connections
    Desktop -.->|GET /api/rooms - REST Discovery| RoomsRouter
    SocketClient <===>|Full-Duplex WS JSON Packets| SocketServer

    %% Server Internal Routing
    Express --> RoomsRouter
    Express --> SocketServer
    SocketServer --> MsgHandler
    MsgHandler --> Registry
    Registry --> RoomObj
    RoomObj --> ParticipantObj

    %% Persistence Connections
    RoomsRouter --> Mongoose
    MsgHandler -.->|Async Fire-and-Forget Persistence| Mongoose
    Mongoose <===>|Mongoose Connection Pool| MongoDB
```

### 2.2 End-to-End Data Flow
1. **Discovery & Room Creation**:
   - The user opens the 2D room, approaches the virtual PC, and clicks "Boot Up WatchCraft".
   - In `WatchlyDesktop.jsx`, the user either selects a public room from `RoomList.jsx` (fetched via `GET /api/rooms`) or opens the "Create Room" modal.
   - Creating a room emits `create_room` over the WebSocket connection with `{ name, genre, username, visibility, userId }`.
   - The backend `MessageHandler.js` validates parameters, calls `RoomRegistry.create()`, assigns the socket as `'host'`, joins the Socket.IO room channel, persists metadata asynchronously to MongoDB via `RoomModel.create()`, and returns an acknowledgment containing the 6-character room code (e.g., `X7K9PQ`).
2. **Joining & Synchronization**:
   - A participant inputs the room code or navigates to `/?room=X7K9PQ`.
   - The client emits `join_room` with `{ roomId, username, userId }`.
   - Backend retrieves the active `Room` object from `RoomRegistry` (or recovers it from MongoDB if idle), attaches the participant, registers the socket mapping, emits `joined_room` to the joining socket, sends `sync_state` containing current video state (`videoId`, `currentTime`, `playState`), and broadcasts `user_joined` to all other sockets in the room.
3. **Authoritative Video Playback & Scrubbing**:
   - When the Host clicks Play, Pause, or drags the seek bar, `WatchRoom3D.jsx` detects the action and emits `play`, `pause`, or `seek` with `{ time }`.
   - `MessageHandler.js` checks `_requireControl(socket, room)`. If valid, it updates the authoritative state on `room.videoState` and broadcasts `sync_state` to all participants.
   - Participant browsers receive `sync_state`. The local player applies the state non-destructively: if the time drift exceeds `0.8` seconds, `player.seekTo(currentTime, true)` snaps the playback position to match the host.
4. **Disconnection & Graceful Teardown**:
   - If a participant closes the tab, `_onDisconnect` triggers `RoomRegistry.unregisterSocket()`.
   - If the participant was a regular member, `user_left` is broadcast with the new participant list.
   - If the host disconnects, `Room.js` checks for any assigned Moderators and automatically promotes one to Host. If no moderator exists, it promotes the oldest participant.
   - If the room becomes completely empty, a 15-minute grace period timer starts. If no one returns within 15 minutes, the room is purged from memory and deactivated in MongoDB.

### 2.3 Component Responsibility Table

| Component / Module | Technology | Primary Architectural Responsibility | Connected Collaborators | Key Methods / Functions |
| :--- | :--- | :--- | :--- | :--- |
| `src/main.jsx` | React 18 / Vite | DOM Root Bootstrapper & React StrictMode mount | `src/App.jsx`, `index.html` | `createRoot().render()` |
| `src/App.jsx` | React 18 | Top-level screen router (`loading` → `start` → `room`) & global audio trigger | `Preloader`, `StartScreen`, `GameRoomScreen` | `ensureMusic()`, `setScreen()` |
| `src/GameRoomScreen.jsx` | React / HTML Canvas | 2D RPG room rendering, avatar kinematics, NPC Heli dialogue, entity collision | `ComputerSystem`, `sounds.js` | `handleKeyDown()`, `checkProximity()` |
| `src/ComputerSystem.jsx` | React 18 | Virtual OS window lifecycle, user session management, WatchRoom3D mount | `WatchlyDesktop`, `WatchRoom3D` | `handleLogin()`, `handleOpenRoom()` |
| `src/WatchlyDesktop.jsx` | React 18 | Window manager, app launch icons, Room creation modal, Join modal | `RoomList`, `socket.js` | `handleCreateSubmit()`, `handleJoinSubmit()` |
| `src/RoomList.jsx` | React 18 | Live room explorer, genre filtering, viewer count display | `ComputerSystem`, `/api/rooms` | `fetchRooms()`, `handleFilter()` |
| `src/WatchRoom3D.jsx` | Three.js / React | Seated 3D WebGL room, CSS3D television projection, YouTube synchronization | `socket.js`, `CSS3DRenderer`, `YT.Player` | `loadYTApi()`, `togglePlayPause()`, `handleSeek()` |
| `src/socket.js` | Socket.IO Client | Singleton client connection, persistent `userId` generation, localStorage cache | `WatchRoom3D`, `WatchlyDesktop` | `getSocket()`, `getPersistentUserId()` |
| `backend/src/index.js` | Node.js / Express | Server entry point, HTTP server setup, CORS configuration, Socket.IO attachment | `MessageHandler`, `RoomRegistry`, `connectDB` | `start()`, `io.on('connection')` |
| `backend/classes/RoomRegistry.js` | Node.js (OOP) | In-memory active room catalog, socket-to-room reverse index, 15m idle cleanup | `Room.js`, `MessageHandler.js` | `create()`, `get()`, `findBySocket()`, `unregisterSocket()` |
| `backend/classes/Room.js` | Node.js (OOP) | Domain model for watch room, participant map, authoritative video state clock | `Participant.js`, `Socket.IO` | `addParticipant()`, `removeParticipant()`, `updateVideoState()` |
| `backend/classes/Participant.js` | Node.js (OOP) | Domain model for individual connected user, role status, permission validator | `Room.js` | `canControl()`, `isHost()`, `toPublic()` |
| `backend/classes/MessageHandler.js` | Node.js (OOP) | WebSocket event controller, payload sanitizer, RBAC security enforcement | `RoomRegistry`, `RoomModel` | `_onPlay()`, `_onSeek()`, `_onRemoveParticipant()` |
| `backend/models/Room.model.js` | Mongoose / MongoDB | Persistent document schema, room metadata, 24-hour TTL expiration index | `mongodb.js`, `RoomModel` | `RoomSchema`, `RoomModel.create()` |
| `backend/db/mongodb.js` | Mongoose | Fault-tolerant database connection pool with automatic local fallback | `Room.model.js` | `connectDB()`, `isDBConnected()` |

---

# 3. TECHNOLOGY STACK DEEP DIVE (WHY & HOW EACH LIBRARY IS USED)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                WATCHCRAFT STACK                                 │
├────────────────────────┬────────────────────────┬───────────────────────────────┤
│ Frontend (Client)      │ Backend (Server)       │ Persistence & Graphics        │
├────────────────────────┼────────────────────────┼───────────────────────────────┤
│ • React 18.2.0         │ • Node.js >=18.0.0     │ • Three.js 0.186.1            │
│ • Vite 4.3.9           │ • Express 4.18.2       │ • CSS3DRenderer               │
│ • Socket.IO Client 4.8 │ • Socket.IO Server 4.7 │ • Draco GLTF Decoder          │
│ • FontAwesome 7.3.1    │ • Mongoose 8.3.0       │ • MongoDB Atlas / Local       │
│ • Vanilla CSS3 Tokens  │ • NanoID 3.3.7         │ • YouTube IFrame Player API   │
└────────────────────────┴────────────────────────┴───────────────────────────────┘
```

### 3.1 React 18.2.0 (Frontend View Layer)
- **Why It Is Used**: React provides a declarative component model, stateful reactivity, and robust lifecycle hooks essential for synchronizing high-frequency WebSocket updates with DOM controls (chat streams, playback sliders, participant avatars).
- **Exact Location**: Root package `package.json`, mounted in `src/main.jsx`, powering all views (`App.jsx`, `GameRoomScreen.jsx`, `ComputerSystem.jsx`, `WatchRoom3D.jsx`).
- **Critical Architectural Trade-Off**: React's Virtual DOM reconciliation is ideal for UI controls, but directly managing Three.js canvas objects or continuous 60 FPS video render loops inside React state causes disastrous re-render thrashing. WatchCraft resolves this by isolating Three.js rendering inside an unmanaged mutable `useRef` lifecycle within `useEffect`, keeping the 3D animation loop completely outside React's re-render cycle.

### 3.2 Vite 4.3.9 (Build Tool & Dev Server)
- **Why It Is Used**: Unlike legacy Webpack setups, Vite leverages native ES modules (`ESM`) during development for sub-second Hot Module Replacement (HMR) and Rollup for optimized production tree-shaking and chunk splitting.
- **Exact Location**: Configured in `vite.config.js`, root `package.json`.
- **Production Asset Output**: Bundles Draco WebAssembly decoders (`draco_decoder.wasm`), video portfolios, 3D glTF models, and CSS tokens into `dist/`.

### 3.3 Three.js 0.186.1 & CSS3DRenderer (3D Graphics & Hybrid Composition)
- **Why It Is Used**: Native WebGL API requires thousands of lines of low-level shader and buffer management. Three.js abstracts scene graphs, perspective cameras, material shaders, and glTF asset loaders. `CSS3DRenderer` is the linchpin that projects regular HTML elements (YouTube iframe) onto 3D planes using CSS3 `matrix3d` transforms.
- **Exact Location**: `src/WatchRoom3D.jsx`.
- **Alternative Considered**: Attempting to render the YouTube video directly inside a WebGL `VideoTexture`. **Why this is impossible**: Cross-origin security policies (CORS) strictly prohibit WebGL from reading raw pixel memory from third-party iframes (`youtube.com`). Using `CSS3DRenderer` solves this by keeping the iframe as a native browser DOM node transformed in 3D space.

### 3.4 Socket.IO 4.7.5 / 4.8.4 (Real-Time Communication Layer)
- **Why It Is Used**: Raw WebSockets lack built-in reconnection logic, connection state recovery, channel multiplexing ("rooms"), and automatic HTTP long-polling fallback. Socket.IO provides an abstraction for bidirectional event messaging with automatic heartbeats and room subscriptions.
- **Exact Location**: Backend: `watchly-backend/package.json`, `index.js`. Frontend: `src/socket.js`, `src/WatchRoom3D.jsx`.

### 3.5 Node.js & Express 4.18.2 (Backend Runtime & REST Services)
- **Why It Is Used**: Node.js provides a single-threaded, non-blocking asynchronous event loop ideally suited for high-concurrency I/O-bound WebSocket message broadcasting. Express provides lightweight HTTP routing for REST APIs (`/health`, `/api/rooms`).
- **Exact Location**: `watchly-backend/src/index.js`, `watchly-backend/src/routes/rooms.js`.

### 3.6 MongoDB & Mongoose 8.3.0 (Persistence Layer)
- **Why It Is Used**: Room metadata and discovery catalogs require document flexibility (varying genre tags, dynamic timestamps). Mongoose provides schema validation, type casting, connection pooling, and Time-To-Live (TTL) auto-expiration indexes.
- **Exact Location**: `watchly-backend/src/db/mongodb.js`, `watchly-backend/src/models/Room.model.js`.

---

# 4. FRONTEND DEEP DIVE

### 4.1 Application Startup & Routing Architecture
WatchCraft does not rely on heavy client-side routers like `react-router-dom`. Instead, it utilizes an explicit **Hierarchical State-Machine Architecture**:

```mermaid
stateDiagram-v2
    [*] --> PRELOADER: Application Load
    PRELOADER --> START_SCREEN: Assets Loaded & Audio Initialized
    START_SCREEN --> GAME_ROOM: User Clicks "PRESS START"
    
    state GAME_ROOM {
        [*] --> RPG_WORLD: Canvas Mount
        RPG_WORLD --> COMPUTER_SYSTEM: Press 'E' near Computer
        COMPUTER_SYSTEM --> DESKTOP_VIEW: Valid Username Exists
        COMPUTER_SYSTEM --> LOGIN_VIEW: No Username Cached
        LOGIN_VIEW --> DESKTOP_VIEW: Save Username
        DESKTOP_VIEW --> CREATE_MODAL: Click "Create Room"
        DESKTOP_VIEW --> JOIN_MODAL: Click "Join Room"
        DESKTOP_VIEW --> ROOM_LIST: Click "Live Rooms"
        CREATE_MODAL --> WATCH_ROOM_3D: WS create_room Ack
        JOIN_MODAL --> WATCH_ROOM_3D: WS join_room Ack
        ROOM_LIST --> WATCH_ROOM_3D: Click Room Card
    }

    WATCH_ROOM_3D --> DESKTOP_VIEW: onExit() Triggered (Leave / Kick)
```

1. **Root Bootstrapping (`src/main.jsx`)**:
   - Renders `<App />` into the `#root` element of `index.html`.
2. **Audio Unlocking (`src/App.jsx`)**:
   - Modern browsers block unmuted Web Audio until user interaction. `App.jsx` listens for the first `click` or `keydown` event on `window` to trigger `initAudio()` and `startBgMusic()` from `src/sounds.js`.
3. **Desktop Session Initialization (`src/ComputerSystem.jsx`)**:
   - Manages OS window state (`view`: `'desktop'` | `'watchparty'` | `'roomlist'`).
   - Checks `getStoredUsername()`. If empty, renders the retro Windows-style login box.
   - When entering a watch party, stores room metadata in `partyData` and renders `<WatchRoom3D {...partyData} onExit={...} />`.

### 4.2 Room Creation & Joining Implementation
- **Room Creation (`WatchlyDesktop.jsx#handleCreateSubmit`)**:
  ```javascript
  const socket = getSocket();
  socket.emit('create_room', {
    name: roomName.trim(),
    genre: selectedGenre,
    username: username.trim(),
    visibility: isPrivate ? 'private' : 'public',
    userId: getPersistentUserId(),
  }, (res) => {
    if (res?.success) {
      onOpenRoom({
        roomId: res.roomId,
        roomName: res.name,
        role: 'host',
        username: username.trim(),
        userId: res.userId,
        participants: res.participants,
        videoState: res.videoState || {},
      });
    }
  });
  ```
- **Room Joining (`WatchlyDesktop.jsx#handleJoinSubmit`)**:
  - Emits `join_room` with `{ roomId: joinCode.toUpperCase().trim(), username, userId }`.
  - Upon callback confirmation, triggers `onOpenRoom` which elevates the client into `<WatchRoom3D>`.

### 4.3 Room Discovery & Live Filtering (`src/RoomList.jsx`)
- Queries `GET /api/rooms?genre={selectedGenre}` on mount and genre tab change.
- Server returns active in-memory rooms combined with persisted MongoDB rooms, sorted by `viewerCount`.
- Clicking a room triggers `handleJoinRoom(room.roomId)` via WebSocket, avoiding page refreshes.

---

# 5. OBJECT-ORIENTED BACKEND ARCHITECTURE (OOP BONUS DEEP DIVE)

### 💡 In Plain English: The Hotel Analogy (Quick Mental Model)
Instead of writing hundreds of tangled `socket.on(...)` callbacks in one giant messy file, we modeled the backend like a real **Grand Hotel**:
- **`RoomRegistry` is the Hotel Front Desk**: It maintains a master ledger of all suites and a fast phonebook index (`_socketToRoom`) so looking up which room a guest is in takes O(1) instantaneous time.
- **`Room` is the Hotel Suite**: It holds the television, the list of guests on the couch, and a 15-minute grace period timer so if everyone temporarily refreshes, the room doesn't vanish.
- **`Participant` is the Guest**: It tracks the guest's identity and keycard role (`host`, `moderator`, `member`).
- **`MessageHandler` is the Concierge & Bouncer**: It catches incoming network requests and checks authorization before allowing changes to the TV.

The WatchCraft backend is engineered around clean Object-Oriented Programming (OOP) principles, separating domain models, in-memory catalogs, and network transport controllers.

```mermaid
classDiagram
    class RoomRegistry {
        -Map~string, Room~ rooms
        -Map~string, string~ _socketToRoom
        +create(opts) Room
        +get(roomId) Room
        +findBySocket(socketId) Room
        +registerSocket(socketId, roomId) void
        +unregisterSocket(socketId) Object
        +delete(roomId) void
        +getAll() Room[]
        +getByGenre(genre) Room[]
        +stats() Object
    }

    class Room {
        +string roomId
        +string name
        +string genre
        +string visibility
        +string creatorUserId
        +string hostUserId
        +Map~string, Participant~ participants
        +Object videoState
        +addParticipant(socketId, username, userId) Object
        +removeParticipant(id) Object
        +getParticipant(id) Participant
        +assignRole(targetId, role) Participant
        +transferHost(currHostId, targetId) Object
        +updateVideoState(update) Object
        +getCurrentVideoState() Object
        +broadcast(event, data) void
        +getPublicState() Object
    }

    class Participant {
        +string socketId
        +string username
        +string role
        +string userId
        +Date joinedAt
        +canControl() boolean
        +isHost() boolean
        +toPublic() Object
    }

    class MessageHandler {
        -Server io
        -RoomRegistry registry
        +handle(socket) void
        -_onCreateRoom(socket, data, cb) void
        -_onJoinRoom(socket, data, cb) void
        -_onPlay(socket, data) void
        -_onPause(socket, data) void
        -_onSeek(socket, data) void
        -_onChangeVideo(socket, data) void
        -_onRemoveParticipant(socket, data) void
        -_requireRoom(socket) Room
        -_requireControl(socket, room) boolean
        -_requireHost(socket, room) boolean
    }

    RoomRegistry "1" *-- "many" Room : Aggregates & Manages
    Room "1" *-- "many" Participant : Encapsulates
    MessageHandler ..> RoomRegistry : Queries & Updates
    MessageHandler ..> Room : Dispatches State Changes
```

### 5.1 `RoomRegistry` (`watchly-backend/src/classes/RoomRegistry.js`)
- **Single Responsibility**: Acts as the in-memory repository and directory for active `Room` instances.
- **O(1) Reverse Index Optimization**:
  ```javascript
  this.rooms = new Map();         // roomId -> Room
  this._socketToRoom = new Map(); // socketId -> roomId
  ```
  Instead of scanning all rooms and looping through every participant list on every incoming WebSocket event (an O(N*M) bottleneck), `findBySocket(socketId)` performs an **O(1)** hash-map lookup in `_socketToRoom`.
- **15-Minute Grace Period Lifecycle**:
  ```javascript
  if (room.isEmpty()) {
    room.scheduleCleanup(() => {
      if (room.isEmpty()) {
        this.rooms.delete(room.roomId);
        console.log(`[ROOM ${room.roomId}] Cleaned up after 15m idle`);
      }
    }, 15 * 60 * 1000);
  }
  ```
  Prevents accidental room destruction when participants refresh their browsers or temporarily lose connectivity.

### 5.2 `Room` (`watchly-backend/src/classes/Room.js`)
- **Domain Entity & Aggregation Root**: Encapsulates participant collection, role promotion logic, and the shared playback clock.
- **Fail-Safe Participant Deletion**:
  ```javascript
  removeParticipant(id) {
    const leaving = this.getParticipant(id);
    if (!leaving) return { wasHost: false, newHost: null };

    const socketId = leaving.socketId;
    this.participants.delete(socketId);
    ...
  ```
  Resolves participants whether identified by transient `socketId` or persistent `userId`, preventing zombie participant records.
- **Automated Host Failover Hierarchy**:
  If the host departs, `Room.js` evaluates candidates:
  1. Searches for any assigned `moderator`.
  2. If no moderator exists, selects the oldest connected `participant`.
  3. Re-assigns `this.hostUserId` and returns `{ wasHost: true, newHost }`.

### 5.3 `Participant` (`watchly-backend/src/classes/Participant.js`)
- **Encapsulation of Permissions**:
  ```javascript
  canControl() {
    return this.role === 'host' || this.role === 'moderator';
  }
  isHost() {
    return this.role === 'host';
  }
  ```
  Centralizes authorization logic within the domain entity. If permission rules expand (e.g., adding a `'vip'` role), changes are localized to `Participant.js` rather than scattered across multiple event handlers.

### 5.4 `MessageHandler` (`watchly-backend/src/classes/MessageHandler.js`)
- **Controller & Facade Pattern**: Isolates raw Socket.IO networking from business domain models.
- **Guard Methods**:
  - `_requireRoom(socket)`: Verifies socket belongs to an active room.
  - `_requireControl(socket, room)`: Enforces that sender has `'host'` or `'moderator'` role.
  - `_requireHost(socket, room)`: Restricts destructive actions (kicking users, transferring room) strictly to the host.

### 🗣️ How to Explain the Backend Architecture in an Interview
*"I structured the backend using domain-driven Object-Oriented principles. Instead of coupling network event listeners directly to state, I built a `MessageHandler` facade that acts as a controller, delegating domain logic to `Room` and `Participant` classes. I solved the common O(N*M) lookup bottleneck across rooms by maintaining an in-memory reverse hash map (`_socketToRoom`) in the `RoomRegistry`, guaranteeing O(1) instant socket-to-room resolution. Furthermore, I implemented an automated host failover hierarchy and a 15-minute graceful room cleanup cycle to ensure high resilience against unexpected network disconnects."*

---

# 6. SOCKET.IO & WEBSOCKETS: REAL-TIME COMMUNICATION ENGINE

### 💡 In Plain English: The Live Speakerphone (Quick Mental Model)
Traditional web requests (HTTP) are like ordering takeout by sending a letter in the mail—you have to wait for the postman to deliver the response. 
WebSockets with Socket.IO are like having a live, always-open speakerphone connection between all users and the server.
When Alice pauses the movie, she doesn't send a slow HTTP POST request. Her browser emits a tiny `pause` packet through the open socket. The server receives it, verifies that Alice holds the remote control (`_requireControl`), updates the suite's state, and broadcasts `sync_state` to everyone else in under 30 milliseconds.

### 6.1 Complete Event Protocol Specification

| Event Name | Direction | Payload Structure | Backend Authorization Guard | State Mutation | Broadcast Target |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `create_room` | Client → Server | `{ name, genre, username, visibility, userId }` | None (Public) | Instantiates `Room` in `RoomRegistry` | Sender ACK callback |
| `join_room` | Client → Server | `{ roomId, username, userId }` | None (Valid Room ID required) | Adds `Participant`, maps socket | Sender ACK + `user_joined` to room |
| `leave_room` | Client → Server | `{ roomId }` | `_requireRoom()` | Removes participant, triggers cleanup | `user_left` to room |
| `sync_state` | Server → Client | `{ playState, currentTime, videoId, role }` | N/A (Server Emitted) | Client synchronizes local player | Room broadcast or individual socket |
| `play` | Client → Server | `{ time: number }` | `_requireControl()` (Host/Mod) | `room.videoState.playState = 'playing'` | `sync_state` to all room sockets |
| `pause` | Client → Server | `{ time: number }` | `_requireControl()` (Host/Mod) | `room.videoState.playState = 'paused'` | `sync_state` to all room sockets |
| `seek` | Client → Server | `{ time: number }` | `_requireControl()` (Host/Mod) | `room.videoState.currentTime = time` | `sync_state` to all room sockets |
| `change_video`| Client → Server | `{ videoId: string }` | `_requireControl()` (Host/Mod) | Resets time to 0, sets new video ID | `sync_state` to all room sockets |
| `assign_role` | Client → Server | `{ userId: string, role: string }` | `_requireHost()` (Host only) | Updates `participant.role` | `role_assigned` to room |
| `remove_participant`| Client → Server| `{ userId: string }` | `_requireHost()` (Host only) | Unregisters socket, purges user | `kicked` to target, `participant_removed` to room |
| `chat_message`| Client → Server | `{ text: string }` | `_requireRoom()` | None (Transient message) | `chat_message` to room |
| `reaction` | Client → Server | `{ emoji: string }` | `_requireRoom()` (Valid emoji whitelist) | None (Transient reaction) | `reaction` to room |
| `request_control`| Client → Server| None | `_requireRoom()` (Non-controlling member)| None | `control_requested` strictly to Host socket |

### 6.2 Sequence Diagram: Synchronized Seek & Play

```mermaid
sequenceDiagram
    autonumber
    actor Host as Room Host
    participant BrowserHost as Host Browser (WatchRoom3D)
    participant Server as WatchCraft Backend (MessageHandler)
    participant BrowserPeer as Peer Browser (WatchRoom3D)
    actor Peer as Room Member

    Host->>BrowserHost: Drags Playback Scrubber to 01:45 (105s)
    BrowserHost->>BrowserHost: Local Seek (isSyncingRef = true)
    BrowserHost->>Server: socket.emit('seek', { time: 105 })
    
    Note over Server: MessageHandler._onSeek()<br/>1. _requireRoom(socket)<br/>2. _requireControl(socket, room)<br/>3. room.updateVideoState({ currentTime: 105 })
    
    Server-->>BrowserHost: room.broadcast('sync_state', { playState, currentTime: 105, videoId })
    Server-->>BrowserPeer: room.broadcast('sync_state', { playState, currentTime: 105, videoId })
    
    Note over BrowserPeer: WatchRoom3D onSync handler:<br/>1. Math.abs(curTime - 105) > 0.8s drift?<br/>2. Set isSyncingRef = true<br/>3. ytPlayer.seekTo(105, true)<br/>4. Clear isSyncingRef after 500ms
    
    BrowserPeer->>Peer: Video frames snap to 01:45 perfectly in sync
```

### 🗣️ How to Explain WebSockets & Socket.IO in an Interview
*"I chose Socket.IO over raw WebSockets because it provides out-of-the-box connection state recovery, automatic heartbeat health checks, HTTP long-polling fallback, and room multiplexing. I designed an explicit bidirectional event contract where client mutations like `play`, `pause`, and `seek` are strictly treated as requests, while the server acts as the authoritative source of truth, broadcasting `sync_state` payloads to keep all clients perfectly aligned."*

---

# 7. YOUTUBE IFRAME PLAYER & SYNCHRONIZATION ENGINE

### 💡 In Plain English: The Orchestra Metronome (Quick Mental Model)
If two friends hit "Play" at the exact same second on two different laptops, why do their videos start drifting apart after 5 minutes?
Because one laptop might have a slightly slower CPU, or one person's WiFi buffered for half a second, or someone temporarily switched browser tabs.
WatchCraft solves this with an **Orchestra Metronome**:
- The server acts as the metronome conductor, keeping track of where the movie should be.
- If Bob lags behind Alice by just a tiny split-second (less than 0.8 seconds), we leave him alone so his audio doesn't glitch or stutter.
- But if Bob falls behind by more than 0.8 seconds (like if his WiFi lagged), our code gently snaps his video forward to the exact second Alice is watching.
- We also built an **Echo Suppressor** (`isSyncingRef`): when the computer jumps forward automatically, we tell our code: *"Don't tell the server you jumped! The server is the one that told YOU to jump!"* This prevents the app from getting stuck in an infinite feedback loop.

### 7.1 Robust YouTube URL & ID Extraction
Users frequently paste diverse URL formats. In `src/WatchRoom3D.jsx` (and mirrored in `MessageHandler.js`), `extractYouTubeId` extracts the canonical 11-character alphanumeric token:
```javascript
function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const v = parsed.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[a-zA-Z0-9_-]{11}$/.test(last)) return last;
  } catch (e) {}
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}
```
**Supported Formats Verified**:
- Standard: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Shortened: `https://youtu.be/dQw4w9WgXcQ`
- Embedded: `https://www.youtube.com/embed/dQw4w9WgXcQ`
- YouTube Shorts: `https://www.youtube.com/shorts/dQw4w9WgXcQ`
- Direct ID: `dQw4w9WgXcQ`

### 7.2 Authoritative Clock & Mathematical Drift Correction
Why do video players drift? Hardware clock crystal discrepancies, CPU throttling on inactive browser tabs, and network buffer variance cause two video streams started at the exact same second to drift apart by 1–3 seconds over a 10-minute window.

**WatchCraft's 3-Tier Synchronization Algorithm**:
1. **Authoritative Timestamp Origin**: The backend stores `currentTime` updated by host actions and periodic 5-second heartbeats (`socket.emit('seek', { time: cur })`).
2. **Dynamic Drift Threshold (`0.8s`)**:
   ```javascript
   const cur = ytPlayerRef.current.getCurrentTime() || 0;
   if (Math.abs(cur - state.currentTime) > 0.8) {
     isSyncingRef.current = true;
     ytPlayerRef.current.seekTo(state.currentTime, true);
     setTimeout(() => { isSyncingRef.current = false; }, 500);
   }
   ```
   If a client's drift is below 800ms, micro-seeking is skipped to prevent audible sound stutter. If drift exceeds 800ms (due to network buffering or tab pause), the player hard-snaps to the host's position.
3. **Echo Suppression Flag (`isSyncingRef`)**:
   When `ytPlayer.seekTo()` or `playVideo()` is invoked programmatically by a network packet, YouTube's API fires native `onStateChange` events. Without protection, the peer browser would mistake this for a local user action and emit a duplicate `play`/`seek` back to the server, creating a catastrophic **infinite event echo loop**. Setting `isSyncingRef.current = true` before programmatic commands and clearing it after a 500ms debounce window completely eliminates echo loops.

### 🗣️ How to Explain Video Synchronization in an Interview
*"The biggest challenge in building a synchronized media player is drift correction and feedback echo prevention. I implemented an authoritative server clock with an 800ms threshold: differences under 800ms are ignored to preserve smooth audio playback, while drift over 800ms executes a seek snap. To avoid infinite echo loops—where a programmatic seek triggers a native YouTube `onStateChange` event that bounces back to the server—I introduced a synchronization lock flag (`isSyncingRef`) that temporarily silences outgoing socket emissions during programmatic adjustments."*

---

# 8. LIVE CHAT, REACTIONS & PARTICIPANT STATE MANAGEMENT

### 8.1 Live Chat Implementation
- **Chat Message Pipeline**:
  - Max length enforced at 400 characters (frontend) and 500 characters (backend).
  - Messages include sender's `role` (`host`, `moderator`, `participant`) and timestamp.
  - Rendered with dynamic role badges (`faCrown` for Host, `faShieldHalved` for Moderator).
- **Auto-Scroll & Unread Tracking**:
  - `isUserAtBottomRef` tracks whether user is scrolled to the bottom.
  - If a message arrives while the user is reading older messages, auto-scroll is paused and a floating pill (`New messages ↓`) appears. Clicking it smoothly jumps to the bottom.

### 8.2 Animated Floating Reactions
- Whitelisted emojis: `['❤️','😂','😮','👏','🔥','💯','😭','🎉']`.
- Emitting a reaction creates a temporary floating badge in the 3D viewport that floats upward with CSS animations and self-destructs after 3,000 milliseconds.

---

# 9. ROLE-BASED ACCESS CONTROL (RBAC) & SECURITY ARCHITECTURE

### 9.1 Permissions Matrix

| Action / Capability | Host (`host`) | Moderator (`moderator`) | Member (`participant`) | Backend Enforcement Method |
| :--- | :---: | :---: | :---: | :--- |
| Play / Pause / Seek | ✅ | ✅ | ❌ | `_requireControl(socket, room)` |
| Change YouTube Video | ✅ | ✅ | ❌ | `_requireControl(socket, room)` |
| Request Playback Control | ❌ (Owns it) | ❌ (Owns it) | ✅ | Emits `control_requested` to Host |
| Promote to Moderator | ✅ | ❌ | ❌ | `_requireHost(socket, room)` |
| Demote Moderator | ✅ | ❌ | ❌ | `_requireHost(socket, room)` |
| Transfer Host Ownership | ✅ | ❌ | ❌ | `_requireHost(socket, room)` |
| Remove (Kick) Participant | ✅ | ❌ | ❌ | `_requireHost(socket, room)` |
| Send Chat & Reactions | ✅ | ✅ | ✅ | `_requireRoom(socket)` |

### 9.2 Client Hiding vs. Server Enforcement
A common junior mistake is relying solely on hiding buttons in the React UI (`{!canControl && ...}`). Any attacker can open browser DevTools and execute:
```javascript
socket.emit('change_video', { videoId: 'malicious_id' });
```
In WatchCraft, the backend strictly verifies role permissions on **every single state-altering event** in `MessageHandler.js`:
```javascript
_requireControl(socket, room) {
  const p = room.getParticipant(socket.id);
  if (!p || !p.canControl()) {
    this._error(socket, 'Permission denied: only Host or Moderator can control playback');
    return false;
  }
  return true;
}
```
If an unauthorized member emits `change_video` or `seek`, the backend blocks execution, emits an `'error'` event back to the sender, and leaves the room state intact.

---

# 10. DATABASE, PERSISTENCE & ROOM LIFECYCLE

### 10.1 Dual-Tier In-Memory & MongoDB Persistence Strategy
WatchCraft implements a dual-tier persistence model:

```
┌────────────────────────────────────────────────────────┐
│                   IN-MEMORY (RAM)                      │
│   RoomRegistry.js + Room.js + Participant.js           │
│   • Sub-millisecond latency for 60 FPS video sync      │
│   • Active Socket.IO client mappings                   │
│   • Instantaneous role promotions and kicks            │
└──────────────────────────┬─────────────────────────────┘
                           │ Async Background Sync
                           ▼
┌────────────────────────────────────────────────────────┐
│                PERSISTENT (MONGODB)                    │
│   Room.model.js (Mongoose ODM)                         │
│   • Room metadata (roomId, name, genre, visibility)    │
│   • Public room discovery across server restarts       │
│   • 24-Hour TTL Auto-Cleanup for dead rooms            │
└────────────────────────────────────────────────────────┘
```

### 10.2 Database Resilience & Local Fallback
In `watchly-backend/src/db/mongodb.js`, if the remote MongoDB Atlas connection fails or encounters a network timeout, WatchCraft automatically falls back to local MongoDB (`mongodb://127.0.0.1:27017/watchly`). If MongoDB is completely unavailable, the backend logs a warning and continues running using pure in-memory state, ensuring watch parties function even during database outages.

---

# 11. THE 3D ROOM, HYBRID RENDERING & FIRST-PERSON EXPERIENCE

### 💡 In Plain English: The Glass Window Illusion (Quick Mental Model)
Why couldn't we just paint the YouTube video onto a 3D box inside the game engine?
Because of web browser security (CORS): Google and YouTube will not let an outside 3D canvas read their live video pixels directly.
So we used a hybrid optical illusion:
- We render the 3D room using Three.js (walls, sofa, computer desk, lighting).
- Right where the TV sits on the wall, we position a real web browser iframe floating in front of it using `CSS3DRenderer`.
- Every single frame (60 times a second), we run 3D math that rotates and tilts the YouTube iframe so it matches the 3D room down to the millimeter.
- When you drag your mouse or swipe your finger on a phone screen, your head turns, and the TV perspective shifts just like looking around a real apartment!

### 11.1 Scene Construction & Asset Pipeline
- **Three.js WebGL Scene (`WatchRoom3D.jsx`)**:
  - Perspective camera placed at sofa seated position: `CAM_POS = (-0.5, 1.8, 1.63)`.
  - Look direction target: `CAM_TARGET = (4.2, 2.5, 1.63)` facing television.
  - GLTF models loaded via `DRACOLoader` (`roomModel.glb`, `topChairModel.glb`). Draco decompressor wasm runs in background web workers, reducing 3D model payload sizes by ~70%.
  - Custom `ShaderMaterial` blending day baked textures (`bakedDay.jpg`), night textures (`bakedNight.jpg`), neutral textures, and lightmaps (`lightMap.jpg`).
  - Animated computer displays: looping HTML5 video textures mapped to `pcScreenModel.glb` and `macScreenModel.glb`.

### 11.2 Camera Kinematics & Rotation Clamping
The camera calculates view matrices using yaw/pitch spherical coordinates with Linear Interpolation (`LERP = 0.12`) for smooth dampening:
```javascript
const YAW_RANGE = Math.PI / 2; // ±90° horizontal range (180° total)
const PITCH_MAX = 0.35;        // Clamped vertical look up
const PITCH_MIN = -0.35;       // Clamped vertical look down
```
Users can freely look around the apartment without causing disorienting 360° camera gimbal flips.

### 11.3 Hybrid WebGL + CSS3D Composition Engine
The core technical challenge: **How do you embed an interactive YouTube player directly inside a 3D WebGL room?**
- A 3D WebGL television mesh (`PlaneGeometry(4.218, 2.372)`) is rendered in the Three.js scene with a pure black material (`#000000`).
- A `CSS3DRenderer` DOM element is layered directly over the WebGL canvas.
- A `CSS_SCALE` factor (`1280 / 4.218 ≈ 303.46`) normalizes Three.js meters to CSS pixel coordinates.
- A `CSS3DObject` wrapping the 1280x720 YouTube iframe is anchored to `(4.208 * CSS_SCALE, 2.6654 * CSS_SCALE, 1.8214 * CSS_SCALE)` with rotation `Y = -Math.PI * 0.5`.
- Every frame, `cssCamera` synchronizes its position, FOV, and quaternion with the WebGL `camera`, locking the video surface to the television screen with sub-pixel precision.

### 11.4 Case Study: Production YouTube Black-Screen Bug
**Symptom**: On local development (`http://localhost:5173`), video rendered perfectly. On production HTTPS (`https://watchcraftt.netlify.app`), YouTube audio played, but the TV remained pitch black.

**Investigation & Root Cause Analysis**:
1. **Chrome MPO Hardware Video Overlay Failure**: On Windows HTTPS environments, Chromium delegates cross-origin video decoding to hardware overlay planes (Multiplane Overlay / DirectComposition).
2. When an iframe is transformed inside nested 3D CSS matrices (`matrix3d`), if any parent container has `overflow: hidden` or an opaque background (`background: #000000`), Chrome's compositor treats it as an occluded layer. It decodes audio normally but suppresses the video surface composition.
3. Setting `.wr3d-css3d-tv` and `.wr3d-yt-player-container` to `background: transparent !important;` and `overflow: visible !important;` restored hardware video frame composition.
4. Setting real video IDs in `frame.src` immediately prior to `new YT.Player()` attachment prevented the player from initializing in a broken empty-embed state.

### 🗣️ How to Explain the 3D Room in an Interview
*"To render interactive YouTube video inside a 3D environment without running into cross-origin canvas security limitations, I implemented a hybrid WebGL and CSS3D rendering pipeline. Three.js renders the ambient 3D apartment geometry, while CSS3DRenderer maps the native YouTube iframe to the television mesh using CSS3 `matrix3d` transforms. I clamped the first-person camera kinematics to 180 degrees horizontally and 40 degrees vertically with smooth linear interpolation dampening, ensuring natural head rotation while preventing disorienting gimbal flips. I also supported both mouse drag on desktop and touch gestures on mobile."*

---

# 12. FULLSCREEN, CAMERA RESET & LOCAL PRESENTATION STATE

- **Local Presentation Independence**: Fullscreen, camera look rotation, and volume are strictly **local client display states**.
- When a user enters Fullscreen, camera FOV smoothly interpolates from 65° to 52° (focusing tightly on the TV screen).
- These presentation changes are intentionally **never transmitted over WebSockets**, ensuring one user entering fullscreen does not force or disrupt other participants' viewports.

---

# 13. BACKEND REQUEST LIFECYCLE, EXPRESS & SERVER STARTUP

1. **Bootstrap Sequence (`watchly-backend/src/index.js`)**:
   - `require('dotenv').config()` loads environment configurations.
   - `connectDB()` initializes Mongoose connection pool.
   - Express sets up CORS with regex origin matching (`CLIENT_URL`, `*.netlify.app`, `*.onrender.com`).
   - `http.createServer(app)` binds HTTP and Socket.IO servers to port `10000`.
2. **Health Check Endpoint (`GET /health`)**:
   - Returns server uptime, total active rooms, and live socket connection counts for uptime monitors (e.g., Render keep-alive pings).

---

# 14. PRODUCTION DEPLOYMENT & ENVIRONMENT CONFIGURATION

### 14.1 Deployment Topology
- **Frontend**: Deployed on **Netlify** as a static Vite Single Page Application.
- **Backend**: Deployed on **Render** as a Node.js web service running Socket.IO.
- **Database**: **MongoDB Atlas** M0 Free Tier replica set.

### 14.2 Environment Variables Reference Table

| Variable Name | Environment | Purpose | Required | Example Safe Value |
| :--- | :--- | :--- | :---: | :--- |
| `VITE_BACKEND_URL` | Frontend (.env) | WebSocket & REST API endpoint | Yes | `https://watchcraft-backend.onrender.com` |
| `PORT` | Backend (.env) | HTTP / WebSocket server listen port | Yes | `10000` |
| `CLIENT_URL` | Backend (.env) | CORS allowed origin for frontend | Yes | `https://watchcraftt.netlify.app` |
| `MONGODB_URI` | Backend (.env) | MongoDB connection string | No (Falls back to local) | `mongodb+srv://user:pass@cluster.mongodb.net/watchly` |
| `NODE_ENV` | Backend (.env) | Runtime environment mode | No | `production` |

---

# 15. SCALABILITY ANALYSIS: CURRENT STATE & FUTURE ARCHITECTURE

### 15.1 Current Single-Process Architecture
WatchCraft currently runs as a **single Node.js backend instance**.
- **Strengths**: In-memory `RoomRegistry` Maps provide microsecond lookups with zero network overhead. All connected sockets in a room share the same process memory.
- **Limitations**: If two backend instances are launched behind a round-robin load balancer, Socket A connected to Instance 1 cannot communicate with Socket B connected to Instance 2.

### 15.2 Proposed Multi-Instance Horizontal Scaling Roadmap

```mermaid
graph TB
    Client1[Client A - Browser]
    Client2[Client B - Browser]
    LB[Cloud Load Balancer - AWS ALB / NGINX with Sticky Sessions]
    
    subgraph Instances [Horizontally Scaled Node.js Cluster]
        Node1[Node Instance 1 - Socket.IO]
        Node2[Node Instance 2 - Socket.IO]
    end
    
    subgraph ClusterState [Shared Memory & State Layer]
        RedisPubSub[(Redis Pub/Sub - Socket.IO Redis Adapter)]
        RedisStore[(Redis Key-Value - Shared Room State Store)]
    end
    
    DB[(MongoDB Atlas - Persistent Cold Storage)]

    Client1 -->|WSS Connection| LB
    Client2 -->|WSS Connection| LB
    LB -->|Sticky Hash| Node1
    LB -->|Sticky Hash| Node2

    Node1 <-->|"Broadcast Events"| RedisPubSub
    Node2 <-->|"Broadcast Events"| RedisPubSub

    Node1 <-->|"Atomic Room State Lookups"| RedisStore
    Node2 <-->|"Atomic Room State Lookups"| RedisStore

    Node1 -.->|Async Persistence| DB
    Node2 -.->|Async Persistence| DB
```

1. **Sticky Sessions (Session Affinity)**: Required during Socket.IO's initial HTTP long-polling handshake before upgrading to WebSockets.
2. **Socket.IO Redis Adapter (`@socket.io/redis-adapter`)**: Distributes broadcast packets across all Node instances using Redis Pub/Sub channels.
3. **Shared Distributed State Store**: Migrating `RoomRegistry` Maps to Redis Hashes so room metadata is accessible across all cluster nodes.

---

# 16. ENGINEERING DECISIONS & ARCHITECTURAL TRADE-OFFS

| Decision | Approach Chosen | Alternative Considered | Engineering Rationale & Trade-Off |
| :--- | :--- | :--- | :--- |
| **Video Delivery** | Native YouTube IFrame API + Time Sync | WebRTC Screen Sharing | **Pro**: Zero video re-encoding server bandwidth; native 4K YouTube playback. **Con**: Limited strictly to YouTube content. |
| **3D Video Surface** | `CSS3DRenderer` Overlay | WebGL `VideoTexture` | **Pro**: Bypasses CORS cross-origin canvas security errors. **Con**: Requires precise mathematical camera synchronization. |
| **Room Catalog** | In-Memory Maps (`RoomRegistry`) | MongoDB on every event | **Pro**: Sub-millisecond lookup latency for 60 FPS video sync. **Con**: Active room memory is process-local. |
| **Room Codes** | 6-char Alphanumeric NanoID (`X7K9PQ`) | Long UUID v4 | **Pro**: Easy for human verbal sharing. **Con**: Requires collision check (`unique` DB index). |
| **State Ownership**| Authoritative Server Playback Clock | Peer-to-Peer Consensus | **Pro**: Single source of truth prevents synchronization divergence. **Con**: Network latency between host and server. |
| **Player Controls**| Custom Floating Playback Bar | Default YouTube Controls | **Pro**: Enforces RBAC permissions cleanly; consistent UI styling. **Con**: Must replicate seek, time, and mute logic. |

---

# 17. COMPREHENSIVE TECHNICAL INTERVIEW QUESTION BANK (80+ QUESTIONS & ANSWERS)

### GROUP A: Project & High-Level Architecture

#### Q1 (Basic): What is WatchCraft in one concise sentence?
- **Answer**: WatchCraft is a real-time web application that allows remote groups to watch synchronized YouTube videos together inside an interactive 2D desktop OS and an immersive 3D apartment theater.
- **Source Reference**: `src/App.jsx`, `src/WatchRoom3D.jsx`.
- **Likely Follow-up**: *Why combine a 2D RPG room with a 3D theater?*
- **Follow-up Answer**: The 2D layer gamifies community entry and discovery, while the 3D room provides a cinematic spatial experience without external VR headsets.

#### Q2 (Basic): What problem does WatchCraft solve compared to standard screen-sharing apps like Discord?
- **Answer**: Screen sharing re-encodes video pixels, consuming high upload bandwidth and degrading video quality. WatchCraft only transmits lightweight JSON synchronization packets over WebSockets (~120 bytes), allowing each participant to stream native high-definition video directly from YouTube.
- **Source Reference**: `src/WatchRoom3D.jsx`, `watchly-backend/src/classes/MessageHandler.js`.

#### Q3 (Intermediate): Explain the end-to-end data flow when a user creates a room.
- **Answer**: The frontend emits `create_room` with metadata. `MessageHandler._onCreateRoom` validates inputs, calls `RoomRegistry.create()` which generates a 6-character NanoID room code, instantiates an in-memory `Room` object, adds the creator as `'host'`, joins the socket to the room channel, asynchronously saves the room to MongoDB, and returns an acknowledgment containing the room state.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#47-104`.

#### Q4 (Intermediate): Why does WatchCraft have both REST endpoints and WebSocket events for rooms?
- **Answer**: REST endpoints (`GET /api/rooms`) handle stateless on-demand queries like fetching room lists during discovery before a user enters a room. WebSockets handle stateful, bidirectional, low-latency events (playback sync, chat, user joins) where HTTP polling would introduce unacceptable latency and server overhead.
- **Source Reference**: `watchly-backend/src/routes/rooms.js`, `watchly-backend/src/classes/MessageHandler.js`.

#### Q5 (Advanced): How does WatchCraft manage state persistence between RAM and MongoDB?
- **Answer**: Active rooms reside in RAM via `RoomRegistry.rooms` for zero-latency video clock updates. Room metadata is saved to MongoDB on creation and updated asynchronously during viewer count changes. If an inactive room is requested, the backend attempts to recover it from MongoDB into RAM before failing.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#121-143`.

#### Q6 (Advanced): What happens if the backend server crashes or restarts?
- **Answer**: Active in-memory `Room` instances and transient chat messages are cleared. However, room metadata persisted in MongoDB remains. When clients reconnect, `join_room` detects the room in MongoDB, re-instantiates it in `RoomRegistry`, and restores the creator as Host based on persistent `userId`.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#121-143`, `watchly-backend/src/classes/Room.js#55-105`.

#### Q7 (Basic): Which frontend libraries are responsible for graphics in WatchCraft?
- **Answer**: Three.js handles WebGL rendering of the 3D apartment, Draco handles mesh decompression, and CSS3DRenderer projects the HTML YouTube iframe into 3D space.
- **Source Reference**: `src/WatchRoom3D.jsx#11-14`.

#### Q8 (Intermediate): How does the application identify returning users across browser refreshes?
- **Answer**: In `src/socket.js`, `getPersistentUserId()` generates a random unique identifier (e.g., `usr_x8k2...`) stored in browser `localStorage`. When reconnecting, this persistent ID is transmitted along with the transient `socket.id`.
- **Source Reference**: `src/socket.js#53-65`.

---

### GROUP B: React & Frontend Engineering

#### Q9 (Basic): How does React mount the application root?
- **Answer**: `src/main.jsx` uses React 18's `createRoot(document.getElementById('root')).render(<App />)` to initiate concurrent rendering.
- **Source Reference**: `src/main.jsx`.

#### Q10 (Basic): What is the role of `App.jsx` in the component hierarchy?
- **Answer**: `App.jsx` acts as the root screen state coordinator, transitioning the user from `Preloader` to `StartScreen` to `GameRoomScreen`, while initializing global audio.
- **Source Reference**: `src/App.jsx#28-76`.

#### Q11 (Intermediate): Why does `WatchRoom3D.jsx` use mutable `useRef` objects for camera look state instead of `useState`?
- **Answer**: Camera mouse/touch look updates on every `mousemove` or `requestAnimationFrame` tick (60–120 times per second). Storing camera yaw and pitch in `useState` would trigger 60–120 full React component re-renders per second, destroying performance. Storing them in `look.current` updates values instantly without triggering React reconciliation.
- **Source Reference**: `src/WatchRoom3D.jsx#172-176`.

#### Q12 (Intermediate): What is the purpose of `isSyncingRef` in `WatchRoom3D.jsx`?
- **Answer**: It is an echo-suppression flag. When a remote `sync_state` event programmatically updates the YouTube player (`seekTo` or `playVideo`), the YouTube API fires local state change events. `isSyncingRef` prevents these programmatic events from being emitted back to the server as user actions.
- **Source Reference**: `src/WatchRoom3D.jsx#200`, `src/WatchRoom3D.jsx#708-720`.

#### Q13 (Advanced): How does `WatchRoom3D.jsx` clean up Three.js resources when the component unmounts?
- **Answer**: In the `useEffect` return cleanup callback, it cancels `requestAnimationFrame(rafRef.current)`, removes window event listeners (`resize`, `mousemove`, `touchmove`), traverses the 3D scene to dispose geometries and materials, pauses looping video textures, disposes WebGL and CSS3D renderers, and destroys the `YT.Player` instance.
- **Source Reference**: `src/WatchRoom3D.jsx#618-643`.

#### Q14 (Intermediate): Why are controlled inputs used in the chat composer?
- **Answer**: `chatInput` is bound to React state via `value={chatInput}` and `onChange={(e) => setChatInput(e.target.value)}`. This guarantees instantaneous input validation, length trimming (`maxLength={400}`), and clean resetting upon message submission.
- **Source Reference**: `src/WatchRoom3D.jsx#1637-1650`.

#### Q15 (Intermediate): How does the chat unread indicator work?
- **Answer**: `handleChatScroll` monitors scroll offset (`scrollHeight - scrollTop - clientHeight < 40`). If the user scrolls up to read history, `isUserAtBottomRef` is set to `false`. Incoming messages toggle `hasUnreadBelow = true`, rendering the "New messages" floating pill.
- **Source Reference**: `src/WatchRoom3D.jsx#1034-1050`.

#### Q16 (Basic): What does Vite do during production build?
- **Answer**: Vite runs Rollup to compile JSX into optimized vanilla JavaScript, bundles CSS modules, optimizes static assets, and outputs production files into `dist/`.
- **Source Reference**: `package.json#7`.

#### Q17 (Advanced): What is a stale closure in React, and how is it avoided in `WatchRoom3D.jsx`'s socket listeners?
- **Answer**: A stale closure occurs when an event listener captures state variables from an earlier render pass. In `WatchRoom3D.jsx`, mutable refs like `canControlRef`, `playStateRef`, and `currentTimeRef` are kept updated via `useEffect`, allowing socket callbacks to read current values without needing to tear down and re-attach socket listeners on every state change.
- **Source Reference**: `src/WatchRoom3D.jsx#228-232`.

---

### GROUP C: OOP & Backend Domain Modeling

#### Q18 (Basic): What is the primary purpose of the `RoomRegistry` class?
- **Answer**: To maintain the central in-memory collection of active rooms and provide O(1) room lookups by room ID and socket ID.
- **Source Reference**: `watchly-backend/src/classes/RoomRegistry.js#10-17`.

#### Q19 (Intermediate): Explain how `_socketToRoom` in `RoomRegistry` improves lookup performance.
- **Answer**: It functions as an inverted index. Rather than iterating through all rooms and checking every participant map (O(N*M)), it performs a direct O(1) hash map lookup from `socket.id` to `roomId`.
- **Source Reference**: `watchly-backend/src/classes/RoomRegistry.js#49-52`.

#### Q20 (Intermediate): How does `Room.js` demonstrate the Principle of Encapsulation?
- **Answer**: `Room.js` encapsulates its internal data structures (`participants` Map, `videoState` object). External callers do not mutate these directly; they invoke public domain methods like `addParticipant()`, `removeParticipant()`, and `updateVideoState()`.
- **Source Reference**: `watchly-backend/src/classes/Room.js#55-162`.

#### Q21 (Basic): What does the `Participant` class encapsulate?
- **Answer**: It models a connected user's identity (`socketId`, `userId`, `username`, `role`) and encapsulates permission checks via `canControl()` and `isHost()`.
- **Source Reference**: `watchly-backend/src/classes/Participant.js#4-27`.

#### Q22 (Intermediate): What is the difference between `Participant.toPublic()` and the raw `Participant` instance?
- **Answer**: `toPublic()` strips internal server metadata, exposing only safe fields (`userId`, `socketId`, `username`, `role`, `joinedAt`) for broadcast to other clients.
- **Source Reference**: `watchly-backend/src/classes/Participant.js#30-38`.

#### Q23 (Advanced): How does `MessageHandler` implement the Controller / Facade pattern?
- **Answer**: `MessageHandler` receives incoming raw Socket.IO event payloads, validates types, enforces role guards, and delegates business logic to `Room` and `RoomRegistry` domain models without leaking network socket code into domain classes.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#22-39`.

#### Q24 (Intermediate): What happens in `Room.js` when a host disconnects?
- **Answer**: `removeParticipant()` checks if the leaving user was host. If yes, it promotes an existing Moderator to Host. If no Moderator exists, it promotes the oldest Participant, updating `this.hostUserId`.
- **Source Reference**: `watchly-backend/src/classes/Room.js#144-159`.

#### Q25 (Advanced): How does `Room.js` preserve original creator privileges upon reconnect?
- **Answer**: `Room.js` stores `this.creatorUserId`. When a user reconnects with that persistent ID, `addParticipant()` automatically restores their `'host'` role and demotes any temporary host back to their prior role.
- **Source Reference**: `watchly-backend/src/classes/Room.js#65-88`.

#### Q26 (Intermediate): Why are ES6 Classes used on the backend instead of plain object literals?
- **Answer**: Classes provide explicit constructor contracts, encapsulated state, prototype method inheritance, and cleaner domain modeling for complex entity lifecycles.
- **Source Reference**: `watchly-backend/src/classes/Room.js`.

---

### GROUP D: WebSockets & Socket.IO

#### Q27 (Basic): What is the difference between HTTP and WebSockets?
- **Answer**: HTTP is a stateless, unidirectional request-response protocol over TCP. WebSockets provide a persistent, full-duplex, bidirectional communication channel over a single TCP connection.
- **Source Reference**: `src/socket.js`, `watchly-backend/src/index.js#29-38`.

#### Q28 (Basic): What advantages does Socket.IO provide over native WebSockets?
- **Answer**: Socket.IO adds automatic reconnection, connection state recovery, channel multiplexing ("rooms"), packet buffering during disconnects, and automatic HTTP long-polling fallback.
- **Source Reference**: `src/socket.js#16-22`.

#### Q29 (Intermediate): What is a Socket.IO "room"?
- **Answer**: A server-side virtual channel grouping a subset of connected sockets. Emitting `io.to(roomId).emit(...)` broadcasts messages only to sockets subscribed to that specific room ID.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#69`, `watchly-backend/src/classes/Room.js#250-252`.

#### Q30 (Intermediate): What is an acknowledgment callback in Socket.IO?
- **Answer**: A request-response pattern over WebSockets. The client emits an event with data and a callback function; the server processes the event and executes the callback with a response payload.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#25`, `src/WatchlyDesktop.jsx#110`.

#### Q31 (Advanced): What causes duplicate event listener bugs in Socket.IO and React?
- **Answer**: If `socket.on('event', handler)` is registered inside a React component without returning a cleanup function in `useEffect` (`socket.off('event', handler)`), every component re-render registers an additional duplicate listener, causing events to execute multiple times.
- **Source Reference**: `src/WatchRoom3D.jsx#1006-1026`.

#### Q32 (Intermediate): How does WatchCraft handle transport negotiation in Socket.IO?
- **Answer**: Configured with `transports: ['websocket', 'polling']`. It attempts high-performance WebSocket connection first, but can gracefully fall back to HTTP long-polling if restrictive firewalls block WebSocket upgrades.
- **Source Reference**: `src/socket.js#17`, `watchly-backend/src/index.js#35`.

#### Q33 (Intermediate): What ping interval and timeout are configured on the Socket.IO server?
- **Answer**: `pingInterval: 25000` (25s heartbeat packet) and `pingTimeout: 60000` (considers client disconnected if no heartbeat response within 60s).
- **Source Reference**: `watchly-backend/src/index.js#36-37`.

#### Q34 (Advanced): Why does `MessageHandler` unregister the socket from `_socketToRoom` on disconnect?
- **Answer**: To prevent memory leaks and stale reverse lookups. If a socket disconnects, keeping its ID in the registry would cause future lookup collisions if that socket ID is reassigned.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#525`.

#### Q35 (Basic): Which event is broadcast when a participant is removed by the host?
- **Answer**: `participant_removed` is broadcast to all remaining room members, while `kicked` is emitted directly to the target socket.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#391-394`.

#### Q36 (Intermediate): How does a client join a Socket.IO room channel on the backend?
- **Answer**: By calling `socket.join(room.roomId)` inside `_onCreateRoom` and `_onJoinRoom`.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#69`, `watchly-backend/src/classes/MessageHandler.js#155`.

---

### GROUP E: Real-Time Playback Synchronization

#### Q37 (Basic): What is "authoritative playback state"?
- **Answer**: The server acts as the single source of truth for video playback parameters (`videoId`, `currentTime`, `playState`). Individual clients synchronize their local players to this server clock.
- **Source Reference**: `watchly-backend/src/classes/Room.js#35-40`.

#### Q38 (Intermediate): What happens when the host presses Pause?
- **Answer**: Host browser emits `pause` with `{ time }`. Backend validates host permission, updates `room.videoState.playState = 'paused'`, and broadcasts `sync_state` to all room members. Member browsers receive the event and call `player.pauseVideo()`.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#265-283`.

#### Q39 (Intermediate): What is WatchCraft's drift threshold, and why is it 0.8 seconds?
- **Answer**: `0.8` seconds. If drift is under 800ms, minor micro-variations are ignored to prevent audible stutter. If drift exceeds 800ms, the player snaps to the server time via `seekTo()`.
- **Source Reference**: `src/WatchRoom3D.jsx#986-990`.

#### Q40 (Advanced): How does WatchCraft handle late joiners entering an ongoing video?
- **Answer**: Upon joining, the server emits `sync_state` containing the current `videoId`, `playState`, and `currentTime`. The joining client initializes the YouTube player directly to that video and seeks to the exact elapsed timestamp.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#180-185`, `src/WatchRoom3D.jsx#695-715`.

#### Q41 (Intermediate): Why is the YouTube IFrame API loaded dynamically in `WatchRoom3D.jsx`?
- **Answer**: `loadYTApi()` injects the script tag `https://www.youtube.com/iframe_api` on-demand and returns a Promise that resolves when `window.YT.Player` is ready, preventing blocking page load scripts.
- **Source Reference**: `src/WatchRoom3D.jsx#84-114`.

#### Q42 (Intermediate): What does the periodic 5-second heartbeat in `WatchRoom3D.jsx` do?
- **Answer**: While the video is playing, the host's client periodically sends `seek` updates every 5 seconds to keep the server's in-memory `currentTime` accurate without requiring high-frequency flooding.
- **Source Reference**: `src/WatchRoom3D.jsx#838-854`.

#### Q43 (Advanced): How does WatchCraft detect a host's native scrubber seek vs normal playback?
- **Answer**: The 500ms ticker compares current time with previous time. If `Math.abs(cur - (prev + 0.5)) > 2.0`, it detects a manual scrubber jump and emits `seek`.
- **Source Reference**: `src/WatchRoom3D.jsx#814-818`.

#### Q44 (Basic): What parameters are passed in the YouTube embed URL?
- **Answer**: `enablejsapi=1`, `autoplay=1`, `controls=0`, `rel=0`, `playsinline=1`, `modestbranding=1`, and `origin=window.location.origin`.
- **Source Reference**: `src/WatchRoom3D.jsx#685-693`.

#### Q45 (Intermediate): What happens if a regular participant clicks play on their local video without host permission?
- **Answer**: In `onStateChange`, the client detects `!canControl`. If the room state is paused, the client immediately forces `player.pauseVideo()`, preventing unauthorized playback divergence.
- **Source Reference**: `src/WatchRoom3D.jsx#729-735`.

#### Q46 (Basic): How is the video duration formatted on the UI playback bar?
- **Answer**: `fmtDuration(seconds)` calculates hours, minutes, and seconds, padding with leading zeroes (e.g., `04:12` or `01:15:30`).
- **Source Reference**: `src/WatchRoom3D.jsx#116-128`.

---

### GROUP F: Live Chat & Real-Time Messaging

#### Q47 (Basic): Are chat messages permanently stored in MongoDB?
- **Answer**: No. Chat messages in WatchCraft are transient in-memory events broadcast in real-time to active room participants and are not saved to the database.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#462-479`.

#### Q48 (Intermediate): What payload validation is applied to incoming chat messages?
- **Answer**: Messages must have non-empty text and are trimmed and capped at 500 characters on the backend (`text.trim().slice(0, 500)`).
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#469`.

#### Q49 (Basic): How does the backend determine who sent a chat message?
- **Answer**: It looks up the sender from the authenticated socket session (`room.getParticipant(socket.id)`), attaching the participant's verified `username` and `role`.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#466-478`.

#### Q50 (Intermediate): How is chat history limited in the React frontend?
- **Answer**: Messages are capped at the latest 200 items in state (`setMessages(m => [...m.slice(-199), msg])`) to prevent unbounded memory growth in long sessions.
- **Source Reference**: `src/WatchRoom3D.jsx#1012`.

#### Q51 (Basic): What emojis are allowed in WatchCraft reactions?
- **Answer**: A whitelist of eight emojis: `'❤️'`, `'😂'`, `'😮'`, `'👏'`, `'🔥'`, `'💯'`, `'😭'`, `'🎉'`.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#492`.

#### Q52 (Intermediate): What happens to chat history when a user refreshes their browser?
- **Answer**: Because chat messages are ephemeral, refreshing the browser clears past chat history for that user, though they rejoin the room and receive live messages.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#462-479`.

---

### GROUP G: RBAC, Permissions & Security

#### Q53 (Basic): What roles exist in WatchCraft?
- **Answer**: Three roles: `'host'` (full control and management), `'moderator'` (playback and video control), and `'participant'` (view, chat, and react).
- **Source Reference**: `watchly-backend/src/classes/Participant.js#9`.

#### Q54 (Intermediate): What happens if a Participant manually emits a `change_video` event via the browser console?
- **Answer**: The server checks `_requireControl(socket, room)`. Since the participant's role is not `'host'` or `'moderator'`, the server blocks execution, emits an error message, and does not alter the video state.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#313-316`, `watchly-backend/src/classes/MessageHandler.js#572-579`.

#### Q55 (Intermediate): How does a member request playback control?
- **Answer**: Member clicks "Request Playback Control", emitting `request_control`. The backend verifies the user and emits `control_requested` strictly to the Host's socket.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#440-456`.

#### Q56 (Intermediate): Can a Host kick another Host?
- **Answer**: No. `_onRemoveParticipant` verifies `if (target.isHost()) return this._error(socket, 'Cannot remove host')`.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#382`.

#### Q57 (Advanced): What happens on the kicked participant's browser when removed?
- **Answer**: The participant receives `kicked`. The client immediately stops the YouTube player, resets state, and triggers `onExit()`, redirecting them back to the desktop operating system.
- **Source Reference**: `src/WatchRoom3D.jsx#1002-1013`.

#### Q58 (Intermediate): Why can't a Moderator promote other users or kick members?
- **Answer**: `_onAssignRole` and `_onRemoveParticipant` use `_requireHost()`, which strictly checks `p.isHost()`. Moderators only pass `_requireControl()`.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#344`, `watchly-backend/src/classes/MessageHandler.js#375`.

#### Q59 (Basic): How is CORS configured on the backend?
- **Answer**: Express and Socket.IO check origins against `CLIENT_URL` and regex patterns matching `*.onrender.com`, `*.netlify.app`, and `*.vercel.app` with `credentials: true`.
- **Source Reference**: `watchly-backend/src/index.js#22-34`.

#### Q60 (Advanced): What security risk exists when trusting `userId` from client storage?
- **Answer**: A malicious client could manipulate `localStorage` to spoof another user's `userId`. In an enterprise production app, this would be replaced with cryptographically signed JSON Web Tokens (JWT) or server-issued session cookies.
- **Source Reference**: `src/socket.js#53-65`.

---

### GROUP H: Database, Mongoose & Persistence

#### Q61 (Basic): What Mongoose model is defined in WatchCraft?
- **Answer**: `RoomModel`, representing persistent room documents in the `rooms` MongoDB collection.
- **Source Reference**: `watchly-backend/src/models/Room.model.js`.

#### Q62 (Intermediate): What is the TTL index configured in `Room.model.js`?
- **Answer**: An expiration index on `updatedAt` with `{ expireAfterSeconds: 86400, partialFilterExpression: { isActive: false } }`, causing MongoDB to automatically delete inactive rooms after 24 hours.
- **Source Reference**: `watchly-backend/src/models/Room.model.js#66-67`.

#### Q63 (Intermediate): What happens when `connectDB()` fails to connect to MongoDB Atlas?
- **Answer**: It logs a warning and attempts a fallback connection to local MongoDB (`127.0.0.1:27017`). If both fail, it continues running in memory without crashing the server.
- **Source Reference**: `watchly-backend/src/db/mongodb.js#8-37`.

#### Q64 (Basic): How are room IDs formatted in the database?
- **Answer**: 6-character uppercase alphanumeric strings indexed with `unique: true`.
- **Source Reference**: `watchly-backend/src/models/Room.model.js#8-14`.

#### Q65 (Intermediate): What happens when a lone host leaves a room?
- **Answer**: If the room becomes completely empty upon the host's exit, the backend deletes the room from both `RoomRegistry` memory and MongoDB immediately.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#550-556`.

#### Q66 (Intermediate): How does `isDBConnected()` check connection health?
- **Answer**: It checks `mongoose.connection.readyState === 1` (where 1 indicates an active connected state).
- **Source Reference**: `watchly-backend/src/db/mongodb.js#39-41`.

#### Q67 (Basic): Which genres are validated in the schema?
- **Answer**: An enum list: `'anime'`, `'education'`, `'movies'`, `'music'`, `'gaming'`, `'tvshows'`, `'other'`, `'sports'`.
- **Source Reference**: `watchly-backend/src/models/Room.model.js#25`.

#### Q68 (Advanced): Why doesn't WatchCraft write video time updates to MongoDB every second?
- **Answer**: Writing video time updates every second to MongoDB would create massive write-amplification and exhaust database I/O. Video time is managed in fast server RAM and persisted only when changing videos or closing rooms.
- **Source Reference**: `watchly-backend/src/classes/MessageHandler.js#297-307`.

---

### GROUP I: Three.js, CSS3DRenderer & Graphics

#### Q69 (Basic): What is the difference between WebGLRenderer and CSS3DRenderer?
- **Answer**: `WebGLRenderer` renders 3D meshes, textures, and shaders directly via the GPU onto an HTML `<canvas>`. `CSS3DRenderer` transforms regular DOM elements (like `<iframe>`) in 3D space using CSS3 `matrix3d()` transforms.
- **Source Reference**: `src/WatchRoom3D.jsx#249`, `src/WatchRoom3D.jsx#375`.

#### Q70 (Intermediate): Why can't a YouTube video be applied directly as a WebGL texture?
- **Answer**: Browser cross-origin security rules (CORS) prohibit WebGL from accessing raw pixel buffers from cross-origin iframes. Doing so throws a tainted canvas security error.
- **Source Reference**: `src/WatchRoom3D.jsx#427`.

#### Q71 (Advanced): What is `CSS_SCALE` in `WatchRoom3D.jsx` and why is it necessary?
- **Answer**: `CSS_SCALE` converts Three.js meters to CSS pixels (`1280 / 4.218 ≈ 303.46`). It normalizes the `CSS3DObject` scale matrix determinant to ~1.0, enabling Chromium's transformation matrix inversion to pass and allowing mouse and touch hit-testing on the projected DOM elements.
- **Source Reference**: `src/WatchRoom3D.jsx#392-398`.

#### Q72 (Intermediate): How does the custom shader in `WatchRoom3D.jsx` create day/night room lighting?
- **Answer**: It uses a `ShaderMaterial` with uniforms `uBakedDayTexture` and `uBakedNightTexture`, mixing between them using `uNightMix` and blending lightmaps for TV, desk, and PC lights.
- **Source Reference**: `src/WatchRoom3D.jsx#287-349`.

#### Q73 (Intermediate): How was the production black-screen issue diagnosed and resolved?
- **Answer**: On production HTTPS, Chromium hardware video overlays failed because parent CSS3D containers had opaque backgrounds and clipping bounds. Removing `overflow: hidden` and setting `background: transparent !important` allowed Chromium's compositor to composite the video surface.
- **Source Reference**: `src/WatchRoom3D.jsx#402-412`, `src/index.css#7026-7075`.

#### Q74 (Basic): How is camera mouse-look implemented?
- **Answer**: Dragging the mouse computes delta X and Y, updating target yaw and pitch angles clamped to ±90° horizontal and ±20° vertical, smoothed using linear interpolation.
- **Source Reference**: `src/WatchRoom3D.jsx#564-582`.

#### Q75 (Intermediate): How are mobile touch finger drag controls handled?
- **Answer**: `touchstart` tracks finger coordinates, while `touchmove` runs with `{ passive: false }` and invokes `e.preventDefault()` to stop browser viewport scrolling, updating camera angles with adjusted touch sensitivity (`0.0042`).
- **Source Reference**: `src/WatchRoom3D.jsx#589-618`.

#### Q76 (Basic): What is Draco decompression in glTF loading?
- **Answer**: An open-source compression library that dramatically reduces the file size of 3D geometric meshes, decoded in browser background WebAssembly threads.
- **Source Reference**: `src/WatchRoom3D.jsx#270-272`.

#### Q77 (Intermediate): What happens when the browser window is resized?
- **Answer**: The resize handler updates camera aspect ratios (`w / h`), calls `camera.updateProjectionMatrix()` on both WebGL and CSS3D cameras, and resizes both renderers.
- **Source Reference**: `src/WatchRoom3D.jsx#553-562`.

#### Q78 (Basic): What happens when the user clicks "Reset View"?
- **Answer**: `resetView()` resets target yaw and pitch to 0, smoothly rotating the camera back to center on the TV.
- **Source Reference**: `src/WatchRoom3D.jsx#645-648`.

---

### GROUP J: Deployment, Cloud & Scalability

#### Q79 (Basic): Where is the WatchCraft frontend deployed?
- **Answer**: Netlify as a high-availability static Single Page Application.
- **Source Reference**: `docs/DEPLOYMENT.md`.

#### Q80 (Basic): Where is the backend deployed?
- **Answer**: Render as an asynchronous Node.js Web Service running Express and Socket.IO.
- **Source Reference**: `watchly-backend/render.yaml`.

#### Q81 (Intermediate): How do environment variables differ between Vite frontend and Node backend?
- **Answer**: Vite frontend variables must be prefixed with `VITE_` (e.g., `VITE_BACKEND_URL`) and are embedded into the client bundle at build time. Backend variables (like `MONGODB_URI`, `PORT`) are read at runtime via `process.env`.
- **Source Reference**: `src/socket.js#6`, `watchly-backend/src/index.js#4`.

#### Q82 (Intermediate): What is horizontal scaling and how does it apply to WebSockets?
- **Answer**: Horizontal scaling adds multiple server instances behind a load balancer. For WebSockets, this requires sticky sessions for the handshake and a pub/sub message broker (like Redis) so instances can broadcast events across nodes.
- **Source Reference**: Section 15.2.

#### Q83 (Advanced): Why doesn't the Socket.IO Redis Adapter automatically sync custom in-memory room objects?
- **Answer**: The Redis adapter only broadcasts WebSocket packets between nodes. It does not synchronize custom process-local memory (like JavaScript `Map` objects). Synchronizing custom room state requires an external shared store like Redis Hashes.
- **Source Reference**: Section 15.2.

#### Q84 (Intermediate): What is the purpose of `_redirects` in the public directory?
- **Answer**: It instructs Netlify's server to route all incoming HTTP paths to `/index.html` with status 200 (`/* /index.html 200`), enabling client-side routing.
- **Source Reference**: `public/_redirects`.

#### Q85 (Basic): What is connection pooling in MongoDB?
- **Answer**: Maintaining a cache of active database connections that are reused across operations instead of opening and closing a new TCP connection for every query.
- **Source Reference**: `watchly-backend/src/db/mongodb.js`.

#### Q86 (Advanced): How would you conduct a load test on WatchCraft?
- **Answer**: Using a distributed tool like Artillery or k6 with WebSocket plugins to simulate 1,000 concurrent clients joining rooms, sending chat messages, and measuring latency and event loop delay.
- **Source Reference**: Section 15.2.

#### Q87 (Intermediate): How is mixed-content security avoided in production?
- **Answer**: Both frontend (`https://`) and backend (`https://` and `wss://`) run over SSL/TLS, preventing modern browsers from blocking insecure WebSocket connections.
- **Source Reference**: `docs/DEPLOYMENT.md`.

---

### GROUP K: Debugging, Production Incidents & Engineering Reflection

#### Q88 (Intermediate): What was the most difficult bug in WatchCraft and how did you resolve it?
- **Answer**: The production black-screen issue where audio played but the video was black. It was resolved by identifying that Chrome's hardware video compositor was occluded by opaque background styles on parent CSS3D containers, and correcting container transparency and iframe initialization order.
- **Source Reference**: `src/WatchRoom3D.jsx#402-412`.

#### Q89 (Intermediate): How do you distinguish a fatal video error from client ad-blocker warnings?
- **Answer**: Ad-blockers block telemetry requests (`www.youtube.com/generate_204`) with `ERR_BLOCKED_BY_CLIENT`, which are harmless. Real player errors fire via `YT.Player`'s `onError` callback with codes like 101 or 150 (embed restrictions).
- **Source Reference**: `src/WatchRoom3D.jsx#758-769`.

#### Q90 (Intermediate): What bug occurred with participant removal and how was it fixed?
- **Answer**: `RoomRegistry` stored participants by `socketId`, but `remove_participant` sent `userId`. `Room.removeParticipant` was updated to resolve either ID and delete using the true socket ID, while the frontend was updated to redirect kicked users immediately.
- **Source Reference**: `watchly-backend/src/classes/Room.js#134-162`.

#### Q91 (Advanced): What architectural improvement would you make if you had an additional month?
- **Answer**: I would replace process-local Maps with a distributed Redis state store and integrate signed JWT tokens for persistent user authentication.

#### Q92 (Basic): What is the primary lesson learned from building WatchCraft?
- **Answer**: Integrating 3D graphics with standard web APIs requires a clear understanding of browser compositing layers, hardware acceleration boundaries, and authoritative server state.

---

# 18. COMPLETE TECHNICAL DEMONSTRATION & INTERVIEW PRESENTATION SCRIPT

### Step-by-Step Live Demonstration Script

1. **Step 1: The Virtual 2D Exploration Hub**
   - *Action*: Launch application, move avatar around `GameRoomScreen` with WASD, walk up to NPC Heli and press `E`.
   - *Dialogue*: *"WatchCraft begins with an interactive 2D RPG room. Instead of a flat website, users explore a shared space, inspect artwork and legal policies, and approach the computer terminal."*
2. **Step 2: Virtual OS & Room Creation**
   - *Action*: Interact with the computer, boot WatchlyOS, click "Create Room", select "Anime", enter "Weekend Chill".
   - *Dialogue*: *"In WatchlyOS, clicking Create Room sends a `create_room` WebSocket packet. The backend instantiates an OOP `Room` model and returns a 6-character room code."*
3. **Step 3: Entering the 3D Apartment Theater**
   - *Action*: The UI transitions into `WatchRoom3D`. Look around with the mouse.
   - *Dialogue*: *"Now we enter the 3D theater. Three.js renders the room, while CSS3DRenderer projects an interactive DOM plane directly onto the TV screen. Camera yaw and pitch are clamped to preserve seated realism."*
4. **Step 4: Two-Client Playback Synchronization**
   - *Action*: Open an incognito browser window, enter room code, paste a YouTube link in the host window, and press Play.
   - *Dialogue*: *"WatchCraft uses an authoritative server clock. When I seek or play on the host window, only a 120-byte state packet is broadcast. The peer browser syncs within sub-second thresholds without video re-encoding."*
5. **Step 5: Role Permissions & Moderation**
   - *Action*: On peer window, show that controls are disabled. On host, promote peer to Moderator.
   - *Dialogue*: *"Our Role-Based Access Control is enforced on the server. Promoting a peer to Moderator grants playback control in real time."*
6. **Step 6: Mobile Touch & Finger Rotation**
   - *Action*: Open Chrome DevTools device mode (iPhone 14), demonstrate finger drag and mobile chat drawer.
   - *Dialogue*: *"On mobile devices, native scroll interception is prevented via `touch-action: none` and non-passive touchmove listeners, while chat folds into a responsive sliding drawer."*

---

# 19. GUIDED SOURCE CODE READING PLAN & 10-PHASE CURRICULUM

To master the codebase before an interview, follow this 10-phase sequence:

1. **Phase 1: Entry Point & Routing**: Read `src/main.jsx`, `src/App.jsx`, `src/GameRoomScreen.jsx`. Understand screen state flow.
2. **Phase 2: Virtual Desktop & Socket Client**: Read `src/ComputerSystem.jsx`, `src/WatchlyDesktop.jsx`, `src/socket.js`. Understand room code generation and persistent user IDs.
3. **Phase 3: Backend Server Initialization**: Read `watchly-backend/src/index.js`, `watchly-backend/src/routes/rooms.js`.
4. **Phase 4: Backend OOP Architecture**: Read `watchly-backend/src/classes/Participant.js`, `watchly-backend/src/classes/Room.js`, `watchly-backend/src/classes/RoomRegistry.js`.
5. **Phase 5: WebSocket Event Controller**: Read `watchly-backend/src/classes/MessageHandler.js`. Trace every event handler and role guard.
6. **Phase 6: Database Persistence**: Read `watchly-backend/src/models/Room.model.js`, `watchly-backend/src/db/mongodb.js`.
7. **Phase 7: 3D Scene & Hybrid Renderer**: Read `src/WatchRoom3D.jsx` (Three.js setup, glTF loading, CSS3DRenderer).
8. **Phase 8: YouTube Synchronization Engine**: Read `src/WatchRoom3D.jsx` (IFrame API lifecycle, `onSync`, drift snapping, echo suppression).
9. **Phase 9: Mobile Adaptations & CSS**: Read `src/index.css` (lines 6115–7793 for 3D styles, mobile media queries, and TV transparency).
10. **Phase 10: Mock Interview Rehearsal**: Review the 80+ Question Bank in Section 17.

---

# 20. GLOSSARY & QUICK REVISION MASTER SHEET

### 20.1 Technical Glossary
- **Authoritative Server**: An architecture where the central server owns the true state of the application, preventing client-side state divergence.
- **CSS3DRenderer**: A Three.js companion renderer that maps DOM elements into 3D scenes using CSS `matrix3d` transforms.
- **Draco Compression**: An open-source geometry compression library for 3D meshes.
- **Echo Suppression**: Guarding against feedback loops where remote updates trigger local change events that re-broadcast back to the server.
- **Linear Interpolation (LERP)**: A mathematical formula (`a + (b - a) * t`) used to smoothly transition values between frames.
- **Multiplane Overlay (MPO)**: A hardware compositor feature in modern OSs that renders video overlays directly on GPU planes.
- **RBAC (Role-Based Access Control)**: Restricting system operations based on assigned user roles.
- **Reverse Index**: An inverted index mapping child identifiers back to parent containers (e.g., `socketId -> roomId`) for O(1) lookups.
- **TTL Index**: A MongoDB index that automatically purges documents after an elapsed time.

### 20.2 Top 10 Architectural Facts to Memorize
1. **Zero Video Re-Streaming**: WatchCraft never streams video pixels; it synchronizes player clocks via 120-byte JSON WebSocket packets.
2. **Hybrid Renderer Architecture**: Three.js WebGL renders the apartment room; CSS3DRenderer projects the native YouTube iframe onto the 3D TV.
3. **Drift Threshold**: Time synchronization snaps players if drift exceeds **0.8 seconds**.
4. **Echo Guard**: `isSyncingRef` prevents remote sync updates from generating duplicate local client broadcasts.
5. **O(1) Reverse Index**: `RoomRegistry._socketToRoom` maps socket IDs directly to room IDs.
6. **Grace Period**: Empty rooms have a **15-minute grace period** before being purged from memory.
7. **Auto-Demotion/Promotion**: If a host leaves, the oldest Moderator (or Participant) is promoted. When the creator returns, Host is restored.
8. **Server-Side RBAC**: Permissions (`_requireControl`, `_requireHost`) are enforced on the backend, not just hidden in the React UI.
9. **Dual Persistence**: Rooms exist in fast RAM for 60 FPS clock sync, backed by MongoDB Atlas with a 24-hour TTL index.
10. **Mobile Touch Handling**: Canvas uses `touch-action: none !important;` and `{ passive: false }` touchmove listeners to enable 3D finger rotation without page scrolling.

### 20.3 Top 5 Advanced Interviewer Differentiators
1. *Explain how Chrome's DirectComposition pipeline caused the production black-screen bug and how you resolved it.*
2. *Describe the mathematical scale transformation (`CSS_SCALE`) required to hit-test DOM clicks inside a CSS3D scene.*
3. *Detail the race-condition protection used to prevent programmatic video seek events from triggering infinite echo loops.*
4. *Explain the architectural separation between process-local Socket.IO memory and distributed Redis scaling.*
5. *Demonstrate how the 2D RPG canvas, virtual OS desktop, and 3D WebGL theater isolate rendering lifecycles without React re-render thrashing.*

### 20.4 Strict "Do NOT Say" Accuracy Checklist
- ❌ **Do NOT say**: *"We re-stream video using WebRTC."* (Truth: You synchronize YouTube IFrame API clocks over WebSockets).
- ❌ **Do NOT say**: *"The video is a WebGL texture on the 3D TV mesh."* (Truth: It is an HTML iframe projected via CSS3DRenderer).
- ❌ **Do NOT say**: *"We currently run Redis and horizontal load balancers."* (Truth: The app runs as a single Node.js instance with an in-memory `RoomRegistry`, designed with a documented Redis scaling roadmap).
- ❌ **Do NOT say**: *"Chat messages are saved in MongoDB."* (Truth: Chat messages are ephemeral in-memory events broadcast in real time).
- ❌ **Do NOT say**: *"Camera look rotation is stored in React state."* (Truth: It is managed via mutable `useRef` to prevent 60 FPS re-render thrashing).
