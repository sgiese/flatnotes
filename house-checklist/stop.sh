#!/bin/bash

echo "🛑 Stopping House Checklist server..."
pkill -f "uvicorn.*8003" 2>/dev/null
pkill -f "http.server 8004" 2>/dev/null
echo "✅ House Checklist stopped"