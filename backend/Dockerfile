FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Ensure 'backend' module is resolvable in sys.path
ENV PYTHONPATH="/app"
RUN mkdir -p /app/backend && ln -s /app/app /app/backend/app && ln -s /app/scripts /app/backend/scripts

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
