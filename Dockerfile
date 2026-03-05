# ── Build stage ──────────────────────────────────────────────
FROM node:20-slim

# Install native dependencies required by the 'canvas' npm package
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libjpeg62-turbo-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    pkg-config \
    python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production dependencies
COPY package.json ./
RUN npm install --production

# Copy application source
COPY server.js download-models.js ./

# Download model weights at build time (baked into the image)
RUN node download-models.js

# Expose the server port
EXPOSE 3001

# Health check (every 30 s, 10 s timeout, 3 retries, start after 15 s)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=15s \
  CMD node -e "const http=require('http');const r=http.get('http://localhost:3001/health',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{const j=JSON.parse(d);process.exit(j.status==='ok'&&j.modelsLoaded?0:1)})});r.on('error',()=>process.exit(1));r.setTimeout(5000,()=>{r.destroy();process.exit(1)})"

CMD ["node", "server.js"]
