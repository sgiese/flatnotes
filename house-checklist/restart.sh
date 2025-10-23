#!/bin/bash

echo "🔄 Restarting House Checklist server..."

# Stop existing servers
pkill -f "uvicorn.*8003" 2>/dev/null
pkill -f "http.server 8004" 2>/dev/null

# Wait a moment
sleep 1

# Start the server
./start.sh