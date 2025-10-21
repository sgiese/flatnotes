// Todo Dashboard Frontend Application

const API_URL = 'http://localhost:8001';
const FLATNOTES_URL = 'http://localhost:8080';

let todos = [];
let currentView = 'list';
let filters = {
    status: 'all',
    priority: 'all',
    tag: 'all',
    file: 'all',
    search: ''
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadTodos();
    loadFilters();
    setInterval(loadTodos, 30000); // Auto-refresh every 30 seconds
});

// Event Listeners
function initializeEventListeners() {
    // View tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchView(e.target.dataset.view);
        });
    });

    // Refresh button
    document.getElementById('refresh-btn').addEventListener('click', () => {
        refreshTodos();
    });

    // Filters
    document.getElementById('filter-status').addEventListener('change', (e) => {
        filters.status = e.target.value;
        renderCurrentView();
    });

    document.getElementById('filter-priority').addEventListener('change', (e) => {
        filters.priority = e.target.value;
        renderCurrentView();
    });

    document.getElementById('filter-tag').addEventListener('change', (e) => {
        filters.tag = e.target.value;
        renderCurrentView();
    });

    document.getElementById('filter-file').addEventListener('change', (e) => {
        filters.file = e.target.value;
        renderCurrentView();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        filters.search = e.target.value.toLowerCase();
        renderCurrentView();
    });
}

// API Functions
async function loadTodos() {
    try {
        const response = await fetch(`${API_URL}/todos`);
        todos = await response.json();
        renderCurrentView();
        updateStats();
    } catch (error) {
        console.error('Error loading todos:', error);
        showError('Failed to load todos');
    }
}

