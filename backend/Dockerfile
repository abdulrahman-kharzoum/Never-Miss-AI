FROM python:3.11-slim

WORKDIR /app

# Install build deps and clean cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app

ENV PORT=8011
EXPOSE 8011

# Run using the PORT env var (default 8011)
CMD ["sh", "-c", "uvicorn server:sio_app --host 0.0.0.0 --port ${PORT:-8011}"]
