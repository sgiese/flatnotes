#!/usr/bin/env python3
"""
FastAPI Backend for Todo Dashboard
Provides REST API endpoints for todo management
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
from pathlib import Path
from datetime import datetime
import json

from parser import TodoParser

app = FastAPI(title="Todo Dashboard API", version="1.0.0")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize parser
parser = TodoParser()

# Cache for todos
todos_cache = []
last_update = None


class TodoToggle(BaseModel):
    file_path: str
    line_number: int


class TodoFilter(BaseModel):
    completed: Optional[bool] = None
    tags: Optional[List[str]] = None
    file: Optional[str] = None
    priority: Optional[int] = None
    search: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    """Initialize todos on startup"""
    await refresh_todos()


async def refresh_todos():
    """Refresh the todos cache"""
    global todos_cache, last_update
    todos_cache = parser.scan_all_todos()
    last_update = datetime.now().isoformat()


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Todo Dashboard API",
        "endpoints": {
            "todos": "/todos",
            "stats": "/stats",
            "toggle": "/toggle",
            "refresh": "/refresh",
            "files": "/files",
            "tags": "/tags"
        }
    }


@app.get("/todos")
async def get_todos(
    completed: Optional[bool] = None,
    tag: Optional[str] = None,
    file: Optional[str] = None,
    priority: Optional[int] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "file",
    limit: Optional[int] = None
) -> List[Dict]:
    """Get all todos with optional filters"""
    todos = todos_cache.copy()
    
    # Apply filters
    if completed is not None:
        todos = [t for t in todos if t['completed'] == completed]
    
    if tag:
        todos = [t for t in todos if tag in t['tags']]
    
    if file:
        todos = [t for t in todos if file in t['file']]
    
    if priority is not None:
        todos = [t for t in todos if t['priority'] >= priority]
    
    if search:
        search_lower = search.lower()
        todos = [t for t in todos if search_lower in t['text'].lower() or search_lower in t['context'].lower()]
    
    # Sort todos
    if sort == "priority":
        todos.sort(key=lambda x: x['priority'], reverse=True)
    elif sort == "date":
        todos.sort(key=lambda x: x['due_date'] or '9999-12-31')
    elif sort == "file":
        todos.sort(key=lambda x: (x['file'], x['line_number']))
    elif sort == "recent":
        todos.sort(key=lambda x: x['created_date'], reverse=True)
    
    # Apply limit
    if limit:
        todos = todos[:limit]
    
    return todos


@app.get("/stats")
async def get_stats() -> Dict:
    """Get todo statistics"""
    stats = parser.get_stats(todos_cache)
    stats['last_update'] = last_update
    stats['total_files'] = len(set(t['file'] for t in todos_cache))
    return stats


@app.post("/toggle")
async def toggle_todo(todo: TodoToggle) -> Dict:
    """Toggle a todo's completion status"""
    success = parser.toggle_todo(todo.file_path, todo.line_number)
    
    if success:
        # Refresh cache after toggle
        await refresh_todos()
        return {"success": True, "message": "Todo toggled successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to toggle todo")


@app.post("/refresh")
async def refresh() -> Dict:
    """Manually refresh todos from files"""
    await refresh_todos()
    return {
        "success": True,
        "message": "Todos refreshed",
        "count": len(todos_cache),
        "last_update": last_update
    }


@app.get("/files")
async def get_files() -> List[str]:
    """Get list of all files containing todos"""
    files = list(set(t['file'] for t in todos_cache))
    files.sort()
    return files


@app.get("/tags")
async def get_tags() -> List[Dict]:
    """Get all unique tags with counts"""
    tag_counts = {}
    for todo in todos_cache:
        for tag in todo['tags']:
            if tag not in tag_counts:
                tag_counts[tag] = 0
            tag_counts[tag] += 1
    
    tags = [{"name": tag, "count": count} for tag, count in tag_counts.items()]
    tags.sort(key=lambda x: x['count'], reverse=True)
    return tags


@app.get("/todos/{todo_id}")
async def get_todo(todo_id: str) -> Dict:
    """Get a specific todo by ID"""
    for todo in todos_cache:
        if todo['id'] == todo_id:
            return todo
    raise HTTPException(status_code=404, detail="Todo not found")


@app.get("/todos/file/{file_name:path}")
async def get_todos_by_file(file_name: str) -> List[Dict]:
    """Get all todos from a specific file"""
    todos = [t for t in todos_cache if t['file'] == file_name]
    todos.sort(key=lambda x: x['line_number'])
    return todos


@app.get("/kanban")
async def get_kanban_data() -> Dict:
    """Get todos organized for Kanban view"""
    # Simple kanban organization based on priority and status
    kanban = {
        "backlog": [],
        "todo": [],
        "in_progress": [],
        "done": []
    }
    
    for todo in todos_cache:
        if todo['completed']:
            kanban['done'].append(todo)
        elif todo['priority'] >= 3:
            kanban['in_progress'].append(todo)
        elif todo['priority'] >= 1:
            kanban['todo'].append(todo)
        else:
            kanban['backlog'].append(todo)
    
    return kanban


@app.get("/calendar")
async def get_calendar_data() -> Dict:
    """Get todos organized by due date for calendar view"""
    calendar = {}
    
    for todo in todos_cache:
        if todo['due_date']:
            date = todo['due_date']
            if date not in calendar:
                calendar[date] = []
            calendar[date].append(todo)
    
    return calendar


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)