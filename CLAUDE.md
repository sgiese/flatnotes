# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Personal Knowledge Management System that combines Flatnotes with custom-built dashboards and AI features. The system uses markdown files as the single source of truth and provides multiple views into that data:

1. **Flatnotes** - Note-taking and editing interface
2. **Todo Dashboard** - Aggregates and manages todos from all markdown files
3. **AI Knowledge Graph** - Visualizes note connections and provides AI-powered insights

## Current Project State

- **Phase 0**: Flatnotes is deployed via Docker and running on port 8080
- **Data Storage**: Markdown files stored in `./data/` directory
- **Migration Status**: Migrating from wikmd to flatnotes-based system
- **Next Phase**: Building Todo Dashboard (Phase 1)

## Architecture

### Core Services
- **Flatnotes**: Docker container (dullage/flatnotes:latest) for note editing
- **Todo Dashboard**: Python/FastAPI backend with web frontend for todo management
- **Knowledge Graph**: Python backend with D3.js/vis.js visualization
- **AI Engine**: ChromaDB for embeddings, Ollama/OpenAI for LLM features

### Data Flow
```
Markdown Files (./data/*.md)
    ├── Flatnotes (read/write via web UI)
    ├── Todo Dashboard (parse todos, write completions)
    └── Knowledge Graph (parse wikilinks, analyze connections)
        └── AI Engine (embeddings, similarity, clustering)
```

## Common Development Commands

### Flatnotes Management
```bash
# Start Flatnotes container
docker-compose up -d

# View logs
docker-compose logs -f flatnotes

# Stop container
docker-compose down

# Access container
docker exec -it flatnotes sh
```

### Todo Dashboard Development (Phase 1)
```bash
# Backend setup
cd todo-dashboard/backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install fastapi uvicorn watchdog python-multipart

# Run backend
uvicorn api:app --reload --port 8001

# Frontend
cd todo-dashboard/frontend
# Serve static files or use live-server
python -m http.server 8002
```

### Knowledge Graph Development (Phase 2)
```bash
# Backend setup
cd knowledge-graph/backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn networkx

# Run backend
uvicorn api:app --reload --port 8003
```

### AI Features Development (Phase 3+)
```bash
# Install Ollama (for local AI)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3

# Or use OpenAI
export OPENAI_API_KEY=your_key

# Install dependencies
pip install chromadb openai ollama
```

## File Structure

```
flatnotes/
├── data/                    # Markdown notes (shared source of truth)
│   ├── *.md                # Individual note files
│   ├── attachments/        # File attachments
│   └── .flatnotes/         # Search index (auto-managed)
├── docker-compose.yml      # Flatnotes container config
├── todo-dashboard/         # Phase 1 implementation
│   ├── backend/
│   │   ├── api.py         # FastAPI endpoints
│   │   ├── parser.py      # Markdown todo parser
│   │   └── requirements.txt
│   └── frontend/
│       ├── index.html
│       ├── app.js
│       └── styles.css
├── knowledge-graph/        # Phase 2 implementation
│   ├── backend/
│   │   ├── api.py
│   │   ├── graph_builder.py
│   │   └── requirements.txt
│   └── frontend/
│       └── graph.html
└── ai-engine/             # Phase 3+ implementation
    ├── embeddings.py
    ├── similarity.py
    └── clustering.py
```

## Key Implementation Details

### Markdown Parsing
- **Todos**: Parse `- [ ]` and `- [x]` patterns
- **Wikilinks**: Parse `[[Note Name]]` patterns
- **Tags**: Extract `#tag` patterns
- **Preserve line numbers** for write-back functionality

### Todo Dashboard Features
- Scan all .md files in data directory
- Extract todos with context and metadata
- Toggle completion status (write back to files)
- Multiple views: Kanban, List, Calendar, By File
- Real-time updates via file watching

### Knowledge Graph Features
- Parse wikilinks to build node relationships
- Calculate node importance (connections, word count, todos)
- Interactive visualization with zoom/pan
- Click actions to open notes in Flatnotes
- Filter by tags and search

### AI Integration
- **Local Option**: Ollama with llama3/mistral
- **Cloud Option**: OpenAI/Anthropic APIs
- **Vector Store**: ChromaDB for embeddings
- Features: similarity search, auto-linking, clustering, summaries

## Development Guidelines

### Working with Markdown Files
- Always preserve original formatting when writing back
- Use file locking to prevent corruption
- Handle concurrent edits gracefully
- Watch for external file changes

### API Design
- RESTful endpoints for CRUD operations
- WebSocket for real-time updates
- CORS enabled for cross-origin requests
- Authentication tokens match Flatnotes config

### Testing Approach
```bash
# Test with sample data
cp -r data data-backup  # Always backup first
python test_parser.py   # Test todo parsing
python test_graph.py    # Test graph building

# Load testing
python generate_test_notes.py --count 100
python load_test.py
```

## Current Tasks (from migration plan)

### Phase 0 (Current)
- ✓ Set up Flatnotes with Docker
- ✓ Point to existing markdown folder
- ✓ Verify basic functionality
- Next: Begin Phase 1 Todo Dashboard

### Phase 1 (Next)
1. Build todo parser backend
2. Create dashboard frontend
3. Implement write-back functionality
4. Add file watching for real-time updates

## Important Notes

- **Data Safety**: Markdown files are the single source of truth - always backup before major changes
- **Incremental Development**: Each phase can work independently
- **Authentication**: Flatnotes uses password auth (credentials in docker-compose.yml)
- **Ports**: Flatnotes (8080), Todo Dashboard (8001), Knowledge Graph (8003)
- **Search Index**: Located in `data/.flatnotes/`, auto-syncs on search

## Troubleshooting

```bash
# Check if services are running
docker ps -a
lsof -i :8080  # Check port usage

# Reset search index
rm -rf data/.flatnotes/
docker-compose restart flatnotes

# Debug file permissions
ls -la data/
docker exec flatnotes ls -la /data
```

## References

- Flatnotes GitHub: https://github.com/dullage/flatnotes
- Flatnotes Wiki: https://github.com/dullage/flatnotes/wiki
- API Docs (when running): http://localhost:8080/docs