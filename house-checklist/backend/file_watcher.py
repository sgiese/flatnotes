#!/usr/bin/env python3
"""
File Watcher for House Checklist
Monitors the House Checklist.md file for changes
"""

import asyncio
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime

class ChecklistFileHandler(FileSystemEventHandler):
    def __init__(self, callback):
        self.callback = callback
        self.last_modified = datetime.now()
    
    def on_modified(self, event):
        if event.is_directory:
            return
        
        # Check if it's our target file
        if 'House Checklist.md' in event.src_path:
            # Debounce rapid changes (within 1 second)
            now = datetime.now()
            if (now - self.last_modified).total_seconds() > 1:
                self.last_modified = now
                self.callback()

class FileWatcher:
    def __init__(self, file_path: str, callback):
        self.file_path = Path(file_path)
        self.callback = callback
        self.observer = None
    
    def start(self):
        """Start watching the file's directory"""
        event_handler = ChecklistFileHandler(self.callback)
        self.observer = Observer()
        self.observer.schedule(event_handler, str(self.file_path.parent), recursive=False)
        self.observer.start()
    
    def stop(self):
        """Stop watching"""
        if self.observer:
            self.observer.stop()
            self.observer.join()