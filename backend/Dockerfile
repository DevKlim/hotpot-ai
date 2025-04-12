# backend/Dockerfile

# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Set a default port for local testing if needed, Render will override via $PORT
ENV PORT 8001

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if needed
# RUN apt-get update && apt-get install -y --no-install-recommends some-package && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY ./app /app/app

# Expose the port the app runs on (informational)
EXPOSE 8001

# --- CHANGE THIS LINE ---
# Define the command to run the application using shell form to expand $PORT
# Use 'exec' to replace the shell process with uvicorn, which is good practice
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}
# --- END CHANGE ---

# Explanation of the new CMD:
# - `exec`: Replaces the shell process with the uvicorn process. This is cleaner for signal handling.
# - `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}`: This is now executed by the shell.
# - `${PORT:-8001}`: This is shell parameter expansion.
#   - If the environment variable `PORT` is set (which Render does), it uses that value.
#   - If `PORT` is *not* set or is empty, it uses the default value `8001` (useful if you run the container locally without setting PORT).