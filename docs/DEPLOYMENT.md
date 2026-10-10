# WatchCraft — Deployment Guide

This guide describes how to deploy **WatchCraft** to production environments, including configuring hosting providers, setting up environment variables, and establishing persistent WebSocket connections.

---

## 1. Hosting Architecture Overview

Because WatchCraft relies on stateful, real-time WebSocket connections (Socket.IO) and an in-memory room registry with MongoDB persistence, the application requires:
1. **Frontend**: Static Web Hosting with SPA routing support (e.g., **Vercel**, **Netlify**, or **Cloudflare Pages**).
2. **Backend**: A persistent container or VM service that supports long-lived HTTP and WebSocket connections (e.g., **Render**, **Railway**, **Fly.io**, or an **AWS EC2/DigitalOcean Droplet**). *Note: Serverless functions (such as AWS Lambda or Vercel Serverless) are not suitable for stateful Socket.IO rooms.*
3. **Database**: A hosted MongoDB instance (such as **MongoDB Atlas M0 Free Tier**).

---

## 2. Environment Variables Reference

### Backend (`watchly-backend/.env`)

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | `10000` | Port for the HTTP and Socket.IO server. Set automatically on platforms like Render. |
| `CLIENT_URL` | Yes | `https://your-watchcraft-frontend.netlify.app` | Allowed CORS and Socket.IO origin. Set to your production frontend URL. |
| `MONGODB_URI` | Recommended | `mongodb+srv://<user>:<password>@cluster0.mongodb.net/watchcraft?retryWrites=true&w=majority` | Connection string for MongoDB Atlas. If omitted or unreachable, backend gracefully falls back to in-memory mode. |
| `NODE_ENV` | Optional | `production` | Node execution environment. |

### Frontend (`.env` or Hosting Provider Environment Settings)

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `VITE_BACKEND_URL` | Yes | `https://watchcraft-backend.onrender.com` | Base URL of the backend service (used for both REST API calls and Socket.IO connection handshakes). |

---

## 3. Step-by-Step Deployment

### Step A: Deploy Database (MongoDB Atlas)
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free shared cluster (M0 sandbox).
3. Under **Database Access**, create a database user with read/write privileges (choose a secure password).
4. Under **Network Access**, add IP Address `0.0.0.0/0` (allow access from anywhere) so that your backend host can connect.
5. Click **Connect** → **Drivers** (Node.js) and copy the connection string. Replace `<password>` with your database password.

---

### Step B: Deploy Backend (e.g., Render)
1. Push your repository to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure the service:
   - **Name**: `watchcraft-backend`
   - **Root Directory**: `watchly-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Add Environment Variables in the Render dashboard:
   - `MONGODB_URI`: `<Your MongoDB Atlas connection URI>`
   - `CLIENT_URL`: `https://<your-frontend-subdomain>.netlify.app` (or `*` temporarily during initial setup)
   - `NODE_ENV`: `production`
7. Click **Create Web Service**.
8. Note your public backend URL (e.g., `https://watchcraft-backend.onrender.com`).

---

### Step C: Deploy Frontend (e.g., Netlify or Vercel)

#### Deploying on Netlify:
1. Log in to [Netlify](https://app.netlify.com).
2. Click **Add new site** → **Import an existing project** → **GitHub**.
3. Select your repository.
4. Configure Build settings:
   - **Base directory**: Leave blank or `./`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Under **Environment variables**, add:
   - `VITE_BACKEND_URL`: `https://watchcraft-backend.onrender.com` *(use your actual backend URL from Step B)*
6. Click **Deploy WatchCraft**.

---

## 4. Verifying Production Deployment

Once both services are running:

1. **Verify Backend Health**:
   Open `https://<your-backend-url>/api/rooms/health` in your browser. You should receive a JSON response:
   ```json
   {
     "status": "ok",
     "uptime": 124.5,
     "activeRooms": 0,
     "totalParticipants": 0
   }
   ```
2. **Verify Frontend Loading**:
   Open your Netlify frontend URL. Confirm that the preloader completes, the start prompt appears, and the 2D room loads.
3. **Verify WebSocket Connection**:
   Open browser DevTools (`F12` → **Network** → **WS** filter). Boot into the computer and create a room. Verify that the WebSocket connection to `wss://<your-backend-url>/socket.io/?...` upgrades successfully with HTTP status `101 Switching Protocols`.
4. **Test Multi-Device Sync**:
   Open the room in an Incognito window or second device using the 6-character room code. Verify that play, pause, seek, and video changes propagate between both clients.

---

## 5. Production Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **CORS error in browser console** | `CLIENT_URL` on backend does not match the frontend domain. | Update `CLIENT_URL` in backend environment settings to include your frontend's exact origin (e.g. `https://watchcraft.netlify.app`, without trailing slash). |
| **WebSocket connection fails / fallback polling** | Hosting proxy does not support or drops WebSockets. | Ensure your backend host supports WebSockets (Render, Railway, Fly.io support it out of the box). |
| **Backend sleeps on free tier (cold start)** | Render free tier spins down web services after 15 minutes of inactivity. | Allow 30–50 seconds on initial wake-up, or use an uptime monitor (e.g. UptimeRobot) targeting `/api/rooms/health` to keep the instance warm. |
| **"Video unavailable" in 3D TV** | YouTube creator restricted embedding or copyright policies block IFrame display. | Test with known embeddable videos (e.g., standard Creative Commons or Big Buck Bunny ID `aqz-KE-bpKQ`). |
| **MongoDB connection timeout** | Atlas Network Access whitelist does not allow backend IP. | In MongoDB Atlas → Network Access, verify `0.0.0.0/0` is allowed. |
