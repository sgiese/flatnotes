# Flatnotes Enhanced - Personal Knowledge Management System

A comprehensive personal knowledge management system combining Flatnotes with custom dashboards for todo management and knowledge visualization.

## Features

### 🗒️ Flatnotes - Note Taking
- Database-less markdown note storage
- Wikilink support for internal navigation
- Full-text search across all notes
- Clean, distraction-free interface
- Docker-based deployment

### ✅ Todo Dashboard
- Automatically extracts todos from all markdown files
- Multiple views:
  - **List View**: Traditional todo list with filters
  - **Kanban Board**: Organized by priority
  - **Files View**: Grouped by source file
  - **Calendar View**: Organized by due dates
- Real-time updates when files change
- Toggle completion directly from dashboard
- Support for:
  - Tags (`#tag`)
  - Priorities (`!`, `!!`, `!!!`)
  - Due dates (`YYYY-MM-DD`)

### 🚀 Getting Started

#### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (managed by mise)
- [mise](https://mise.jdx.dev/) for environment management

#### Installation

1. Clone the repository:
```bash
git clone https://github.com/sgiese/flatnotes.git
cd flatnotes
```

2. Set up mise:
```bash
mise trust
mise install
```

3. Install dependencies:
```bash
mise run install
```

#### Running the System

Start everything:
```bash
mise run start
```

Or run services individually:

```bash
# Start Flatnotes
mise run flatnotes

# Start Todo Dashboard
mise run todo

# Or manually with the start script
./todo-dashboard/start.sh
```

Access the services:
- **Flatnotes**: http://localhost:8080
- **Todo Dashboard**: http://localhost:8002
- **API Documentation**: http://localhost:8001/docs

### 📁 Project Structure

```
flatnotes/
├── data/                    # Markdown notes (gitignored)
│   └── .flatnotes/         # Search index
├── todo-dashboard/         # Todo Dashboard application
│   ├── backend/           # Python/FastAPI backend
│   │   ├── api.py        # REST API endpoints
│   │   ├── parser.py     # Markdown todo parser
│   │   └── file_watcher.py # Real-time file monitoring
│   └── frontend/         # Web interface
│       ├── index.html
│       ├── app.js
│       └── styles.css
├── docker-compose.yml     # Flatnotes container config
├── .mise.toml            # Project environment config
└── CLAUDE.md             # AI assistant instructions
```

### 🔧 Configuration

#### Flatnotes Configuration
Edit `docker-compose.yml` to change:
- Authentication credentials
- Port mappings
- Volume mounts

#### Todo Dashboard Configuration
The dashboard automatically scans the `data/` directory for markdown files.

### 📝 Markdown Todo Format

The todo parser recognizes:
```markdown
- [ ] Uncompleted todo
- [x] Completed todo
- [ ] High priority todo !!!
- [ ] Medium priority !!
- [ ] Low priority !
- [ ] Todo with due date 2024-01-20
- [ ] Todo with #tag
```

### 🛠️ Development

#### Testing the Parser
```bash
mise run test-parser
```

#### Stopping Services
```bash
mise run stop
```

### 🗺️ Roadmap

- [x] Phase 0: Flatnotes setup and migration
- [x] Phase 0.1: Convert internal links to wikilinks
- [x] Phase 1: Todo Dashboard
- [ ] Phase 2: Knowledge Graph Visualization
- [ ] Phase 3: AI-powered features (similarity, clustering)
- [ ] Phase 4: Advanced AI (summaries, gap detection)
- [ ] Phase 5: Integration and polish

See `data/flatnote-migration.md` for detailed implementation plan.

### 📄 License

This project is for personal use. Flatnotes is licensed under its own terms.

### 🙏 Credits

- [Flatnotes](https://github.com/dullage/flatnotes) by dullage
- Built with FastAPI, Python, and vanilla JavaScript