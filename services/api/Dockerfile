FROM python:3.14-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY src/ /app/src/
COPY data/ /app/data/
# Copy config.yaml if it exists, otherwise it must be mounted
COPY config.yaml* /app/

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV DATA_DIR=/app/data
ENV CONFIG_FILE=/app/config.yaml

CMD [ "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000" ]
