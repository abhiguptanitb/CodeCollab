# CodeCollab

CodeCollab is a full-stack collaborative coding workspace built with React, Node.js, Express, MongoDB, Socket.IO, WebContainer, and Google Gemini. It lets users create project workspaces, invite collaborators, chat in real time, ask an AI assistant to generate files, edit code in the browser, and run generated projects locally through WebContainer.

## Why This Project Matters

This project is designed to demonstrate production-minded MERN engineering rather than only UI screens. It includes authenticated project access, owner-only membership controls, persistent chat history, real-time workspace synchronization, isolated integration tests, and a browser-based code execution flow.

## Core Features

- JWT authentication for register, login, protected routes, and logout token blacklisting.
- Project workspaces with owner and collaborator roles.
- Owner-only collaborator management and project deletion.
- Real-time project chat using Socket.IO.
- MongoDB-backed chat history scoped to project collaborators.
- AI assistant support through `@ai` messages.
- AI-generated file tree updates synchronized to every connected collaborator.
- CodeMirror-powered browser editor with syntax highlighting and line numbers.
- WebContainer-based local code execution and preview.
- Project activity metadata with created/updated timestamps.
- Backend integration tests using `node:test`, `supertest`, and `mongodb-memory-server`.

## Tech Stack

Frontend:
- React
- Vite
- Tailwind CSS
- React Router
- Axios
- Socket.IO Client
- CodeMirror
- WebContainer API

Backend:
- Node.js
- Express
- MongoDB and Mongoose
- Socket.IO
- JWT
- Redis / ioredis
- Google Generative AI
- Node test runner
- Supertest
- mongodb-memory-server

## Architecture

```text
React + Vite frontend
        |
        | HTTP: auth, projects, messages
        | WebSocket: chat, file-tree updates
        v
Express API + Socket.IO server
        |
        | Mongoose models
        v
MongoDB

Redis is used for logout token blacklisting.
Google Gemini powers AI project-file generation.
WebContainer runs generated code inside the browser.
```

## Security And Authorization

- The backend validates JWTs for protected HTTP routes.
- Socket.IO connections also validate JWTs before joining a project room.
- Users can only open projects where they are collaborators.
- Only project owners can add collaborators or delete projects.
- Collaborators can chat and edit project files.
- Chat sender identity is created server-side, not trusted from the client.
- Project messages are scoped by project membership.

## Local Setup

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
GOOGLE_AI_KEY=your_google_gemini_api_key
CLIENT_URL=http://localhost:5173
```

Run the backend:

```bash
npm run dev
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Run the frontend:

```bash
npm run dev
```

## WebContainer Note

WebContainer requires browser support for cross-origin isolation. The Vite dev server sets:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

For full WebContainer behavior, use a Chromium-based browser and ensure your deployment also sends the required isolation headers.

## Testing

Backend tests run against an isolated in-memory MongoDB instance:

```bash
cd backend
npm test
```

Current coverage focuses on:
- Owner-only collaborator management.
- Owner-only project deletion.
- Collaborator project access.
- File-tree update permissions.
- Project-scoped message history.
- Outsider access denial.

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Resume Talking Points

- Designed project-level authorization across REST APIs and Socket.IO.
- Built a persistent real-time collaboration model with MongoDB and Socket.IO.
- Integrated AI-generated file changes into a collaborative workspace.
- Added browser-based code execution using WebContainer.
- Wrote integration tests against isolated infrastructure.
- Improved product polish with role-aware UI, loading/error states, timestamps, and a real code editor.

## Known Limitations

- WebContainer support depends on browser and deployment headers.
- Redis is required for production logout blacklisting.
- AI-generated files should be reviewed before running untrusted code.
- The app currently supports project-level roles, not fine-grained file permissions.

