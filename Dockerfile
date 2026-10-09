FROM python:3.11-slim

WORKDIR /app

# Install ffmpeg for 15s highlight clip extraction
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

COPY . /app

ENV PORT=8080
ENV HOST=0.0.0.0
ENV PITCHSTAT_PASSWORD=pitch2026

EXPOSE 8080

CMD ["python3", "server.py"]
