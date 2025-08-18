FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for git, git-lfs, curl, and OpenCV
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    git \
    git-lfs \
    curl \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first and install Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir --force-reinstall -r requirements.txt

# Copy application code last (for Docker layer caching efficiency)
COPY . .

# Create models directory
RUN mkdir -p /app/models

# Add script to check and download smart-turn model if missing
RUN echo '#!/bin/bash\n\
echo "🔍 Checking if smart-turn model exists..."\n\
if [ ! -d "/app/models/smart-turn" ]; then\n\
    echo "📥 Smart-turn model not found, downloading in background..."\n\
    cd /app/models\n\
    git lfs install\n\
    git clone https://huggingface.co/pipecat-ai/smart-turn &\n\
    cd /app\n\
    echo "✅ Smart-turn model download started in background"\n\
else\n\
    echo "✅ Smart-turn model already exists, skipping download"\n\
fi\n\
echo "🚀 Starting Python bot..."\n\
exec python main.py' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 7860

# Use the start script instead of direct python execution
CMD ["/app/start.sh"]
