#!/bin/bash

# Function to clean up background processes on exit
cleanup() {
    echo -e "\n[+] Stopping all services..."
    # Kill the frontend and backend processes
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    # Stop Docker Compose services
    echo "[+] Stopping Docker Compose..."
    docker compose down
    echo "[+] All services stopped."
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to run the cleanup function
trap cleanup SIGINT SIGTERM

# 1. Start Docker Compose services
echo "[+] Starting Docker Compose services (Elasticsearch)..."
docker compose up -d

# 2. Start Backend
echo "[+] Starting Backend (FastAPI)..."
cd backend || exit
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --reload &
BACKEND_PID=$!
cd ..

# 3. Start Frontend
echo "[+] Starting Frontend (Vite/React)..."
cd frontend || exit
npm run dev &
FRONTEND_PID=$!
cd ..

echo "=================================================="
echo "🚀 App is running!"
echo "📡 Backend URL: http://localhost:8000 (and on your local network IP)"
echo "🌐 Frontend URL: http://localhost:5173 (and on your local network IP)"
echo "🛑 Press Ctrl+C to stop all services."
echo "=================================================="

# Wait for background processes to keep the script running and catch the signals
wait
