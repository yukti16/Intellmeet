# INTELLMEET — Enterprise AI Meeting & Collaboration Platform

> **"Turn Every Meeting Into Action."**

IntellMeet is an AI-powered enterprise meeting and collaboration platform built for remote and hybrid teams. It integrates WebRTC video conferencing, real-time Socket.io signaling, screen sharing, live chat, team workspaces, meeting scheduling, automated transcription, and OpenAI-driven meeting intelligence (summaries, key points, action item extraction, and follow-up recommendations).

---

## 🚀 Key Features

- **WebRTC Multi-Party Video Conferencing**: Real-time peer video & audio streams with mic/camera toggle and high-DPI screen sharing (`getDisplayMedia`).
- **OpenAI Meeting Intelligence**:
  - Executive summary generation
  - Key decision & discussion point extraction
  - Automated action item extraction with due dates & priorities
  - Development fallback engine if OpenAI API key is unconfigured
- **Real-Time Chat & Signaling**: Socket.io-powered in-meeting chat, typing indicators, and WebRTC signaling.
- **Team Workspaces & RBAC**: Role-Based Access Control (Admin, Manager, Member) across team workspaces.
- **Dashboard & Recharts Analytics**: Metrics on meeting frequency, duration trends, productivity scores, and task completion.
- **Search & Notifications**: Global MongoDB indexed search and real-time notification alerts.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + Custom Glassmorphism
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP & Sockets**: Axios + Socket.io-client
- **Real-Time Media**: WebRTC (`RTCPeerConnection`, `getUserMedia`, `getDisplayMedia`)

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB + Mongoose ODM
- **Real-Time**: Socket.io
- **Security**: JWT Authentication, bcryptjs password hashing, Helmet, Rate Limiting, CORS
- **AI**: OpenAI API v4 (`gpt-3.5-turbo`) + Dev Fallback Engine

---

## 📁 Project Structure

```
intellmeet/
├── package.json                 # Monorepo scripts (concurrently dev launcher)
├── .env.example                 # Root environment template
├── README.md
├── server/
│   ├── src/
│   │   ├── config/              # MongoDB & JWT configuration
│   │   ├── controllers/         # Auth, Meeting, Workspace, AI, ActionItem, Notification controllers
│   │   ├── middleware/          # JWT protect, Role RBAC, and Error Handler middlewares
│   │   ├── models/              # User, Workspace, Meeting, Message, Notification, ActionItem schemas
│   │   ├── routes/              # Express API route modules
│   │   ├── services/            # OpenAI AI Service & Transcription service
│   │   ├── sockets/             # WebRTC signaling, Chat, & Notification sockets
│   │   ├── utils/               # Code generator utility
│   │   ├── tests/               # Backend tests
│   │   ├── app.js               # Express application configuration
│   │   ├── server.js            # HTTP & Socket.io server entry point
│   │   └── seed.js              # Database seed script with demo credentials
│   ├── package.json
│   └── .env.example
└── client/
    ├── src/
    │   ├── components/          # VideoTile, MeetingCard, ActionItemCard, ChatPanel, Drawers, Modals
    │   ├── context/             # AuthContext & SocketContext
    │   ├── pages/               # Landing, Auth, Dashboard, Meetings, Room, Details, Workspaces, Team, AI Insights, Settings
    │   ├── services/            # API client & domain service modules
    │   ├── App.jsx              # Application router & protected routes
    │   ├── index.css
    │   └── main.jsx
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in `server/` or copy from `.env.example`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/intellmeet
JWT_SECRET=intellmeet_super_secret_jwt_key_2026_production_ready
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
CLIENT_URL=http://localhost:5173
AI_PROVIDER=openai
NODE_ENV=development
```

*Note: If `OPENAI_API_KEY` is not provided, IntellMeet automatically runs using its built-in Intelligent Development Fallback Engine without crashing.*

---

## 🔑 Demo Credentials

Run the seed script to populate demo users and meetings:

```bash
npm run seed
```

### Demo Accounts:
- **Admin**: `admin@intellmeet.com` / `password123`
- **Manager**: `manager@intellmeet.com` / `password123`
- **Member**: `member@intellmeet.com` / `password123`

---

## 🚀 Running the Application

### 1. Install Dependencies
```bash
npm run install:all
```
*(or run `npm install` inside root, `server/`, and `client/` folders)*

### 2. Start Both Server & Client Concurrently
```bash
npm run dev
```
- **Client Application**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

### 3. Run Individual Components
- **Server only**: `npm run dev:server`
- **Client only**: `npm run dev:client`
- **Seed Data**: `npm run seed`
- **Backend Tests**: `npm run test`

---

## 📡 Main REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Authenticate user & get JWT |
| `GET` | `/api/auth/me` | Get current user profile |
| `GET` | `/api/meetings` | Get meeting list with filters |
| `POST` | `/api/meetings` | Create / schedule new meeting |
| `GET` | `/api/meetings/:id` | Get meeting details by ID or code |
| `POST` | `/api/meetings/:id/join` | Join meeting room |
| `POST` | `/api/meetings/:id/end` | End meeting & trigger AI analysis |
| `GET` | `/api/workspaces` | List team workspaces |
| `POST` | `/api/ai/summarize` | Generate AI summary for transcript |
| `GET` | `/api/action-items` | Get assigned action items |

---

## ⚡ Socket.io Events

- `join-meeting`: Join specific meeting room (`INT-XXXXXX`)
- `user-joined`: Broadcast when new participant enters room
- `offer` / `answer` / `ice-candidate`: WebRTC media stream signaling
- `toggle-audio` / `toggle-video`: Real-time media state synchronization
- `send-message` / `receive-message`: In-meeting real-time chat
- `end-meeting`: Host command to terminate live meeting for all participants
