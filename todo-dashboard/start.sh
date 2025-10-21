#!/usr/bin/env bash

# Start Todo Dashboard

echo "🚀 Starting Todo Dashboard..."

# Kill any existing processes on our ports
echo "🧹 Cleaning up any existing services..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
lsof -ti:8002 | xargs kill -9 2>/dev/null || true
sleep 1

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    cd ..
else
    cd backend
    source venv/bin/activate
    cd ..
fi

# Start backend
echo "🔧 Starting backend API on port 8001..."
cd backend
python -m uvicorn api:app --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!
cd ..

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