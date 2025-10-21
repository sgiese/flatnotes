#!/usr/bin/env python3
"""
Todo Parser for Markdown Files
Extracts todos from markdown files and provides metadata
"""

import os
import re
import hashlib
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime
import json
import mistune


class TodoParser:
    def __init__(self, data_dir: str = "/home/sgiese/coding/flatnotes/data"):
        self.data_dir = Path(data_dir)
        self.todo_pattern = re.compile(r'^(\s*)-\s+\[([ xX])\]\s+(.+)$', re.MULTILINE)
        self.heading_pattern = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)
        self.tag_pattern = re.compile(r'#(\w+(?:-\w+)*)')
        self.date_pattern = re.compile(r'\b(\d{4}-\d{2}-\d{2})\b')
        self.priority_pattern = re.compile(r'(?:^|\s)(!{1,3})(?:\s|$)')
        # Initialize mistune markdown renderer for inline formatting only
        self.markdown = mistune.create_markdown(renderer='html', plugins=['strikethrough'])
        
    def scan_markdown_files(self) -> List[Path]:
        """Recursively find all .md files in data directory"""
        return list(self.data_dir.glob("**/*.md"))
    
    def generate_todo_id(self, file_path: str, line_number: int, text: str) -> str:
        """Generate a unique ID for a todo item"""
        content = f"{file_path}:{line_number}:{text}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def extract_context(self, lines: List[str], line_index: int, context_lines: int = 2) -> str:
        """Extract surrounding context for a todo"""
        start = max(0, line_index - context_lines)
        end = min(len(lines), line_index + context_lines + 1)
        
        context_lines = []
        for i in range(start, end):
            if i != line_index:  # Skip the todo line itself
                line = lines[i].strip()
                if line and not line.startswith('- ['):  # Skip other todos
                    context_lines.append(line)
        
        return ' '.join(context_lines)[:200]  # Limit context length
    
    def extract_metadata(self, text: str, file_path: Path, line_number: int, context: str) -> Dict:
        """Extract metadata from todo text and context"""
        # Extract tags
        tags = self.tag_pattern.findall(text + ' ' + context)
        tags = list(set(tags))  # Remove duplicates
        
        # Extract dates
        dates = self.date_pattern.findall(text)
        due_date = dates[0] if dates else None
        
        # Extract priority (!, !!, !!!)
        priority_match = self.priority_pattern.search(text)
        priority = len(priority_match.group(1)) if priority_match else 0
        
        # Clean text (remove priority markers)
        clean_text = self.priority_pattern.sub('', text).strip()
        
        return {
            "tags": tags,
            "due_date": due_date,
            "priority": priority,
            "text": clean_text,
            "raw_text": text
        }
    
    def parse_todos(self, content: str, file_path: Path) -> List[Dict]:
        """Extract todos from markdown content with heading information"""
        todos = []
        lines = content.split('\n')
        
        # Track current heading
        current_heading = None
        heading_level = 0
        
        # Track groups of contiguous todos
        last_todo_line = -999
        group_id = None
        group_start_line = None
        
        for i, line in enumerate(lines):
            # Check for headings
            heading_match = self.heading_pattern.match(line)
            if heading_match:
                heading_level = len(heading_match.group(1))
                current_heading = heading_match.group(2).strip()
                continue
            
            # Check for todos
            match = self.todo_pattern.match(line)
            if match:
                indent = len(match.group(1))
                completed = match.group(2).lower() == 'x'
                text = match.group(3)
                
                # Check if this is part of a contiguous group
                is_contiguous = (i == last_todo_line + 1)
                if not is_contiguous:
                    # Start a new group
                    group_id = f"{file_path.stem}_{i}"
                    group_start_line = i + 1
                
                last_todo_line = i
                
                # Extract context
                context = self.extract_context(lines, i)
                
                # Extract metadata
                metadata = self.extract_metadata(text, file_path, i + 1, context)
                
                # Format text with markdown - render as inline HTML
                # Strip any paragraph tags since we're just formatting inline text
                formatted_html = self.markdown(metadata["text"])
                formatted_text = formatted_html.replace('<p>', '').replace('</p>', '').strip()
                
                # Build todo object
                todo = {
                    "id": self.generate_todo_id(str(file_path), i + 1, text),
                    "file": str(file_path.relative_to(self.data_dir)),
                    "file_path": str(file_path),
                    "line_number": i + 1,
                    "indent_level": indent // 2,  # Convert spaces to indent level
                    "indent_pixels": indent * 10,  # Pixels for CSS indentation
                    "completed": completed,
                    "text": metadata["text"],
                    "formatted_text": formatted_text,
                    "raw_text": metadata["raw_text"],
                    "tags": metadata["tags"],
                    "due_date": metadata["due_date"],
                    "priority": metadata["priority"],
                    "context": context,
                    "created_date": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "heading": current_heading,
                    "heading_level": heading_level if current_heading else 0,
                    "group_id": group_id,
                    "group_start_line": group_start_line,
                    "is_contiguous": is_contiguous
                }
                
                todos.append(todo)
        
        return todos
    
    def scan_all_todos(self) -> List[Dict]:
        """Scan all markdown files and extract todos"""
        all_todos = []
        
        for file_path in self.scan_markdown_files():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                todos = self.parse_todos(content, file_path)
                all_todos.extend(todos)
            except Exception as e:
                print(f"Error parsing {file_path}: {e}")
        
        return all_todos
    
    def toggle_todo(self, file_path: str, line_number: int) -> bool:
        """Toggle a todo's completion status in the markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if 0 < line_number <= len(lines):
                line = lines[line_number - 1]
                
                # Toggle between [ ] and [x]
                if '- [ ]' in line:
                    lines[line_number - 1] = line.replace('- [ ]', '- [x]', 1)
                elif '- [x]' in line or '- [X]' in line:
                    lines[line_number - 1] = line.replace('- [x]', '- [ ]', 1).replace('- [X]', '- [ ]', 1)
                else:
                    return False
                
                # Write back to file
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                
                return True
        except Exception as e:
            print(f"Error toggling todo in {file_path}:{line_number} - {e}")
            return False
    
    def get_stats(self, todos: List[Dict]) -> Dict:
        """Generate statistics from todos"""
        total = len(todos)
        completed = sum(1 for t in todos if t['completed'])
        
        # Group by file
        by_file = {}
        for todo in todos:
            file = todo['file']
            if file not in by_file:
                by_file[file] = {"total": 0, "completed": 0}
            by_file[file]["total"] += 1
            if todo['completed']:
                by_file[file]["completed"] += 1
        
        # Group by tag
        by_tag = {}
        for todo in todos:
            for tag in todo['tags']:
                if tag not in by_tag:
                    by_tag[tag] = {"total": 0, "completed": 0}
                by_tag[tag]["total"] += 1
                if todo['completed']:
                    by_tag[tag]["completed"] += 1
        
        return {
            "total": total,
            "completed": completed,
            "pending": total - completed,
            "completion_rate": round(completed / total * 100, 1) if total > 0 else 0,
            "by_file": by_file,
            "by_tag": by_tag,
            "high_priority": sum(1 for t in todos if t['priority'] >= 2 and not t['completed']),
            "overdue": sum(1 for t in todos if t['due_date'] and t['due_date'] < datetime.now().strftime('%Y-%m-%d') and not t['completed'])
        }


if __name__ == "__main__":
    # Test the parser
    parser = TodoParser()
    todos = parser.scan_all_todos()
    
    print(f"Found {len(todos)} todos across all files")
    print("\nSample todos:")
    for todo in todos[:5]:
        status = "✓" if todo['completed'] else "○"
        print(f"{status} [{todo['file']}:{todo['line_number']}] {todo['text']}")
    
    stats = parser.get_stats(todos)
    print(f"\nStatistics:")
    print(f"Total: {stats['total']}")
    print(f"Completed: {stats['completed']}")
    print(f"Pending: {stats['pending']}")
    print(f"Completion Rate: {stats['completion_rate']}%")
    print(f"High Priority: {stats['high_priority']}")
    print(f"Overdue: {stats['overdue']}")