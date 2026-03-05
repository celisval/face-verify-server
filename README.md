# Face Verify Server

Lightweight Node.js server that accepts a base64-encoded JPEG image, detects a single face, and returns the **128-dimensional face descriptor** (embedding) using [`@vladmandic/face-api`](https://github.com/vladmandic/face-api).

---

## Endpoints

| Method | Path            | Description                          |
|--------|-----------------|--------------------------------------|
| POST   | `/verify-face`  | Extract face descriptor from image   |
| GET    | `/health`       | Health check                         |

### POST `/verify-face`

```json
// Request
{ "image_base64": "<base64 JPEG string>" }

// Success (200)
{ "descriptor": [0.0123, -0.0456, ...] }   // 128 floats

// No face found (200)
{ "error": "No face detected in the image." }

// Server error (500)
{ "error": "..." }
```

### GET `/health`

```json
{ "status": "ok", "modelsLoaded": true }
```

---

## Local Development

```bash
npm install
node download-models.js   # downloads model weights into ./models/
node server.js             # listens on 0.0.0.0:3001
```

Override the port with the `PORT` environment variable:

```bash
PORT=4000 node server.js
```

---

## Docker

```bash
docker build -t face-verify-server .
docker run -p 3001:3001 face-verify-server
```

Model weights are downloaded **at build time** and baked into the image — no external downloads at runtime.

---

## Deploy on Coolify (Self-Hosted)

1. **Push this repo** to a Git remote accessible by your Coolify instance (GitHub, GitLab, Gitea, etc.).

2. In the Coolify dashboard, go to **Add New Resource → Application**.

3. Select your **Git source** and point it to this repository.

4. Set the build method to **Dockerfile** (Coolify will auto-detect the `Dockerfile` in the repo root).

5. Under **Network / Port**, expose port **3001**.

6. Assign a domain, e.g.:
   ```
   face-verify-server-<coolify-id>.180.232.187.222.sslip.io
   ```

7. Deploy and wait for the build + health check to pass.

8. Verify:
   ```bash
   curl https://<your-domain>/health
   # → {"status":"ok","modelsLoaded":true}
   ```

---

## Project Structure

```
face-verify-server/
├── Dockerfile
├── .dockerignore
├── .gitignore
├── package.json
├── server.js              # Express server + face-api logic
├── download-models.js     # Downloads model weights from jsDelivr CDN
├── models/                # Model weight files (auto-downloaded)
└── README.md
```
