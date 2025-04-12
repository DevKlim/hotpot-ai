# backend/Dockerfile

# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Set the port the application will run on (Render injects its own PORT env var, but Uvicorn needs a default)
ENV PORT 8001

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if needed (likely not for this app)
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY ./app /app/app

# Expose the port the app runs on
# Render ignores this EXPOSE, but it's good practice. Render uses the PORT env var.
EXPOSE 8001

# Define the command to run the application
# Use 0.0.0.0 to make it accessible from outside the container within Render's network
# Render will set the $PORT environment variable, which Uvicorn will use if specified like this.
# If Render doesn't set $PORT reliably, fallback to the ENV PORT defined above.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "$PORT"]