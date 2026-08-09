FROM node:22-slim

# Install Python3, ffmpeg, curl, pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

# Install bgutil PO token plugin for yt-dlp (bypasses "Sign in to confirm you're not a bot")
RUN pip3 install --break-system-packages yt-dlp-youtube-oauth2 || true
RUN pip3 install --break-system-packages bgutil-ytdlp-pot-provider || true

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["node", "index.js"]
