# Use Node.js base image
FROM node:22-slim

# Install Python3 and ffmpeg (Required for yt-dlp)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend package files from the backend directory
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy backend code
COPY backend/ .

# Create temp directory
RUN mkdir -p temp

# Expose port
EXPOSE 8080

# Start the app
CMD ["node", "server.js"]
