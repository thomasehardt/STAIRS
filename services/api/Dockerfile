FROM python:3.14-slim

WORKDIR /app

# Create a non-root user for security, matching common host UID/GID
RUN groupadd -g 1000 stairs && \
    useradd -u 1000 -g stairs -m stairs

COPY services/api/pyproject.toml .
RUN pip install --no-cache-dir .

COPY services/api/src/ /app/src/
COPY data/ /app/data/
# Copy config.yaml if it exists, otherwise it must be mounted
COPY config.yaml* /app/

# Create data/cache/log dirs and set permissions
RUN mkdir -p /app_data/cache /app_data/logs && \
    chown -R stairs:stairs /app /app_data

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV DATA_DIR=/app/data
ENV CONFIG_FILE=/app/config.yaml
ENV HOME=/home/stairs

# Switch to the non-root user
USER stairs

CMD [ "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000" ]
