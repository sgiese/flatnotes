// House Checklist App

const API_URL = 'http://localhost:8003';
const WS_URL = 'ws://localhost:8003/ws';
let checklistData = null;
let currentSection = 'interior';
let socket = null;
let accordionState = {}; // Store which accordions are open

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    loadChecklistData();
    setupEventListeners();
    setupWebSocket();
});

// Setup WebSocket connection
function setupWebSocket() {
    socket = new WebSocket(WS_URL);
    
    socket.onopen = () => {
        console.log('WebSocket connected - real-time updates enabled');
    };
    
    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'update' || message.type === 'initial') {
            checklistData = message.data;
            saveAccordionState();
            renderChecklist();
            restoreAccordionState();
            updateStatistics();
            document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
        }
    };
    
    socket.onclose = () => {
        console.log('WebSocket disconnected - attempting to reconnect...');
        // Reconnect after 3 seconds
        setTimeout(setupWebSocket, 3000);
    };
    
    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchSection(e.target.dataset.section);
        });
    });
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// Initialize theme from localStorage or system preference
function initializeTheme() {
    const savedTheme = localStorage.getItem('house-checklist-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(theme);
}

// Set the theme
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    // Also set on documentElement for broader compatibility
    document.documentElement.setAttribute('data-theme', theme);
}

// Toggle between light and dark themes
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    console.log('Toggling theme from', currentTheme, 'to', newTheme);
    
    setTheme(newTheme);
    localStorage.setItem('house-checklist-theme', newTheme);
}

// Switch between Interior and Exterior sections
function switchSection(section) {
    currentSection = section;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });
    
    // Update sections
    document.querySelectorAll('.checklist-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
}

