# Production image for the Aiva voice agent worker (LiveKit Cloud agent deployment).
# Runs `python agent.py start` (production worker mode, not `dev`).
FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    # Keep all model caches under /app so the non-root user can read them at runtime.
    XDG_CACHE_HOME=/app/.cache \
    HF_HOME=/app/.cache/huggingface \
    TORCH_HOME=/app/.cache/torch

# onnxruntime (the LiveKit turn detector) needs libgomp1; ca-certificates for TLS.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first so code-only changes don't bust the dependency layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Run as a non-privileged user.
RUN useradd -m -u 10001 appuser

COPY . .

# Pre-download the Silero VAD + turn-detector models INTO the image so a call
# never pays the download on its critical path (prewarm just loads from disk).
RUN python agent.py download-files

# The non-root user must own /app including the baked-in model cache.
RUN chown -R appuser:appuser /app
USER appuser

CMD ["python", "agent.py", "start"]
