# Dockerfile for SYNapse Django Backend
FROM python:3.12-slim

# Prevent Python from writing .pyc and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies including postgresql-client, rsync, and gzip
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    postgresql-client \
    rsync \
    gzip \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . /app/

# Create backups directory
RUN mkdir -p /app/backups

# Expose Django port
EXPOSE 8000

# Default command: run development server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
