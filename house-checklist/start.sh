#!/usr/bin/env bash

# Start House Checklist

echo "🏠 Starting House Checklist..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up any existing services..."
lsof -ti:8003 | xargs kill -9 2>/dev/null || true
lsof -ti:8004 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend using mise Python
echo "🔧 Starting backend API on port 8003..."
cd backend
mise exec -- python api.py &
BACKEND_PID=$!
cd ..

# Start frontend server
echo "🌐 Starting frontend server on port 8004..."
cd frontend
python3 -m http.server 8004 &
FRONTEND_PID=$!
cd ..

echo "✅ House Checklist is running!"
echo "   Frontend: http://localhost:8004"
echo "   API: http://localhost:8003"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for interrupt
trap "echo '🛑 Stopping...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait