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

# Default port (Coolify may override via PORT env var)
ENV PORT=3001
EXPOSE 3001

# Health check — reads PORT env at runtime so it matches the server
HEALTHCHECK --interval=30s --timeout=10s --retries=5 --start-period=60s \
  CMD node -e "const p=process.env.PORT||3001;const http=require('http');const r=http.get('http://localhost:'+p+'/health',res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{const j=JSON.parse(d);process.exit(j.status==='ok'&&j.modelsLoaded?0:1)})});r.on('error',()=>process.exit(1));r.setTimeout(5000,()=>{r.destroy();process.exit(1)})"

CMD ["node", "server.js"]
