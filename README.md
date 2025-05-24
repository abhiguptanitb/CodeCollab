# 🚀 CodeCollab

**CodeCollab** is a collaborative coding platform built with the **MERN stack** (MongoDB, Express, React, Node.js). It enables users to create projects, collaborate in real-time, chat, and run code securely in the browser using [WebContainer](https://webcontainers.io/). Key features include user authentication, project management, AI-powered assistance, and live code execution.

---

## ✨ Features

- 🔐 **User Authentication**: Register, login, and logout with JWT-based authentication.
- 🗂️ **Project Management**: Create, view, and delete projects. Supports multiple collaborators per project.
- 👥 **Collaborators**: Add/remove users as collaborators in a project.
- 💬 **Real-Time Chat**: Chat with project collaborators using Socket.IO.
- 🤖 **AI Assistant**: Mention `@ai` in chat to get code suggestions powered by Google Gemini AI.
- 🧾 **File Tree & Editor**: View and edit project files with a syntax-highlighted code editor.
- 🧪 **Live Code Execution**: Secure, browser-based code execution via WebContainer.
- 🔐 **Cross-Origin Isolation**: Configured for secure use of `SharedArrayBuffer` and WebContainer.
- 📱 **Responsive UI**: Built with React and Tailwind CSS for modern, responsive design.

---

## 🛠️ Tech Stack

**Frontend**:
- React
- Vite
- Tailwind CSS
- Socket.IO Client
- Axios
- Markdown-to-JSX
- Highlight.js

**Backend**:
- Node.js
- Express
- MongoDB (Mongoose)
- Socket.IO
- JWT
- Redis (for token blacklisting)
- Google Generative AI

**Other**:
- WebContainer (for secure code execution)
- HTTPS (required for WebContainer and cross-origin isolation)

---

## ⚙️ Getting Started

### ✅ Prerequisites

- Node.js (v18+ recommended)
- MongoDB instance (local or cloud)
- Redis instance (local or cloud)
- [mkcert](https://github.com/FiloSottile/mkcert) (for local HTTPS certificates)
- Google Gemini AI API Key

---

### 🔧 1. Clone the Repository

```bash
git clone https://github.com/yourusername/codecollab.git
cd codecollab
```

---

### 🔙 2. Backend Setup

#### a. Install Dependencies

```bash
cd backend
npm install
```

#### b. Create `.env` File

```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password_if_any
GOOGLE_AI_KEY=your_google_gemini_api_key
```

#### c. Generate HTTPS Certificates (for local dev)

```bash
mkcert -key-file key.pem -cert-file cert.pem localhost
```

Place `key.pem` and `cert.pem` in the `backend` directory.

#### d. Update `server.js` for HTTPS

```js
import https from 'https';
import fs from 'fs';
// ...other imports

const sslOptions = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
};

const server = https.createServer(sslOptions, app);
// ...rest of the code
```

#### e. Start the Backend Server

```bash
npm start
```

---

### 💻 3. Frontend Setup

#### a. Install Dependencies

```bash
cd frontend
npm install
```

#### b. Create `.env` File

```env
VITE_API_URL=https://localhost:3000
```

#### c. Optional: Enable HTTPS for Vite (local dev)

Edit `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync('../backend/key.pem'),
      cert: fs.readFileSync('../backend/cert.pem'),
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  }
})
```

#### d. Start the Frontend

```bash
npm run dev
```

---

## 🚀 Deployment

- **Production HTTPS**: Use trusted SSL (e.g., Let’s Encrypt) for backend and frontend.
- **Cross-Origin Isolation Headers**:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

- **Environment Variables**: Use secure, production-level values.

---

## 🧑‍💻 Usage

1. Register or login.
2. Create a new project.
3. Add collaborators.
4. Chat in real-time and use `@ai` for help.
5. Edit code and run it directly in the browser.

---

## 🐛 Troubleshooting

- **WebContainer Errors**: Ensure HTTPS and isolation headers are properly set.
- **Socket.IO Issues**: Use `wss://` and run backend with HTTPS.
- **AI Assistant Not Responding**: Verify your Google Gemini API key and network settings.

---

## 📄 License

**MIT License**

---

## 🙌 Credits

- [WebContainer](https://webcontainers.io)
- [Google Generative AI](https://ai.google.dev/)
- [React](https://react.dev)
- [Socket.IO](https://socket.io)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)