// Load checklist data from API
async function loadChecklistData() {
    try {
        const response = await fetch(`${API_URL}/house-checklist`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        checklistData = await response.json();
        
        console.log('Loaded checklist data from API:', checklistData);
        renderChecklist();
        updateStatistics();
        document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
    } catch (error) {
        console.error('Failed to load checklist from API:', error);
        console.log('API may not be running or data format has changed');
        // Don't fall back to sample data - show error instead
        document.getElementById('interior-accordion').innerHTML = '<p>Error loading checklist data. Please check if the API is running.</p>';
        document.getElementById('exterior-accordion').innerHTML = '<p>Error loading checklist data. Please check if the API is running.</p>';
    }
}

// Parse the markdown and create structured data
function loadSampleData() {
    // Parse the House Checklist.md content into structured data
    checklistData = {
        interior: {
            title: "Interior Tasks (Post-Drywall)",
            phases: [
                {
                    title: "Phase 1: Painting",
                    subPhases: [
                        {
                            title: "Upstairs",
                            tasks: [
                                { text: "Great Room - Ceiling (first coat)", completed: false },
                                { text: "Great Room - Ceiling (second coat)", completed: false },
                                { text: "Great Room - Walls (first coat)", completed: false },
                                { text: "Great Room - Walls (second coat)", completed: false },
                                { text: "Main Hall - Ceiling (first coat)", completed: false },
                                { text: "Main Hall - Ceiling (second coat)", completed: false },
                                { text: "Main Hall - Walls (first coat)", completed: false },
                                { text: "Main Hall - Walls (second coat)", completed: false },
                                { text: "Master Bedroom - Ceiling (first coat)", completed: false },
                                { text: "Master Bedroom - Ceiling (second coat)", completed: false },
                                { text: "Master Bedroom - Walls (first coat)", completed: false },
                                { text: "Master Bedroom - Walls (second coat)", completed: false },
                                { text: "Master Bath - Ceiling (first coat)", completed: false },
                                { text: "Master Bath - Ceiling (second coat)", completed: false },
                                { text: "Master Bath - Walls (first coat)", completed: false },
                                { text: "Master Bath - Walls (second coat)", completed: false }
                            ]
                        },
                        {
                            title: "Mid Level",
                            tasks: [
                                { text: "1/2 Bath - Ceiling (first coat)", completed: false },
                                { text: "1/2 Bath - Ceiling (second coat)", completed: false },
                                { text: "1/2 Bath - Walls (first coat)", completed: false },
                                { text: "1/2 Bath - Walls (second coat)", completed: false },
                                { text: "Hall - Ceiling (first coat)", completed: false },
                                { text: "Hall - Ceiling (second coat)", completed: false },
                                { text: "Hall - Walls (first coat)", completed: false },
                                { text: "Hall - Walls (second coat)", completed: false },
                                { text: "Mud Room - Ceiling (first coat)", completed: false },
                                { text: "Mud Room - Ceiling (second coat)", completed: false },
                                { text: "Mud Room - Walls (first coat)", completed: false },
                                { text: "Mud Room - Walls (second coat)", completed: false }
                            ]
                        },
                        {
                            title: "Downstairs",
                            tasks: [
                                { text: "Media - Walls (second coat)", completed: false },
                                { text: "Office - Walls (second coat)", completed: false },
                                { text: "Bath - Walls (second coat)", completed: false },
                                { text: "Hall - Ceiling (first coat)", completed: false },
                                { text: "Hall - Ceiling (second coat)", completed: false },
                                { text: "Hall - Walls (first coat)", completed: false },
                                { text: "Hall - Walls (second coat)", completed: false },
                                { text: "Bonus - Ceiling (first coat)", completed: false },
                                { text: "Bonus - Ceiling (second coat)", completed: false },
                                { text: "Bonus - Walls (first coat)", completed: false },
                                { text: "Bonus - Walls (second coat)", completed: false },
                                { text: "Utility - Ceiling (first coat)", completed: true },
                                { text: "Utility - Ceiling (second coat)", completed: true },
                                { text: "Utility - Walls (first coat)", completed: true },
                                { text: "Utility - Walls (second coat)", completed: true },
                                { text: "Mechanical - Ceiling (first coat)", completed: true },
                                { text: "Mechanical - Ceiling (second coat)", completed: true },
                                { text: "Mechanical - Walls (first coat)", completed: true },
                                { text: "Mechanical - Walls (second coat)", completed: true }
                            ]
                        }
                    ]
                },
                {
                    title: "Phase 2: Trim & Millwork",
                    tasks: [
                        { text: "Install door jambs and hang interior doors", completed: false },
                        { text: "Install door casings and trim", completed: false },
                        { text: "Install window casings and trim", completed: false },
                        { text: "Install baseboards", completed: false },
                        { text: "Install crown molding (if applicable)", completed: false },
                        { text: "Install any wainscoting or chair rails", completed: false },
                        { text: "Caulk all trim joints and nail holes", completed: false },
                        { text: "Prime and paint all trim work", completed: false }
                    ]
                },
                {
                    title: "Phase 3: Cabinetry & Built-ins",
                    tasks: [
                        { text: "Install kitchen cabinets (uppers first, then lowers)", completed: false },
                        { text: "Install bathroom vanities", completed: false },
                        { text: "Install any built-in shelving or closet systems", completed: false },
                        { text: "Install laundry room cabinets", completed: false }
                    ]
                },
                {
                    title: "Phase 4: Flooring",
                    tasks: [
                        { text: "Install underlayment (if needed)", completed: false },
                        { text: "Install tile flooring (bathrooms, laundry, entryways)", completed: false },
                        { text: "Install hardwood or engineered flooring", completed: false },
                        { text: "Install carpet and padding", completed: false },
                        { text: "Install transition strips between flooring types", completed: false },
                        { text: "Install shoe molding or quarter round", completed: false },
                        { text: "Touch up wall paint as needed from trim/flooring installation", completed: false }
                    ]
                },
                {
                    title: "Phase 5: Countertops & Backsplashes",
                    tasks: [
                        { text: "Template countertops", completed: false },
                        { text: "Install kitchen countertops", completed: false },
                        { text: "Install bathroom countertops", completed: false },
                        { text: "Install kitchen backsplash", completed: false },
                        { text: "Install bathroom backsplash (if applicable)", completed: false }
                    ]
                },
                {
                    title: "Phase 6: Fixtures & Hardware",
                    tasks: [
                        { text: "Install light fixtures", completed: false },
                        { text: "Install bathroom mirrors", completed: false },
                        { text: "Install towel bars, toilet paper holders, robe hooks", completed: false },
                        { text: "Install cabinet hardware (knobs and pulls)", completed: false },
                        { text: "Install door hardware (handles, locks, stops)", completed: false },
                        { text: "Install closet rods and shelving", completed: false },
                        { text: "Install shower doors or curtain rods", completed: false }
                    ]
                },
                {
                    title: "Phase 7: Appliances & Final Details",
                    tasks: [
                        { text: "Install kitchen appliances", completed: false },
                        { text: "Install laundry appliances", completed: false },
                        { text: "Install thermostats", completed: false },
                        { text: "Install smoke detectors and CO detectors", completed: false },
                        { text: "Install switch plates and outlet covers", completed: false },
                        { text: "Install window treatments or hardware", completed: false },
                        { text: "Install handrails on stairs", completed: false },
                        { text: "Final touch-up paint throughout", completed: false },
                        { text: "Final cleaning", completed: false }
                    ]
                }
            ]
        },
        exterior: {
            title: "Exterior Tasks",
            phases: [
                {
                    title: "Phase 1: Deck & Porch Framing",
                    tasks: [
                        { text: "Install deck ledger board (if attached to house)", completed: false },
                        { text: "Set deck posts and footings", completed: false },
                        { text: "Install deck beams and joists", completed: false },
                        { text: "Set porch posts and footings", completed: false },
                        { text: "Install porch beams and roof framing", completed: false },
                        { text: "Install porch roofing", completed: false }
                    ]
                },
                {
                    title: "Phase 2: Deck & Porch Decking",
                    tasks: [
                        { text: "Install deck decking boards", completed: false },
                        { text: "Install deck railings and balusters", completed: false },
                        { text: "Install deck stairs", completed: false },
                        { text: "Install porch ceiling (if applicable)", completed: false },
                        { text: "Install porch decking", completed: false },
                        { text: "Install porch railings and balusters", completed: false },
                        { text: "Install porch stairs", completed: false }
                    ]
                },
                {
                    title: "Phase 3: Siding Installation",
                    tasks: [
                        { text: "Install exterior trim boards and corner boards", completed: false },
                        { text: "Install siding (starting from bottom up)", completed: false },
                        { text: "Install J-channel around windows and doors", completed: false },
                        { text: "Caulk all siding joints and penetrations", completed: false },
                        { text: "Paint or stain siding (if required)", completed: false }
                    ]
                },
                {
                    title: "Phase 4: Exterior Doors & Windows",
                    tasks: [
                        { text: "Install exterior door hardware and locksets", completed: false },
                        { text: "Install storm doors (if applicable)", completed: false },
                        { text: "Caulk around all window and door exteriors", completed: false },
                        { text: "Install exterior window trim (if not already done)", completed: false }
                    ]
                },
                {
                    title: "Phase 5: Walkways & Hardscaping",
                    tasks: [
                        { text: "Excavate and grade walkway areas", completed: false },
                        { text: "Install gravel base for walkways", completed: false },
                        { text: "Install sand or screenings layer", completed: false },
                        { text: "Install pavers, concrete, or stone walkways", completed: false },
                        { text: "Install edging to secure walkways", completed: false },
                        { text: "Fill joints with sand or polymeric sand", completed: false },
                        { text: "Compact and seal walkways (if applicable)", completed: false }
                    ]
                },
                {
                    title: "Phase 6: Finishing Touches",
                    tasks: [
                        { text: "Apply deck stain or sealant", completed: false },
                        { text: "Paint or stain porch elements", completed: false },
                        { text: "Install exterior light fixtures", completed: false },
                        { text: "Install house numbers", completed: false },
                        { text: "Install mailbox", completed: false },
                        { text: "Install gutters and downspouts (if not complete)", completed: false },
                        { text: "Grade soil away from foundation", completed: false },
                        { text: "Install landscaping fabric and mulch beds", completed: false },
                        { text: "Seed or sod lawn areas", completed: false },
                        { text: "Final exterior cleanup", completed: false }
                    ]
                }
            ]
        }
    };
    
    renderChecklist();
    updateStatistics();
    document.getElementById('last-updated').textContent = new Date().toLocaleTimeString();
}

// Save the current accordion state
function saveAccordionState() {
    accordionState = {};
    document.querySelectorAll('.accordion-header.active, .sub-accordion-header.active, .room-accordion-header.active').forEach(header => {
        const id = header.getAttribute('data-accordion-id');
        if (id) {
            accordionState[id] = true;
        }
    });
}

// Restore accordion state after render
function restoreAccordionState() {
    Object.keys(accordionState).forEach(id => {
        const header = document.querySelector(`[data-accordion-id="${id}"]`);
        if (header) {
            const content = header.nextElementSibling;
            if (content && accordionState[id]) {
                header.classList.add('active');
                content.classList.add('active');
            }
        }
    });
}

// Render the checklist accordion
function renderChecklist() {
    renderSection('interior');
    renderSection('exterior');
}

function renderSection(section) {
    const container = document.getElementById(`${section}-accordion`);
    const data = checklistData[section];
    
    container.innerHTML = '';
    
    data.phases.forEach((phase, phaseIndex) => {
        const phaseId = `${section}-phase-${phaseIndex}`;
        const phaseProgress = calculatePhaseProgress(phase);
        
        const phaseItem = document.createElement('div');
        phaseItem.className = 'accordion-item';
        
        // Create phase header
        const phaseHeader = document.createElement('div');
        phaseHeader.className = 'accordion-header';
        phaseHeader.setAttribute('data-accordion-id', phaseId);
        phaseHeader.innerHTML = `
            <div class="accordion-title">
                <span class="accordion-icon">▶</span>
                <span>${phase.title}</span>
            </div>
            <span class="phase-progress">${phaseProgress.completed}/${phaseProgress.total} (${phaseProgress.percentage}%)</span>
        `;
        
        // Create phase content
        const phaseContent = document.createElement('div');
        phaseContent.className = 'accordion-content';
        
        const phaseBody = document.createElement('div');
        phaseBody.className = 'accordion-body';
        
        // Handle phases with subPhases (like Painting)
        if (phase.subPhases) {
            const subAccordion = document.createElement('div');
            subAccordion.className = 'sub-accordion';
            
            phase.subPhases.forEach((subPhase, subIndex) => {
                const subId = `${phaseId}-sub-${subIndex}`;
                const subProgress = calculateSubPhaseProgress(subPhase);
                
                const subItem = document.createElement('div');
                subItem.className = 'sub-accordion-item';
                
                const subHeader = document.createElement('div');
                subHeader.className = 'sub-accordion-header';
                subHeader.setAttribute('data-accordion-id', subId);
                subHeader.innerHTML = `
                    <div class="accordion-title">
                        <span class="accordion-icon">▶</span>
                        <span>${subPhase.title}</span>
                    </div>
                    <span class="phase-progress">${subProgress.completed}/${subProgress.total}</span>
                `;
                
                const subContent = document.createElement('div');
                subContent.className = 'accordion-content';
                
                // Check if subPhase has rooms (for painting phase)
                if (subPhase.rooms) {
                    // Create nested accordion for rooms
                    const roomAccordion = document.createElement('div');
                    roomAccordion.className = 'room-accordion';
                    
                    subPhase.rooms.forEach((room, roomIndex) => {
                        const roomId = `${subId}-room-${roomIndex}`;
                        const roomItem = document.createElement('div');
                        roomItem.className = 'room-accordion-item';
                        
                        const roomHeader = document.createElement('div');
                        roomHeader.className = 'room-accordion-header';
                        roomHeader.setAttribute('data-accordion-id', roomId);
                        const roomProgress = calculateRoomProgress(room);
                        roomHeader.innerHTML = `
                            <div class="accordion-title">
                                <span class="accordion-icon">▶</span>
                                <span>${room.title}</span>
                            </div>
                            <span class="phase-progress">${roomProgress.completed}/${roomProgress.total}</span>
                        `;
                        
                        const roomContent = document.createElement('div');
                        roomContent.className = 'accordion-content';
                        
                        const checklistItems = document.createElement('div');
                        checklistItems.className = 'checklist-items';
                        
                        room.tasks.forEach((task, taskIndex) => {
                            const taskId = `${roomId}-task-${taskIndex}`;
                            const taskItem = createTaskElementForRoom(task, taskId, section, phaseIndex, subIndex, roomIndex, taskIndex);
                            checklistItems.appendChild(taskItem);
                        });
                        
                        roomContent.appendChild(checklistItems);
                        roomItem.appendChild(roomHeader);
                        roomItem.appendChild(roomContent);
                        roomAccordion.appendChild(roomItem);
                        
                        // Add click handler for room accordion
                        roomHeader.addEventListener('click', () => {
                            roomHeader.classList.toggle('active');
                            roomContent.classList.toggle('active');
                        });
                    });
                    
                    subContent.appendChild(roomAccordion);
                } else if (subPhase.tasks) {
                    // Original behavior for non-painting phases
                    const checklistItems = document.createElement('div');
                    checklistItems.className = 'checklist-items';
                    
                    subPhase.tasks.forEach((task, taskIndex) => {
                        const taskId = `${subId}-task-${taskIndex}`;
                        const taskItem = createTaskElement(task, taskId, section, phaseIndex, subIndex, taskIndex);
                        checklistItems.appendChild(taskItem);
                    });
                    
                    subContent.appendChild(checklistItems);
                }
                
                subItem.appendChild(subHeader);
                subItem.appendChild(subContent);
                subAccordion.appendChild(subItem);
                
                // Add click handler for sub-accordion
                subHeader.addEventListener('click', () => {
                    subHeader.classList.toggle('active');
                    subContent.classList.toggle('active');
                });
            });
            
            phaseBody.appendChild(subAccordion);
        } else if (phase.tasks) {
            // Handle phases with direct tasks
            const checklistItems = document.createElement('div');
            checklistItems.className = 'checklist-items';
            
            phase.tasks.forEach((task, taskIndex) => {
                const taskId = `${phaseId}-task-${taskIndex}`;
                const taskItem = createTaskElement(task, taskId, section, phaseIndex, null, taskIndex);
                checklistItems.appendChild(taskItem);
            });
            
            phaseBody.appendChild(checklistItems);
        }
        
        phaseContent.appendChild(phaseBody);
        phaseItem.appendChild(phaseHeader);
        phaseItem.appendChild(phaseContent);
        container.appendChild(phaseItem);
        
        // Add click handler for main accordion
        phaseHeader.addEventListener('click', () => {
            phaseHeader.classList.toggle('active');
            phaseContent.classList.toggle('active');
        });
    });
}

// Create a task element
function createTaskElement(task, id, section, phaseIndex, subPhaseIndex, taskIndex) {
    const item = document.createElement('div');
    item.className = `checklist-item ${task.completed ? 'completed' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', (e) => {
        toggleTask(section, phaseIndex, subPhaseIndex, taskIndex, e.target.checked);
    });
    
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = task.text;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    
    return item;
}

// Create task element for rooms (painting phase)
function createTaskElementForRoom(task, id, section, phaseIndex, subPhaseIndex, roomIndex, taskIndex) {
    const item = document.createElement('div');
    item.className = `checklist-item ${task.completed ? 'completed' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', (e) => {
        toggleRoomTask(section, phaseIndex, subPhaseIndex, roomIndex, taskIndex, e.target.checked);
    });
    
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = task.text;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    
    return item;
}

