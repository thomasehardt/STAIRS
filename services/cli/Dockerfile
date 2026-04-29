FROM python:3.14-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    libpng-dev                                    \
    libfreetype6-dev                              \
    fontconfig                                    \
    fonts-liberation                              \
    fonts-dejavu-core                             \
    && rm -rf /var/lib/apt/lists/*                \
    && fc-cache -fv                               \
    && rm -rf /root/.cache/matplotlib

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

COPY src/ /app/src/

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src
ENV MPLBACKEND=Agg

ENTRYPOINT ["stairs"]
CMD ["--help"]
