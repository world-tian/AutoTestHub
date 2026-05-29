#!/bin/bash
echo "Starting AutoTestHub MVP Local Setup..."

# Setup Python Virtual Env for Backend
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize Database and Seed Data
echo "Initializing Database..."
python -m app.seed

# Start Backend in background
echo "Starting Backend on http://localhost:8000"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Start Frontend
echo "Starting Frontend on http://localhost:5173"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "AutoTestHub MVP is running."
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