// Toggle task completion
async function toggleTask(section, phaseIndex, subPhaseIndex, taskIndex, completed) {
    // Update local data
    if (subPhaseIndex !== null) {
        checklistData[section].phases[phaseIndex].subPhases[subPhaseIndex].tasks[taskIndex].completed = completed;
    } else {
        checklistData[section].phases[phaseIndex].tasks[taskIndex].completed = completed;
    }
    
    // Update statistics
    updateStatistics();
    
    // Save to backend (when API is ready)
    try {
        await fetch(`${API_URL}/house-checklist/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section, phaseIndex, subPhaseIndex, taskIndex, completed })
        });
    } catch (error) {
        console.log('Could not save to backend:', error);
    }
}

// Toggle room task completion (for painting phase)
async function toggleRoomTask(section, phaseIndex, subPhaseIndex, roomIndex, taskIndex, completed) {
    // Update local data
    checklistData[section].phases[phaseIndex].subPhases[subPhaseIndex].rooms[roomIndex].tasks[taskIndex].completed = completed;
    
    // Update statistics
    updateStatistics();
    
    // Save to backend (when API is ready)
    try {
        await fetch(`${API_URL}/house-checklist/toggle-room`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ section, phaseIndex, subPhaseIndex, roomIndex, taskIndex, completed })
        });
    } catch (error) {
        console.log('Could not save room task to backend:', error);
    }
}

// Calculate phase progress
function calculatePhaseProgress(phase) {
    let total = 0;
    let completed = 0;
    
    if (phase.subPhases) {
        phase.subPhases.forEach(subPhase => {
            // Check if subPhase has rooms (for painting phase)
            if (subPhase.rooms) {
                subPhase.rooms.forEach(room => {
                    room.tasks.forEach(task => {
                        total++;
                        if (task.completed) completed++;
                    });
                });
            } else if (subPhase.tasks) {
                subPhase.tasks.forEach(task => {
                    total++;
                    if (task.completed) completed++;
                });
            }
        });
    } else if (phase.tasks) {
        phase.tasks.forEach(task => {
            total++;
            if (task.completed) completed++;
        });
    }
    
    return {
        total,
        completed,
        percentage: total > 0 ? parseFloat(((completed / total) * 100).toFixed(1)) : 0
    };
}

// Calculate sub-phase progress
function calculateSubPhaseProgress(subPhase) {
    let total = 0;
    let completed = 0;
    
    // Check if subPhase has rooms (for painting phase)
    if (subPhase.rooms) {
        subPhase.rooms.forEach(room => {
            room.tasks.forEach(task => {
                total++;
                if (task.completed) completed++;
            });
        });
    } else if (subPhase.tasks) {
        subPhase.tasks.forEach(task => {
            total++;
            if (task.completed) completed++;
        });
    }
    
    return { total, completed };
}

// Calculate room progress
function calculateRoomProgress(room) {
    let total = 0;
    let completed = 0;
    
    room.tasks.forEach(task => {
        total++;
        if (task.completed) completed++;
    });
    
    return { total, completed };
}

// Update all statistics
function updateStatistics() {
    // Calculate totals
    let totalTasks = 0;
    let completedTasks = 0;
    let interiorTotal = 0;
    let interiorCompleted = 0;
    let exteriorTotal = 0;
    let exteriorCompleted = 0;
    
    // Interior stats
    checklistData.interior.phases.forEach(phase => {
        if (phase.subPhases) {
            phase.subPhases.forEach(subPhase => {
                // Check if subPhase has rooms (for painting phase)
                if (subPhase.rooms) {
                    subPhase.rooms.forEach(room => {
                        room.tasks.forEach(task => {
                            totalTasks++;
                            interiorTotal++;
                            if (task.completed) {
                                completedTasks++;
                                interiorCompleted++;
                            }
                        });
                    });
                } else if (subPhase.tasks) {
                    subPhase.tasks.forEach(task => {
                        totalTasks++;
                        interiorTotal++;
                        if (task.completed) {
                            completedTasks++;
                            interiorCompleted++;
                        }
                    });
                }
            });
        } else if (phase.tasks) {
            phase.tasks.forEach(task => {
                totalTasks++;
                interiorTotal++;
                if (task.completed) {
                    completedTasks++;
                    interiorCompleted++;
                }
            });
        }
    });
    
    // Exterior stats
    checklistData.exterior.phases.forEach(phase => {
        phase.tasks.forEach(task => {
            totalTasks++;
            exteriorTotal++;
            if (task.completed) {
                completedTasks++;
                exteriorCompleted++;
            }
        });
    });
    
    // Update overall progress
    const overallPercentage = ((completedTasks / totalTasks) * 100).toFixed(1);
    document.getElementById('overall-percentage').textContent = `${overallPercentage}%`;
    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('remaining-tasks').textContent = totalTasks - completedTasks;
    
    // Update progress circle (compact radius of 45)
    const circle = document.getElementById('overall-circle');
    const compactCircumference = 2 * Math.PI * 45;
    const offset = compactCircumference - (parseFloat(overallPercentage) / 100) * compactCircumference;
    circle.style.strokeDashoffset = offset;
    
    // Update interior progress
    const interiorPercentage = ((interiorCompleted / interiorTotal) * 100).toFixed(1);
    document.getElementById('interior-percentage').textContent = `${interiorPercentage}%`;
    document.getElementById('interior-total').textContent = interiorTotal;
    document.getElementById('interior-completed').textContent = interiorCompleted;
    document.getElementById('interior-remaining').textContent = interiorTotal - interiorCompleted;
    
    // Update interior circle
    const interiorCircle = document.getElementById('interior-circle');
    const interiorOffset = compactCircumference - (parseFloat(interiorPercentage) / 100) * compactCircumference;
    interiorCircle.style.strokeDashoffset = interiorOffset;
    
    // Update exterior progress
    const exteriorPercentage = ((exteriorCompleted / exteriorTotal) * 100).toFixed(1);
    document.getElementById('exterior-percentage').textContent = `${exteriorPercentage}%`;
    document.getElementById('exterior-total').textContent = exteriorTotal;
    document.getElementById('exterior-completed').textContent = exteriorCompleted;
    document.getElementById('exterior-remaining').textContent = exteriorTotal - exteriorCompleted;
    
    // Update exterior circle
    const exteriorCircle = document.getElementById('exterior-circle');
    const exteriorOffset = compactCircumference - (parseFloat(exteriorPercentage) / 100) * compactCircumference;
    exteriorCircle.style.strokeDashoffset = exteriorOffset;
    
    // Update phase breakdown
    updatePhaseBreakdown();
}

// Update phase breakdown chart
function updatePhaseBreakdown() {
    const container = document.getElementById('phase-chart');
    container.innerHTML = '';
    
    // Get phases from current section
    const phases = currentSection === 'interior' 
        ? checklistData.interior.phases 
        : checklistData.exterior.phases;
    
    phases.forEach(phase => {
        const progress = calculatePhaseProgress(phase);
        const percentage = progress.percentage;
        
        const phaseItem = document.createElement('div');
        phaseItem.className = 'phase-item';
        phaseItem.innerHTML = `
            <span class="phase-name">${phase.title}</span>
            <div class="phase-stats">
                <div class="phase-bar">
                    <div class="phase-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="phase-percentage">${percentage}%</span>
            </div>
        `;
        container.appendChild(phaseItem);
    });
}