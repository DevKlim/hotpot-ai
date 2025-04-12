#!/bin/bash

# Script to set up the initial directory structure and empty files for the Hotpot.AI project.

PROJECT_DIR="hotpot_ai"

# --- Backend Structure ---
echo "Setting up backend..."
mkdir -p "backend/app"

touch "backend/requirements.txt"
touch "backend/.env.example"
touch "backend/app/__init__.py"
touch "backend/app/main.py"
touch "backend/app/models.py"
touch "backend/app/llm_handler.py"
touch "backend/app/cache.py"

# --- Frontend Structure ---
echo "Setting up frontend..."
mkdir -p "frontend/assets/img"

touch "frontend/index.html"
touch "frontend/style.css"
touch "frontend/script.js"
touch "frontend/assets/img/pot_background.png" # Placeholder image file

# --- Root Files ---
echo "Creating root files..."
# --- Permissions (Optional but good practice for scripts later) ---
# chmod +x backend/run.sh # Example if you add run scripts later

echo "-------------------------------------"
echo "Hotpot.AI project structure created successfully in '$PWD'."
echo "You can now copy your code into the respective empty files."
echo "Remember to:"
echo "1. Fill in backend/.env.example and save as backend/.env with your API key."
echo "2. Install backend dependencies using 'pip install -r backend/requirements.txt'."
echo "3. Place your actual README.md content into the created file."
echo "-------------------------------------"

cd .. # Go back to the original directory

exit 0