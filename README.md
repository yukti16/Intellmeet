# INTELLMEET — Enterprise AI Meeting & Collaboration Platform

> **"Turn Every Meeting Into Action."**

IntellMeet is a full-stack, enterprise-grade AI meeting and collaboration platform designed for modern remote and hybrid teams. It unifies WebRTC multi-party video conferencing, Socket.io signaling, high-DPI screen sharing, real-time in-meeting chat, team workspaces with granular Role-Based Access Control (RBAC), meeting scheduling, live speech transcription, and an AI-driven meeting intelligence engine that extracts executive summaries, discussion points, key decisions, prioritized action items, risks/blockers, and follow-up recommendations.

---

## 🛠️ Complete Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Custom Dark Theme Palette (`#0B0F19`, `#0f172a`, `#1e293b`) with Soft Pink & Purple Brand Accents
- **Icons**: Lucide React
- **Data Visualization**: Recharts (meeting analytics, productivity metrics, task completion rates)
- **Networking**: Axios (JWT interceptors & global error handling) + Socket.io-client
- **Media & Audio**: Native WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`) + Web Speech Recognition API
- **Notifications**: React Hot Toast

### Backend
- **Runtime & Framework**: Node.js + Express.js
- **Database & ODM**: MongoDB + Mongoose ODM (compound indexing, validation schemas)
- **Real-Time Communication**: Socket.io (WebRTC signaling, chat, presence, notifications)
- **Security & Authorization**: JWT (JSON Web Tokens), bcryptjs password hashing, Helmet HTTP headers, express-rate-limit, CORS origin protection
- **AI Intelligence**: OpenAI API (`gpt-3.5-turbo`) + Built-in Intelligent Dev Fallback Engine

---

## 🚀 Key Features Implemented

1. **Multi-Party WebRTC Video Conferencing**:
   - Audio/video toggling, camera flip, and screen sharing.
   - Resilient polite-peer glare resolution and ICE candidate queuing.
   - Remote participant state synchronization (mic muted, camera off indicators).

2. **AI Meeting Insights Engine**:
   - **Executive Summary**: Contextual synthesis of meeting objectives, blocker resolutions, and outcomes.
   - **Discussion Points**: Utterance grouping by speaker and theme.
   - **Key Decisions**: Formal commitments and rollout strategies without generic single-word phrases.
   - **Action Items**: Explicit assignees, deadlines, and urgency priorities (`High`, `Medium`, `Low`).
   - **Risk & Blocker Detection**: Detection of dependencies, bottlenecks, and technical roadblocks.
   - **Follow-Up Recommendations**: Practical next steps and review milestones.
   - **Dual Engine Architecture**: Works seamlessly with live OpenAI keys or the transcript-driven Dev Fallback Engine.

3. **Team Workspaces & RBAC**:
   - Workspaces categorize meetings, documentation, and members.
   - Dynamic real-time user lookup excluding existing workspace members.
   - Secure email invitation system for unregistered team members.
   - Granular permissions: **Owner** (full control), **Admin** (member & settings management), **Member** (view & participate).
   - Dedicated tabs: **Overview**, **Members**, **Meetings**, **Action Items**, **Resources**.

4. **Action Item Lifecycle**:
   - Extracted tasks persist directly to MongoDB linked to meeting and workspace contexts.
   - Full CRUD: In-place status transitions (`Pending` ➔ `In Progress` ➔ `Completed`), priority tuning, and assignee reallocation.

5. **In-Meeting Collaboration**:
   - In-room text chat with message editing and deletion.
   - Real-time attendee roster with active speaking indicators.
   - Live speech-to-text transcript panel with instant Socket.io broadcast.

---

## 📁 Repository Structure

```
intellmeet/
├── package.json                 # Monorepo dev launcher scripts
├── README.md                    # Project documentation & demonstration scenarios
├── server/
│   ├── .env.example             # Server environment configuration template
│   ├── src/
│   │   ├── config/              # MongoDB connection & JWT utilities
│   │   ├── controllers/         # Auth, Meeting, Workspace, ActionItem, User, AI controllers
│   │   ├── middleware/          # authMiddleware (JWT protect), errorMiddleware
│   │   ├── models/              # User, Workspace, WorkspaceMember, Meeting, ActionItem, Message, Notification
│   │   ├── routes/              # Express API route definitions
│   │   ├── services/            # aiService (OpenAI + Fallback), meetingService
│   │   ├── sockets/             # meetingSocket, chatSocket, notificationSocket
│   │   ├── utils/               # textUtils, dateUtils, generateCode
│   │   ├── tests/               # auth, aiService, workspace, actionItem, e2eWorkflow tests
│   │   ├── app.js               # Express application setup
│   │   ├── server.js            # HTTP & Socket.io server bootstrap
│   │   └── seed.js              # Database seed script
│   └── package.json
└── client/
    ├── .env.example             # Client environment template
    ├── src/
    │   ├── components/          # MeetingCard, WorkspaceCard, ActionItemCard, VideoTile, Modals, Drawers
    │   ├── context/             # AuthContext, SocketContext, rtcContext
    │   ├── pages/               # Dashboard, Meetings, MeetingRoom, Workspaces, Team, Settings
    │   ├── services/            # api, authService, meetingService, workspaceService, userService
    │   ├── utils/               # meetingUtils, webrtcCleanup
    │   ├── App.jsx              # Client router with ProtectedRoute guards
    │   └── main.jsx
    ├── tailwind.config.js
    └── vite.config.js
