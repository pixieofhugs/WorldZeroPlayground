FROM python:3.12-slim

WORKDIR /app

# Runtime deps only — requirements.txt is the dev/CI superset and pulls in the
# pytest family, which has no business in the image.
COPY backend/requirements-prod.txt .
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY backend/ .
RUN chmod +x start.sh

EXPOSE 8000
CMD ["./start.sh"]
