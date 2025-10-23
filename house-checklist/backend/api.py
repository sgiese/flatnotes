#!/usr/bin/env python3
"""
House Checklist API
Serves the house checklist data and handles updates
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
from house_parser import HouseChecklistParser
from file_watcher import FileWatcher
import json
import asyncio
from datetime import datetime

app = FastAPI(title="House Checklist API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize parser
parser = HouseChecklistParser()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Track the main event loop
main_loop = None

# File watcher callback
def file_changed():
    """Called when the House Checklist file changes"""
    print(f"File change detected at {datetime.now()}")
    if main_loop:
        asyncio.run_coroutine_threadsafe(notify_clients(), main_loop)

async def notify_clients():
    """Notify all WebSocket clients of changes"""
    try:
        print("Notifying WebSocket clients...")
        data = parser.parse_checklist()
        stats = parser.get_statistics()
        await manager.broadcast({
            "type": "update",
            "data": data,
            "stats": stats
        })
        print(f"Notified {len(manager.active_connections)} clients")
    except Exception as e:
        print(f"Error notifying clients: {e}")

# File watcher will be started when app starts
watcher = None

@app.on_event("startup")
async def startup_event():
    """Start file watcher on app startup"""
    global watcher, main_loop
    main_loop = asyncio.get_running_loop()
    watcher = FileWatcher(parser.file_path, file_changed)
    watcher.start()
    print(f"File watcher started for: {parser.file_path}")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop file watcher on shutdown"""
    global watcher
    if watcher:
        watcher.stop()
        print("File watcher stopped")

class ToggleRequest(BaseModel):
    section: str
    phaseIndex: int
    subPhaseIndex: Optional[int]
    taskIndex: int
    completed: bool

@app.get("/")
def read_root():
    return {"message": "House Checklist API", "endpoints": ["/house-checklist", "/statistics", "/house-checklist/toggle"]}

@app.get("/house-checklist")
def get_checklist():
    """Get the complete house checklist data"""
    try:
        data = parser.parse_checklist()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/statistics")
def get_statistics():
    """Get checklist statistics"""
    try:
        stats = parser.get_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/house-checklist/toggle")
def toggle_task(request: ToggleRequest):
    """Toggle a task's completion status"""
    try:
        # Parse current data to find line number
        with open(parser.file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Parse to get structured data
        data = parser.parse_checklist()
        section_data = data[request.section]
        phase = section_data['phases'][request.phaseIndex]
        
        # Get the task text to find in file
        if request.subPhaseIndex is not None and 'subPhases' in phase:
            task = phase['subPhases'][request.subPhaseIndex]['tasks'][request.taskIndex]
        else:
            task = phase['tasks'][request.taskIndex]
        
        task_text = task['text']
        
        # Find and update the line in the file
        updated = False
        for i, line in enumerate(lines):
            if task_text in line and '- [' in line:
                if request.completed:
                    lines[i] = line.replace('- [ ]', '- [x]')
                else:
                    lines[i] = line.replace('- [x]', '- [ ]').replace('- [X]', '- [ ]')
                updated = True
                break
        
        if updated:
            # Write back to file
            with open(parser.file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            # Trigger file watcher notification
            file_changed()
            
            return {"success": True, "message": "Task updated", "completed": request.completed}
        else:
            return {"success": False, "message": "Task not found"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await manager.connect(websocket)
    try:
        # Send initial data
        data = parser.parse_checklist()
        stats = parser.get_statistics()
        await websocket.send_json({
            "type": "initial",
            "data": data,
            "stats": stats
        })
        
        # Keep connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)