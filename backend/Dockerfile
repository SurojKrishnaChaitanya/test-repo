# Production Dockerfile for INDRA-AI Convective Atmospheric Backend
# Target Runtime: Render, Hugging Face Spaces, or Local Docker Container
FROM python:3.11-slim

# Set environment defaults
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

# Set container working directory
WORKDIR /app

# Install minimal OS dependencies required for atmospheric computing & health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code into container
COPY . .

# Expose default HTTP port
EXPOSE 8000

# Dynamic port binding for Render/HF Spaces/Docker compatibility
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