```

---

## ⚙️ Environment Configuration

### 1. Backend (`server/.env`)
Copy `server/.env.example` to `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/intellmeet
JWT_SECRET=intellmeet_production_secure_jwt_secret_key_2026
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
CLIENT_URL=http://localhost:5173
AI_PROVIDER=openai
NODE_ENV=development
```
*Note: If `OPENAI_API_KEY` is omitted or unconfigured, IntellMeet automatically activates its built-in Intelligent Dev Fallback Engine.*

### 2. Frontend (`client/.env`)
Copy `client/.env.example` to `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🔑 Demo User Accounts

Run the database seeder to populate sample enterprise users, meetings, workspaces, and action items:
```bash
npm run seed
```

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@intellmeet.com` | `password123` | System Administrator & Executive |
| **Manager** | `manager@intellmeet.com` | `password123` | Engineering Manager |
| **Member** | `member@intellmeet.com` | `password123` | Senior Product Designer |

---

## 🚀 Running the Platform Locally

### Step 1: Install Dependencies
```bash
# In the repository root
npm run install:all
```
*(Alternatively: run `npm install` inside root, `server/`, and `client/`)*

### Step 2: Seed Initial Data
```bash
npm run seed
```

### Step 3: Start Development Servers
```bash
npm run dev
```
- **Web Application**: `http://localhost:5173`
- **REST API & Sockets**: `http://localhost:5000`

---

## 🧪 Automated Testing Suite

IntellMeet utilizes Node.js's native test runner (`node:test` and `node:assert`) without heavy third-party runners:

```bash
npm test --prefix server
```

### Verified Test Suites:
1. `server/src/tests/auth.test.js`: Token creation, tampering verification, and route protection guards.
2. `server/src/tests/aiService.test.js`: Technical term preservation (`Socket.io`), multi-speaker decision parsing, deadline extraction, and the **Q4 Product Launch Planning benchmark scenario**.
3. `server/src/tests/workspace.test.js`: Schema validations, embedded resource schemas, and email invitation models.
4. `server/src/tests/actionItem.test.js`: Title sanitation, status transitions (`Pending` ➔ `In Progress` ➔ `Completed`), and priority validations.
5. `server/src/tests/e2eWorkflow.test.js`: Full lifecycle test from multi-user join and live transcription to AI analysis and database mutation.

---

## 📸 Recommended Demonstration Scenarios & Walkthrough Checklist

For live presentations, grading, or demo video recordings:

### Scenario 1: Authentication & Workspace Dashboard
- **Action**: Log in as `admin@intellmeet.com`.
- **View**: Main Analytics Dashboard showing meeting frequency and productivity scores.
- **Navigate**: Open **Workspaces** from the sidebar. Note search bar, sort options, and cards with live member/meeting counts.

### Scenario 2: Workspace Management & Real-Time Member Addition
- **Action**: Open `"Core Architecture Workspace"`.
- **View**: Tabbed layout (**Overview**, **Members**, **Meetings**, **Action Items**, **Resources**).
- **Test**: Click **Add Member** ➔ Use the searchable dropdown to find registered colleagues, or switch to the **Invite by Email** tab to send a pending invite to an external colleague.

### Scenario 3: Scheduling a Workspace Meeting
- **Action**: In the workspace **Meetings** tab, click **Schedule Meeting**.
- **Observation**: Note that the workspace field is automatically locked with a `"Fixed"` badge to guarantee strict association with the current workspace.
- **Submit**: Create the meeting. Verify it appears immediately in the workspace's meeting list and the global `/meetings` directory.

### Scenario 4: Live Meeting Room & Multi-User Conferencing
- **Action**: Join the live room using the meeting code in two separate browser windows (one as Admin, one in Incognito as Member).
- **Test**: Verify two-way video rendering, mic mute toggle, in-room real-time chat, and live speech transcription.

### Scenario 5: Meeting Termination & Automated AI Insights
- **Action**: As host, click **End Meeting for Everyone**.
- **Observation**: Both windows automatically leave the live room. The host is redirected to the **Meeting Details Page**.
- **Verify**: Inspect the generated **Executive Summary**, **Key Discussion Points**, **Key Decisions**, **Identified Risks & Blockers**, and **Follow-Up Recommendations**.
- **Action Items**: Confirm that extracted commitments are properly assigned to participants with deadlines and priorities, and can be edited in place.

---

## 🔍 Honest Evaluation & Known Considerations

- **Browser Audio Permissions**: Web Speech transcription relies on browser-native SpeechRecognition (`webkitSpeechRecognition`). In non-Chromium browsers or non-HTTPS production deployments, the browser blocks microphone access; the platform gracefully displays an inline transcription warning and uses the Dev Fallback Engine.
- **STUN/TURN Servers**: WebRTC signaling uses Google's public STUN servers (`stun:stun.l.google.com:19302`). For deployment across restrictive enterprise symmetric NATs, a custom TURN server (e.g. coturn) should be configured in `rtcContext.jsx`.
- **Sandbox Process Spawning**: Terminal background command spawning is restricted in certain Windows sandbox configurations (`Access is denied`), while all API endpoints, models, socket handlers, and client components function directly via Node.js and Vite.