async function toggleTodo(filePath, lineNumber) {
    try {
        const response = await fetch(`${API_URL}/toggle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_path: filePath,
                line_number: lineNumber
            })
        });

        if (response.ok) {
            await loadTodos();
        } else {
            showError('Failed to toggle todo');
        }
    } catch (error) {
        console.error('Error toggling todo:', error);
        showError('Failed to toggle todo');
    }
}

async function refreshTodos() {
    const btn = document.getElementById('refresh-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';

    try {
        const response = await fetch(`${API_URL}/refresh`, {
            method: 'POST'
        });

        if (response.ok) {
            await loadTodos();
            showSuccess('Todos refreshed');
        }
    } catch (error) {
        console.error('Error refreshing:', error);
        showError('Failed to refresh todos');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh';
    }
}

async function loadFilters() {
    try {
        // Load tags
        const tagsResponse = await fetch(`${API_URL}/tags`);
        const tags = await tagsResponse.json();
        const tagSelect = document.getElementById('filter-tag');
        tagSelect.innerHTML = '<option value="all">All Tags</option>';
        tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag.name;
            option.textContent = `${tag.name} (${tag.count})`;
            tagSelect.appendChild(option);
        });

        // Load files
        const filesResponse = await fetch(`${API_URL}/files`);
        const files = await filesResponse.json();
        const fileSelect = document.getElementById('filter-file');
        fileSelect.innerHTML = '<option value="all">All Files</option>';
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file;
            fileSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

async function updateStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const stats = await response.json();

        // Update mini stats
        document.getElementById('stats-summary').textContent = 
            `${stats.pending} pending • ${stats.completed} completed • ${stats.completion_rate}% done`;

        // Update detailed stats
        document.getElementById('stats-detailed').innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total Todos</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.pending}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.completion_rate}%</div>
                <div class="stat-label">Complete</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.high_priority}</div>
                <div class="stat-label">High Priority</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.overdue}</div>
                <div class="stat-label">Overdue</div>
            </div>
        `;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// View Management
function switchView(view) {
    currentView = view;

    // Update tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Update view containers
    document.querySelectorAll('.view-container').forEach(container => {
        container.classList.toggle('active', container.id === `${view}-view`);
    });

    renderCurrentView();
}

function renderCurrentView() {
    const filteredTodos = filterTodos(todos);

    switch (currentView) {
        case 'list':
            renderListView(filteredTodos);
            break;
        case 'kanban':
            renderKanbanView(filteredTodos);
            break;
        case 'files':
            renderFilesView(filteredTodos);
            break;
        case 'calendar':
            renderCalendarView(filteredTodos);
            break;
    }
}

function filterTodos(todos) {
    return todos.filter(todo => {
        // Status filter
        if (filters.status !== 'all') {
            if (filters.status === 'pending' && todo.completed) return false;
            if (filters.status === 'completed' && !todo.completed) return false;
        }

        // Priority filter
        if (filters.priority !== 'all') {
            const minPriority = parseInt(filters.priority);
            if (todo.priority < minPriority) return false;
        }

        // Tag filter
        if (filters.tag !== 'all') {
            if (!todo.tags.includes(filters.tag)) return false;
        }

        // File filter
        if (filters.file !== 'all') {
            if (todo.file !== filters.file) return false;
        }

        // Search filter
        if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            if (!todo.text.toLowerCase().includes(searchLower) &&
                !todo.context.toLowerCase().includes(searchLower)) {
                return false;
            }
        }

        return true;
    });
}

// View Renderers
function renderListView(todos) {
    const container = document.getElementById('todo-list');
    
    if (todos.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No todos found</h3><p>Try adjusting your filters</p></div>';
        return;
    }

    // Group todos by their group_id
    const groups = {};
    todos.forEach(todo => {
        const groupKey = todo.group_id || `single_${todo.id}`;
        if (!groups[groupKey]) {
            groups[groupKey] = {
                todos: [],
                heading: todo.heading,
                heading_level: todo.heading_level,
                file: todo.file,
                start_line: todo.group_start_line
            };
        }
        groups[groupKey].todos.push(todo);
    });

    // Render grouped todos
    const groupedHtml = Object.values(groups).map(group => {
        const isGroup = group.todos.length > 1;
        
        if (isGroup) {
            // Render as a grouped list with heading
            return `
                <div class="todo-group">
                    ${group.heading ? `
                        <div class="todo-group-header">
                            <h${Math.min(group.heading_level + 2, 6)} class="todo-group-title">
                                ${escapeHtml(group.heading)}
                            </h${Math.min(group.heading_level + 2, 6)}>
                            <a href="${FLATNOTES_URL}/note/${encodeURIComponent(group.file.replace('.md', ''))}#L${group.start_line}" 
                               target="_blank" 
                               class="todo-group-link">
                               📄 ${group.file}:${group.start_line}
                            </a>
                        </div>
                    ` : `
                        <div class="todo-group-header">
                            <a href="${FLATNOTES_URL}/note/${encodeURIComponent(group.file.replace('.md', ''))}#L${group.start_line}" 
                               target="_blank" 
                               class="todo-group-link">
                               📄 ${group.file}:${group.start_line}
                            </a>
                        </div>
                    `}
                    <div class="todo-group-items">
                        ${group.todos.map(todo => `
                            <div class="todo-item grouped">
                                <input type="checkbox" 
                                       class="todo-checkbox" 
                                       ${todo.completed ? 'checked' : ''}
                                       onchange="toggleTodo('${todo.file_path}', ${todo.line_number})">
                                <div class="todo-content">
                                    <div class="todo-text ${todo.completed ? 'completed' : ''}">
                                        ${renderPriority(todo.priority)}
                                        ${escapeHtml(todo.text)}
                                    </div>
                                    <div class="todo-meta compact">
                                        ${todo.tags.map(tag => `<span class="todo-tag">#${tag}</span>`).join('')}
                                        ${todo.due_date ? `<span class="todo-due ${isOverdue(todo.due_date) ? 'overdue' : ''}">📅 ${todo.due_date}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            // Render as a single todo item
            const todo = group.todos[0];
            return `
                <div class="todo-item">
                    <input type="checkbox" 
                           class="todo-checkbox" 
                           ${todo.completed ? 'checked' : ''}
                           onchange="toggleTodo('${todo.file_path}', ${todo.line_number})">
                    <div class="todo-content">
                        <div class="todo-text ${todo.completed ? 'completed' : ''}">
                            ${renderPriority(todo.priority)}
                            ${escapeHtml(todo.text)}
                        </div>
                        <div class="todo-meta">
                            <a href="${FLATNOTES_URL}/note/${encodeURIComponent(todo.file.replace('.md', ''))}#L${todo.line_number}" 
                               target="_blank" 
                               class="todo-file">
                               📄 ${todo.file}:${todo.line_number}
                            </a>
                            ${todo.tags.map(tag => `<span class="todo-tag">#${tag}</span>`).join('')}
                            ${todo.due_date ? `<span class="todo-due ${isOverdue(todo.due_date) ? 'overdue' : ''}">📅 ${todo.due_date}</span>` : ''}
                        </div>
                        ${todo.context ? `<div class="todo-context">${escapeHtml(todo.context)}</div>` : ''}
                    </div>
                </div>
            `;
        }
    }).join('');

    container.innerHTML = groupedHtml;
}

function renderKanbanView(todos) {
    // Group todos into kanban columns
    const kanban = {
        backlog: [],
        todo: [],
        in_progress: [],
        done: []
    };

    todos.forEach(todo => {
        if (todo.completed) {
            kanban.done.push(todo);
        } else if (todo.priority >= 3) {
            kanban.in_progress.push(todo);
        } else if (todo.priority >= 1) {
            kanban.todo.push(todo);
        } else {
            kanban.backlog.push(todo);
        }
    });

    // Render each column
    Object.keys(kanban).forEach(column => {
        const container = document.getElementById(`kanban-${column}`);
        const items = kanban[column];

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-state">No items</div>';
        } else {
            container.innerHTML = items.map(todo => `
                <div class="kanban-card">
                    <div class="kanban-card-text">
                        ${renderPriority(todo.priority)}
                        ${escapeHtml(todo.text)}
                    </div>
                    <div class="kanban-card-meta">
                        <span>📄 ${todo.file}</span>
                        ${todo.tags.length > 0 ? `<span>${todo.tags.map(t => `#${t}`).join(' ')}</span>` : ''}
                        ${todo.due_date ? `<span>📅 ${todo.due_date}</span>` : ''}
                    </div>
                </div>
            `).join('');
        }
    });
}

function renderFilesView(todos) {
    const container = document.getElementById('files-list');
    
    // Group todos by file
    const byFile = {};
    todos.forEach(todo => {
        if (!byFile[todo.file]) {
            byFile[todo.file] = [];
        }
        byFile[todo.file].push(todo);
    });

    if (Object.keys(byFile).length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No todos found</h3></div>';
        return;
    }

    container.innerHTML = Object.entries(byFile).map(([file, fileTodos]) => {
        const completed = fileTodos.filter(t => t.completed).length;
        const total = fileTodos.length;

        return `
            <div class="file-group">
                <div class="file-group-header">
                    <div class="file-group-title">📁 ${file}</div>
                    <div class="file-group-count">${completed}/${total} completed</div>
                </div>
                <div class="todo-list">
                    ${fileTodos.map(todo => `
                        <div class="todo-item">
                            <input type="checkbox" 
                                   class="todo-checkbox" 
                                   ${todo.completed ? 'checked' : ''}
                                   onchange="toggleTodo('${todo.file_path}', ${todo.line_number})">
                            <div class="todo-content">
                                <div class="todo-text ${todo.completed ? 'completed' : ''}">
                                    ${renderPriority(todo.priority)}
                                    ${escapeHtml(todo.text)}
                                </div>
                                <div class="todo-meta">
                                    <span>Line ${todo.line_number}</span>
                                    ${todo.tags.map(tag => `<span class="todo-tag">#${tag}</span>`).join('')}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderCalendarView(todos) {
    const container = document.getElementById('calendar-container');
    
    // Group todos by date
    const byDate = {};
    todos.forEach(todo => {
        if (todo.due_date) {
            if (!byDate[todo.due_date]) {
                byDate[todo.due_date] = [];
            }
            byDate[todo.due_date].push(todo);
        }
    });

    if (Object.keys(byDate).length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No todos with due dates</h3></div>';
        return;
    }

    // Simple calendar display (sorted by date)
    const sortedDates = Object.keys(byDate).sort();
    
    container.innerHTML = `
        <div class="calendar-list">
            ${sortedDates.map(date => {
                const dateTodos = byDate[date];
                const isOverdueBool = isOverdue(date);
                
                return `
                    <div class="calendar-date ${isOverdueBool ? 'overdue' : ''}">
                        <h3>${formatDate(date)} ${isOverdueBool ? '(Overdue)' : ''}</h3>
                        <div class="todo-list">
                            ${dateTodos.map(todo => `
                                <div class="todo-item">
                                    <input type="checkbox" 
                                           class="todo-checkbox" 
                                           ${todo.completed ? 'checked' : ''}
                                           onchange="toggleTodo('${todo.file_path}', ${todo.line_number})">
                                    <div class="todo-content">
                                        <div class="todo-text ${todo.completed ? 'completed' : ''}">
                                            ${renderPriority(todo.priority)}
                                            ${escapeHtml(todo.text)}
                                        </div>
                                        <div class="todo-meta">
                                            <span>📄 ${todo.file}</span>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Helper Functions
function renderPriority(priority) {
    if (priority === 0) return '';
    return `<span class="todo-priority">${'!'.repeat(priority)}</span>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isOverdue(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    return dateStr < today;
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showError(message) {
    console.error(message);
    // Could add a toast notification here
}

function showSuccess(message) {
    console.log(message);
    // Could add a toast notification here
}