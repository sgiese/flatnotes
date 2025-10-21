#!/usr/bin/env python3
"""
File Watcher for Real-time Updates
Monitors markdown files for changes and triggers todo refresh
"""

import asyncio
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time


class MarkdownHandler(FileSystemEventHandler):
    """Handler for markdown file changes"""
    
    def __init__(self, parser, callback):
        self.parser = parser
        self.callback = callback
        self.last_refresh = 0
        self.refresh_cooldown = 2  # seconds
    
    def should_process(self, event):
        """Check if the event should trigger a refresh"""
        if event.is_directory:
            return False
        
        path = Path(event.src_path)
        if path.suffix != '.md':
            return False
        
        # Ignore hidden files and flatnotes index
        if path.name.startswith('.') or '.flatnotes' in str(path):
            return False
        
        return True
    
    def on_modified(self, event):
        """Handle file modification"""
        if self.should_process(event):
            self.trigger_refresh()
    
    def on_created(self, event):
        """Handle file creation"""
        if self.should_process(event):
            self.trigger_refresh()
    
    def on_deleted(self, event):
        """Handle file deletion"""
        if self.should_process(event):
            self.trigger_refresh()
    
    def trigger_refresh(self):
        """Trigger a refresh with cooldown to prevent excessive updates"""
        current_time = time.time()
        if current_time - self.last_refresh > self.refresh_cooldown:
            self.last_refresh = current_time
            asyncio.create_task(self.callback())


class FileWatcher:
    """File watcher for monitoring markdown changes"""
    
    def __init__(self, parser):
        self.parser = parser
        self.observer = None
        self.handler = None
        self.refresh_callback = None
    
    def set_refresh_callback(self, callback):
        """Set the callback function for refreshing todos"""
        self.refresh_callback = callback
    
    async def start(self):
        """Start watching for file changes"""
        if self.observer is not None:
            return
        
        self.handler = MarkdownHandler(self.parser, self.refresh_callback or self.default_callback)
        self.observer = Observer()
        self.observer.schedule(
            self.handler,
            str(self.parser.data_dir),
            recursive=True
        )
        self.observer.start()
        print(f"Started watching {self.parser.data_dir} for changes")
    
    async def stop(self):
        """Stop watching for file changes"""
        if self.observer is not None:
            self.observer.stop()
            self.observer.join()
            self.observer = None
            print("Stopped file watcher")
    
    async def default_callback(self):
        """Default callback - just print a message"""
        print("Files changed, refresh needed")


if __name__ == "__main__":
    # Test the file watcher
    from parser import TodoParser
    
    async def test_watcher():
        parser = TodoParser()
        watcher = FileWatcher(parser)
        
        async def on_change():
            print("Change detected! Refreshing todos...")
            todos = parser.scan_all_todos()
            print(f"Found {len(todos)} todos")
        
        watcher.set_refresh_callback(on_change)
        await watcher.start()
        
        print("Watching for changes... Press Ctrl+C to stop")
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            await watcher.stop()
    
    asyncio.run(test_watcher())