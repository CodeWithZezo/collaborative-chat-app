# 🚀 Team Collaboration Chat App — Server

> Enterprise-grade real-time team collaboration backend built with **Node.js**, **TypeScript**, **Socket.IO**, **PostgreSQL**, and **Redis**.
> Built with [Claude Code](https://claude.ai/code).

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Database Models](#database-models)
- [Scripts](#scripts)

---

## Overview

This is the **server-only** implementation of a full-featured team collaboration chat application — think Slack-like functionality with channels, direct messaging, tasks, notifications, mentions, file attachments, and audit logging.

The server exposes both a REST API and a real-time WebSocket layer, backed by PostgreSQL for persistence, Redis for caching and pub/sub, and Bull for background job queues. It was built entirely using **Claude Code**.

> **Note:** This repository contains only the backend server. A frontend client (web or mobile) is expected to connect to this server via the REST API and Socket.IO.

---

## Features

### Authentication & Security
- JWT-based authentication with access + refresh tokens
- Email verification flow
- Password reset with expiring tokens
- Account lockout after repeated failed login attempts
- Bcrypt password hashing
- Role-based access control (RBAC) with 5 tiers: `super_admin`, `admin`, `moderator`, `user`, `guest`

### Channels & Messaging
- Create, join, and leave channels
- Send, receive, and delete messages
- Real-time message delivery over WebSockets
- Typing indicators broadcast to channel members
- Message read receipts
- File attachments support

### Tasks
- Create and assign tasks to team members
- Track task status with statistics
- Tasks linked to users and channels

### Notifications
- In-app notification system
- Unread count tracking
- Mark individual or all notifications as read
- Configurable per-user notification preferences (email, push, in-app, mentions, tasks, channels)

### Presence & Real-time
- Live online/offline user status broadcast
- Per-user presence states: `online`, `away`, `busy`, `offline`
- Users automatically join their channel rooms on socket connect

### Admin & Audit
- Suspend or activate user accounts
- Update user roles
- Detailed health check endpoint with system metrics
- Full audit log model for tracking sensitive actions

### Infrastructure
- Request ID tracking and response-time logging
- Structured JSON logging via Winston with daily log rotation
- Per-route rate limiting (auth, registration, password reset, messages, search)
- Graceful shutdown with proper cleanup of DB, Redis, and queue connections
- Background job queues via Bull + Redis

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Language | TypeScript 5 |
| Web Framework | Express 4 |
| Real-time | Socket.IO 4 |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL |
| Cache / Pub-Sub | Redis (ioredis + redis) |
| Job Queues | Bull |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Joi + express-validator + class-validator |
| Logging | Winston + morgan |
| File Uploads | Multer |
| Security | Helmet + CORS + rate limiting |
| Testing | Jest + Supertest |
| Dev Tools | ts-node + nodemon + ESLint |

---

## Project Structure

```
server/
├── src/
│   ├── config/                  # App-wide configuration
│   │   ├── index.ts             # Env validation and config export (Joi schema)
│   │   ├── database.config.ts   # TypeORM PostgreSQL setup
│   │   ├── redis.config.ts      # Redis connection manager
│   │   ├── socket.config.ts     # Socket.IO initialization & auth middleware
│   │   ├── queue.config.ts      # Bull queue manager
│   │   └── logger.config.ts     # Winston logger with daily rotation
│   │
│   ├── controllers/             # HTTP request handlers (thin layer)
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── business.controllers.ts  # Messages, channels, tasks, notifications
│   │   └── health.controller.ts
│   │
│   ├── services/                # Business logic
│   │   ├── auth.service.ts      # Register, login, token refresh, password reset
│   │   ├── user.service.ts      # Profile, online status
│   │   └── business.services.ts # Message, channel, task, notification logic
│   │
│   ├── repositories/            # Data access layer (TypeORM custom repos)
│   │   ├── base.repository.ts
│   │   ├── user.repository.ts
│   │   ├── message.repository.ts
│   │   ├── channel.repository.ts
│   │   ├── task.repository.ts
│   │   ├── notification.repository.ts
│   │   └── additional.repository.ts
│   │
│   ├── models/                  # TypeORM entities
│   │   ├── base.entity.ts       # Shared id, createdAt, updatedAt
│   │   ├── user.model.ts
│   │   ├── message.model.ts
│   │   ├── channel.model.ts
│   │   ├── task.model.ts
│   │   ├── notification.model.ts
│   │   ├── mention.model.ts
│   │   ├── activity.model.ts
│   │   ├── audit.model.ts
│   │   └── attachment.model.ts
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts         # JWT verification, optional auth
│   │   ├── authorization.middleware.ts # Role checks, ownership checks
│   │   ├── error.middleware.ts        # Global error handler + graceful shutdown
│   │   ├── logger.middleware.ts       # Request ID + response time
│   │   ├── ratelimit.middleware.ts    # Per-route rate limiters
│   │   └── validation.middleware.ts  # Validation error formatter
│   │
│   ├── events/
│   │   └── socket.handler.ts    # All Socket.IO event handlers
│   │
│   ├── validators/
│   │   └── index.ts             # Auth, user, channel, message, task validators
│   │
│   ├── utils/
│   │   ├── Response.util.ts     # Standardized API response helpers
│   │   ├── tokenmanager.util.ts # JWT sign/verify/refresh
│   │   ├── encryption.util.ts   # Hashing and crypto utilities
│   │   ├── fileupload.util.ts   # Multer config and helpers
│   │   ├── pagination.util.ts   # Cursor/offset pagination helpers
│   │   └── datehelper.util.ts   # Date formatting utilities
│   │
│   └── server.ts                # App entry point (class-based bootstrapper)
│
├── .env.example                 # Environment variable template
├── nodemon.json
├── tsconfig.json
└── package.json
```

---

## Architecture

```
Client (Browser / Mobile)
        │
        ├── HTTP (REST API)   ──► Express Router
        │                              │
        │                         Controllers
        │                              │
        │                          Services
        │                              │
        │                        Repositories
        │                              │
        │                         PostgreSQL
        │
        └── WebSocket         ──► Socket.IO Server
                                       │
                                  Socket Handler
                                       │
                              Services / Repositories
                                       │
                                    Redis
                                 (pub/sub, cache)
                                       │
                                  Bull Queues
                               (background jobs)
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL running locally or remotely
- Redis running locally or remotely

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd collaborative-chat-app/server

# 2. Install dependencies
npm install

# 3. Copy environment file and fill in values
cp .env.example .env

# 4. Start in development mode (hot reload via nodemon)
npm run dev
```

On startup you'll see:

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎉 Team Collaboration Chat App - Server Running!        ║
║                                                            ║
║   📡 API Server:    http://localhost:3000                  ║
║   🔌 WebSocket:     ws://localhost:3000                    ║
║   🏥 Health Check:  http://localhost:3000/health           ║
╚════════════════════════════════════════════════════════════╝
```

### Build for Production

```bash
npm run build       # Compiles TypeScript to dist/
npm start           # Runs compiled output
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all required values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | | `development` | `development` \| `production` \| `test` |
| `PORT` | | `3000` | HTTP server port |
| `DB_HOST` | ✅ | — | PostgreSQL host |
| `DB_PORT` | | `5432` | PostgreSQL port |
| `DB_USERNAME` | ✅ | — | PostgreSQL username |
| `DB_PASSWORD` | ✅ | — | PostgreSQL password |
| `DB_DATABASE` | ✅ | — | PostgreSQL database name |
| `REDIS_HOST` | ✅ | — | Redis host |
| `REDIS_PORT` | | `6379` | Redis port |
| `REDIS_PASSWORD` | | — | Redis password (optional) |
| `JWT_SECRET` | ✅ | — | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | | `7d` | Access token TTL |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh token signing secret (min 32 chars) |
| `JWT_REFRESH_EXPIRES_IN` | | `30d` | Refresh token TTL |
| `BCRYPT_ROUNDS` | | `12` | Password hashing rounds |
| `CORS_ORIGIN` | ✅ | — | Allowed CORS origin (e.g. `http://localhost:5173`) |
| `CORS_CREDENTIALS` | | `true` | Allow credentials |
| `MAX_FILE_SIZE` | | `10485760` | Max upload size in bytes (10 MB) |
| `UPLOAD_PATH` | | `./uploads` | Local upload directory |
| `LOG_LEVEL` | | `info` | Winston log level |
| `LOG_FILE_PATH` | | `./logs` | Directory for log files |

---

## API Reference

All routes are prefixed with `/api`. Authentication uses a `Bearer <token>` header.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Basic health check |
| GET | `/api/health/detailed` | Admin | Detailed system health |
| GET | `/api/health/metrics` | Admin | Server metrics |
| POST | `/api/health/metrics/reset` | Admin | Reset metrics |

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | — | Register a new user |
| POST | `/login` | — | Login, get tokens |
| POST | `/logout` | ✅ | Logout |
| POST | `/refresh` | — | Refresh access token |
| POST | `/verify-email` | — | Verify email with token |
| POST | `/forgot-password` | — | Request password reset |
| POST | `/reset-password` | — | Reset password with token |
| POST | `/change-password` | ✅ | Change own password |
| GET | `/me` | ✅ | Get current user |
| GET | `/verify` | ✅ | Verify token validity |

### Users — `/api/users`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search` | ✅ | Search users |
| GET | `/online` | ✅ | Get online users |
| GET | `/:userId` | ✅ | Get user by ID |
| PUT | `/:userId` | ✅ (owner/admin) | Update profile |
| GET | `/:userId/statistics` | ✅ | Get user statistics |
| PATCH | `/:userId/role` | Admin | Update user role |
| POST | `/:userId/suspend` | Admin | Suspend user |
| POST | `/:userId/activate` | Admin | Activate user |

### Channels — `/api/channels`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create a channel |
| GET | `/` | ✅ | Get user's channels |
| GET | `/search` | ✅ | Search channels |
| GET | `/:channelId` | ✅ | Get channel by ID |
| POST | `/:channelId/join` | ✅ | Join a channel |
| POST | `/:channelId/leave` | ✅ | Leave a channel |

### Messages — `/api/messages`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Send a message |
| GET | `/channel/:channelId` | ✅ | Get paginated channel messages |
| DELETE | `/:messageId` | ✅ | Delete a message |

### Tasks — `/api/tasks`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create a task |
| GET | `/` | ✅ | Get user's tasks |
| GET | `/statistics` | ✅ | Get task statistics |
| GET | `/:taskId` | ✅ | Get task by ID |
| PUT | `/:taskId` | ✅ | Update a task |
| PATCH | `/:taskId/status` | ✅ | Update task status |
| DELETE | `/:taskId` | ✅ | Delete a task |

### Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Get user notifications |
| GET | `/unread/count` | ✅ | Get unread count |
| PATCH | `/:notificationId/read` | ✅ | Mark one as read |
| POST | `/read-all` | ✅ | Mark all as read |

---

## WebSocket Events

Connect to `ws://localhost:3000` with a valid JWT. Socket authentication is handled server-side before the connection is established.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `message:send` | `{ channelId, content, type }` | Send a message to a channel |
| `message:typing` | `{ channelId, isTyping }` | Broadcast typing indicator |
| `message:read` | `{ messageId, channelId }` | Mark message as read |
| `channel:join` | `{ channelId }` | Join a channel room |
| `channel:leave` | `{ channelId }` | Leave a channel room |
| `presence:update` | `{ status }` | Update presence (`online`, `away`, `busy`, `offline`) |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `message:new` | Message object | New message in a channel |
| `user:typing` | `{ userId, channelId, isTyping }` | Someone is typing |
| `message:read` | `{ userId, messageId }` | Message read by user |
| `channel:joined` | `{ channelId }` | Confirmed channel join |
| `channel:left` | `{ channelId }` | Confirmed channel leave |
| `user:online` | `{ userId }` | User came online |
| `user:offline` | `{ userId }` | User went offline |
| `user:presence` | `{ userId, status, timestamp }` | Presence state change |
| `error` | `{ event, message }` | Error response for a failed event |

---

## Database Models

| Model | Key Fields |
|---|---|
| `User` | id, username, email, password, role, status, isOnline, notificationPreferences |
| `Channel` | id, name, description, type, members (M2M) |
| `Message` | id, content, type, sender, channel, attachments |
| `Task` | id, title, description, status, priority, assignedTo, createdBy |
| `Notification` | id, type, content, isRead, user |
| `Mention` | id, mentionedUser, message |
| `Attachment` | id, filename, url, mimeType, size |
| `AuditLog` | id, action, entityType, entityId, user, metadata |
| `Activity` | id, type, userId, channelId, metadata |

All models extend `BaseEntity` which provides `id` (UUID), `createdAt`, and `updatedAt`.

---

## Scripts

```bash
npm run dev                  # Start dev server with hot reload
npm run build                # Compile TypeScript → dist/
npm start                    # Run compiled server
npm test                     # Run tests with coverage
npm run test:watch           # Watch mode tests
npm run lint                 # Lint TypeScript files
npm run lint:fix             # Auto-fix lint issues
npm run migration:generate   # Generate TypeORM migration
npm run migration:run        # Apply migrations
npm run migration:revert     # Revert last migration
```

---

## Built With Claude Code

This server was built entirely using [Claude Code](https://claude.ai/code) — Anthropic's agentic coding tool. The architecture, models, services, middleware, and WebSocket layer were all generated and iterated on through Claude Code sessions.

---

## License

MIT
