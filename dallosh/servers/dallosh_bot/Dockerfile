FROM python:3.11-bullseye

WORKDIR /app

# Install system dependencies for Pipecat WebRTC and audio/video processing
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    git \
    git-lfs \
    curl \
    ffmpeg \
    libavcodec-extra \
    libavformat-dev \
    libavutil-dev \
    libswresample-dev \
    libswscale-dev \
    libasound2-dev \
    libpulse-dev \
    libsndfile1-dev \
    libportaudio2 \
    portaudio19-dev \
    libssl-dev \
    libffi-dev \
    libsrtp2-dev \
    libnice-dev \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first and install Python deps
COPY requirements.txt ./
# RUN pip install --no-cache-dir --force-reinstall -r requirements.txt
RUN pip3 install --no-cache-dir --upgrade -r requirements.txt

# Copy application code last (for Docker layer caching efficiency)
COPY . .

# Create models directory
RUN mkdir -p /app/models

# Add script to check and download smart-turn model if missing
# RUN echo '#!/bin/bash\n\
# echo "🔍 Checking if smart-turn model exists..."\n\
# if [ ! -d "/app/models/smart-turn" ]; then\n\
#     echo "📥 Smart-turn model not found, downloading in background..."\n\
#     cd /app/models\n\
#     git lfs install\n\
#     git clone https://huggingface.co/pipecat-ai/smart-turn &\n\
#     cd /app\n\
#     echo "✅ Smart-turn model download started in background"\n\
# fi\n\
# echo "🚀 Starting Python bot..."\n\
# exec python main.py' > /app/start.sh && chmod +x /app/start.sh

# Expose required ports for WebRTC connectivity
# Port 7860: Main application server
# Port 3478: STUN/TURN protocol (UDP for media, TCP for signaling)
# Port 5349: STUN/TURN over TLS (secure WebRTC connections)
# Ports 32768-65535: Full WebRTC dynamic range (based on your logs)
EXPOSE 7860 3478/tcp 3478/udp 5349/tcp 5349/udp 32768-65535/udp 32768-65535/tcp

# Use the start script instead of direct python execution
# CMD ["/app/start.sh"]
CMD ["python", "main.py"]
