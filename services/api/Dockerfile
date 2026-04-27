FROM python:3.14-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY src/ /app/src/

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

CMD [ "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000" ]
