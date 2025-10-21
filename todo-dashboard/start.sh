#!/usr/bin/env bash

# Start Todo Dashboard

echo "🚀 Starting Todo Dashboard..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up any existing services..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:8002 | xargs kill -9 2>/dev/null || true
sleep 1

# Navigate to project root to use mise
cd "$(dirname "$0")/.."

# Ensure mise dependencies are installed
echo "📦 Ensuring dependencies are installed..."
mise exec -- pip install -q -r todo-dashboard/backend/requirements.txt

# Start backend using mise
echo "🔧 Starting backend API on port 8001..."
mise exec -- python -m uvicorn api:app --host 0.0.0.0 --port 8001 --app-dir todo-dashboard/backend &
BACKEND_PID=$!

cd todo-dashboard

# Start frontend server
echo "🌐 Starting frontend server on port 8002..."
cd frontend
python3 -m http.server 8002 &
FRONTEND_PID=$!
cd ..

echo "✅ Todo Dashboard is running!"
echo "   Backend API: http://localhost:8001"
echo "   Frontend: http://localhost:8002"
echo "   API Docs: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for interrupt
trap "echo '🛑 Stopping...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait