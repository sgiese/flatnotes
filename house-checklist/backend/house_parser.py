#!/usr/bin/env python3
"""
House Checklist Parser
Parses the House Checklist.md file and provides structured data
"""

import re
from pathlib import Path
from typing import Dict, List, Optional

class HouseChecklistParser:
    def __init__(self, file_path: str = "/home/sgiese/coding/flatnotes/data/House Checklist.md"):
        self.file_path = Path(file_path)
        
    def parse_checklist(self) -> Dict:
        """Parse the House Checklist.md file into structured data"""
        with open(self.file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        lines = content.split('\n')
        data = {
            'interior': {
                'title': 'Interior Tasks (Post-Drywall)',
                'phases': []
            },
            'exterior': {
                'title': 'Exterior Tasks',
                'phases': []
            }
        }
        
        current_section = None
        current_phase = None
        current_sub_phase = None  # Floor level (Upstairs, Mid Level, Downstairs)
        current_room = None  # Room level (Great Room, Main Hall, etc.)
        
        for line in lines:
            # Skip empty lines and title
            if not line.strip() or line.startswith('# House'):
                continue
            
            # Skip notes section
            if line.startswith('---') or line.startswith('## Notes'):
                break
                
            # Count indent level (spaces at start)
            indent = len(line) - len(line.lstrip())
            
            # Main sections (Interior/Exterior)
            if '**Interior Tasks' in line:
                current_section = 'interior'
                current_phase = None
                current_sub_phase = None
                current_room = None
                continue
            elif '**Exterior Tasks' in line:
                current_section = 'exterior'
                current_phase = None
                current_sub_phase = None
                current_room = None
                continue
            
            if not current_section:
                continue
            
            # Phase detection (e.g., "**Phase 1: Painting**")
            if '**Phase' in line and ':' in line:
                # Extract phase title from the line
                phase_text = re.search(r'\*\*(Phase \d+: .+?)\*\*', line)
                if phase_text:
                    phase_title = phase_text.group(1)
                    current_phase = {
                        'title': phase_title,
                        'tasks': []
                    }
                    data[current_section]['phases'].append(current_phase)
                    current_sub_phase = None
                    current_room = None
                continue
            
            # Check if line contains a task
            task_match = re.match(r'\s*- \[([ xX])\] (.+)', line)
            if task_match:
                completed = task_match.group(1).lower() == 'x'
                task_text = task_match.group(2).strip()
                
                # For painting phase, handle special nesting
                if current_phase and 'Painting' in current_phase.get('title', ''):
                    # Check if this is a floor level (Upstairs, Mid Level, Downstairs)
                    if '**' in task_text and indent == 4:  # Floor level (same indent as phase)
                        floor_title = task_text.replace('**', '').strip()
                        current_sub_phase = {
                            'title': floor_title,
                            'rooms': []
                        }
                        # Initialize subPhases if needed
                        if 'subPhases' not in current_phase:
                            current_phase['subPhases'] = []
                            current_phase.pop('tasks', None)
                        current_phase['subPhases'].append(current_sub_phase)
                        current_room = None
                    # Check if this is a room level
                    elif '**' in task_text and current_sub_phase and indent == 6:  # Room level
                        room_title = task_text.replace('**', '').strip()
                        current_room = {
                            'title': room_title,
                            'tasks': []
                        }
                        current_sub_phase['rooms'].append(current_room)
                    # This is a task level
                    elif current_room and indent == 8:
                        task_text = task_text.replace('**', '')
                        task = {
                            'text': task_text,
                            'completed': completed
                        }
                        current_room['tasks'].append(task)
                    # Fallback for tasks directly under sub-phase
                    elif current_sub_phase:
                        task_text = task_text.replace('**', '')
                        task = {
                            'text': task_text,
                            'completed': completed
                        }
                        if 'tasks' not in current_sub_phase:
                            current_sub_phase['tasks'] = []
                        current_sub_phase['tasks'].append(task)
                # Handle non-painting phases
                elif '**' in task_text:
                    # This is a sub-phase header
                    sub_phase_title = task_text.replace('**', '').strip()
                    current_sub_phase = {
                        'title': sub_phase_title,
                        'tasks': []
                    }
                    # Initialize subPhases if needed
                    if 'subPhases' not in current_phase:
                        current_phase['subPhases'] = []
                        current_phase.pop('tasks', None)
                    current_phase['subPhases'].append(current_sub_phase)
                    current_room = None
                else:
                    # This is a regular task
                    task_text = task_text.replace('**', '')
                    
                    task = {
                        'text': task_text,
                        'completed': completed
                    }
                    
                    # Add task to appropriate location
                    if current_sub_phase and indent > 4:
                        current_sub_phase['tasks'].append(task)
                    elif current_phase:
                        # Direct phase task
                        if 'subPhases' not in current_phase:
                            if 'tasks' not in current_phase:
                                current_phase['tasks'] = []
                            current_phase['tasks'].append(task)
        
        return data
    
    def update_file(self, updates: Dict) -> bool:
        """Update the markdown file with new completion status"""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Process updates
            for update in updates:
                line_num = update.get('line_number')
                completed = update.get('completed')
                
                if line_num and 0 < line_num <= len(lines):
                    line = lines[line_num - 1]
                    if completed:
                        lines[line_num - 1] = line.replace('- [ ]', '- [x]', 1)
                    else:
                        lines[line_num - 1] = line.replace('- [x]', '- [ ]', 1).replace('- [X]', '- [ ]', 1)
            
            # Write back to file
            with open(self.file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            
            return True
        except Exception as e:
            print(f"Error updating file: {e}")
            return False
    
    def get_statistics(self) -> Dict:
        """Get statistics about the checklist"""
        data = self.parse_checklist()
        
        stats = {
            'total': 0,
            'completed': 0,
            'interior': {'total': 0, 'completed': 0},
            'exterior': {'total': 0, 'completed': 0},
            'phases': {}
        }
        
        for section in ['interior', 'exterior']:
            for phase in data[section]['phases']:
                phase_stats = {'total': 0, 'completed': 0}
                
                if 'subPhases' in phase:
                    for sub_phase in phase['subPhases']:
                        # Check if sub_phase has rooms (for painting phase)
                        if 'rooms' in sub_phase:
                            for room in sub_phase['rooms']:
                                for task in room['tasks']:
                                    stats['total'] += 1
                                    stats[section]['total'] += 1
                                    phase_stats['total'] += 1
                                    
                                    if task['completed']:
                                        stats['completed'] += 1
                                        stats[section]['completed'] += 1
                                        phase_stats['completed'] += 1
                        # Otherwise process tasks directly
                        elif 'tasks' in sub_phase:
                            for task in sub_phase['tasks']:
                                stats['total'] += 1
                                stats[section]['total'] += 1
                                phase_stats['total'] += 1
                                
                                if task['completed']:
                                    stats['completed'] += 1
                                    stats[section]['completed'] += 1
                                    phase_stats['completed'] += 1
                elif 'tasks' in phase:
                    for task in phase['tasks']:
                        stats['total'] += 1
                        stats[section]['total'] += 1
                        phase_stats['total'] += 1
                        
                        if task['completed']:
                            stats['completed'] += 1
                            stats[section]['completed'] += 1
                            phase_stats['completed'] += 1
                
                stats['phases'][phase['title']] = phase_stats
        
        # Calculate percentages
        stats['percentage'] = round((stats['completed'] / stats['total']) * 100, 1) if stats['total'] > 0 else 0
        stats['interior']['percentage'] = round((stats['interior']['completed'] / stats['interior']['total']) * 100, 1) if stats['interior']['total'] > 0 else 0
        stats['exterior']['percentage'] = round((stats['exterior']['completed'] / stats['exterior']['total']) * 100, 1) if stats['exterior']['total'] > 0 else 0
        
        return stats

if __name__ == "__main__":
    parser = HouseChecklistParser()
    data = parser.parse_checklist()
    stats = parser.get_statistics()
    
    print(f"Total Tasks: {stats['total']}")
    print(f"Completed: {stats['completed']} ({stats['percentage']}%)")
    print(f"Interior: {stats['interior']['completed']}/{stats['interior']['total']} ({stats['interior']['percentage']}%)")
    print(f"Exterior: {stats['exterior']['completed']}/{stats['exterior']['total']} ({stats['exterior']['percentage']}%)")