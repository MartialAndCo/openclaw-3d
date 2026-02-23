export function renderActivityKanban(container, closeCallback, minimizeCallback) {
    // Inject styles if they don't exist yet
    if (!document.getElementById('kanban-styles')) {
        const style = document.createElement('style');
        style.id = 'kanban-styles';
        style.textContent = `
            .kanban-wrapper {
                width: 100%;
                height: 100%;
                background-color: #f4f5f8;
                font-family: 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
                color: #1e293b;
            }
            .kanban-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background-color: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                height: 72px;
            }
            .mac-controls {
                display: flex;
                gap: 8px;
                margin-right: 24px;
            }
            .mac-btn {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                cursor: pointer;
                border: 1px solid rgba(0,0,0,0.1);
            }
            .mac-close { background-color: #ff5f57; }
            .mac-min { background-color: #febc2e; }
            .mac-max { background-color: #28c840; }
            .mac-btn.disabled { background-color: #e2e8f0; border-color: rgba(0,0,0,0.05); cursor: default; }
            
            .header-left {
                display: flex;
                align-items: center;
            }
            
            .header-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .view-toggles {
                display: flex;
                background: #f1f5f9;
                border-radius: 6px;
                padding: 4px;
                margin-right: 16px;
            }
            .view-btn {
                padding: 6px 16px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                color: #64748b;
                border: none;
                background: transparent;
            }
            .view-btn.active {
                background: #0f172a;
                color: #ffffff;
            }
            
            .icon-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #64748b;
                font-size: 16px;
            }
            .icon-btn.primary {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }
            
            .kanban-board {
                display: flex;
                flex: 1;
                padding: 24px;
                gap: 20px;
                overflow-x: auto;
                align-items: flex-start;
            }
            
            .kanban-col {
                min-width: 320px;
                width: 320px;
                display: flex;
                flex-direction: column;
                background: #f8fafc;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                max-height: 100%;
            }
            
            .col-header {
                padding: 16px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-weight: 600;
                font-size: 15px;
                color: #0f172a;
            }
            .col-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .col-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            .col-badge {
                background: white;
                color: #64748b;
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                font-weight: 500;
            }
            
            .col-filters {
                padding: 0 16px 12px;
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            .sub-filter {
                font-size: 11px;
                padding: 4px 10px;
                border-radius: 16px;
                background: white;
                border: 1px solid #e2e8f0;
                color: #64748b;
                cursor: pointer;
            }
            .sub-filter.active {
                background: #0f172a;
                color: white;
                border-color: #0f172a;
            }
            
            .col-cards {
                padding: 0 16px 16px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .kanban-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                cursor: grab;
                transition: box-shadow 0.2s, transform 0.2s;
            }
            .kanban-card:hover {
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                transform: translateY(-1px);
            }
            .kanban-card:active {
                cursor: grabbing;
            }
            .kanban-card.dragging {
                opacity: 0.6;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                transform: scale(1.02);
                z-index: 100;
            }
            .col-cards.drag-over {
                background: rgba(0,0,0,0.03);
                border-radius: 8px;
            }
            .card-highlight-yellow { border-left: 3px solid #f59e0b; }
            .card-highlight-blue { border-left: 3px solid #3b82f6; }
            
            .card-title {
                font-size: 14px;
                font-weight: 500;
                line-height: 1.4;
                margin-bottom: 12px;
                color: #1e293b;
            }
            
            .card-tags {
                display: flex;
                gap: 6px;
                margin-bottom: 12px;
                flex-wrap: wrap;
            }
            .tag {
                font-size: 11px;
                padding: 2px 8px;
                border-radius: 4px;
                background: #f1f5f9;
                color: #475569;
                display: flex;
                align-items: center;
                gap: 4px;
                font-weight: 500;
            }
            .tag-green .tag-dot { background: #10b981; }
            .tag-red .tag-dot { background: #ef4444; }
            .tag-blue .tag-dot { background: #3b82f6; }
            .tag-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #94a3b8;
            }
            
            .priority-badge {
                font-size: 10px;
                font-weight: 700;
                padding: 2px 6px;
                border-radius: 4px;
                background: #fee2e2;
                color: #ef4444;
                float: right;
            }
            .priority-badge.medium {
                background: #fef3c7;
                color: #d97706;
            }
            
            .card-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #f1f5f9;
            }
            
            .assignee {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                color: #64748b;
            }
            .avatar {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #cbd5e1;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
            }
            
            /* Custom Scrollbar for columns */
            .col-cards::-webkit-scrollbar {
                width: 6px;
            }
            .col-cards::-webkit-scrollbar-track {
                background: transparent;
            }
            .col-cards::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }
            .kanban-board::-webkit-scrollbar {
                height: 8px;
            }
            .kanban-board::-webkit-scrollbar-track {
                background: transparent;
            }
            .kanban-board::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
    }

    // Mock Data based on the screenshot
    const mockData = {
        inbox: [
            { id: 1, title: 'PR hygiene automation: auto checklist/comment on PR...', priority: 'MEDIUM', tags: [{ name: 'CI', color: 'blue' }], assignee: 'Backend Engineer' },
            { id: 2, title: 'Security: protect system against prompt injection...', priority: 'MEDIUM', tags: [], assignee: 'Backend Engineer' },
            { id: 3, title: 'Landing page design review + improvement...', priority: 'MEDIUM', tags: [{ name: 'Docs+Frontend QA', color: 'gray' }], assignee: 'Docs+Frontend QA' },
            { id: 4, title: 'Skills branch feature: tests + edge cases + docs + PR', priority: 'MEDIUM', tags: [], assignee: 'Backend Engineer' },
            { id: 5, title: 'Validate top security findings with safe tests + regression...', priority: 'MEDIUM', tags: [{ name: 'Security', color: 'red' }], assignee: 'Backend Engineer' }
        ],
        inProgress: [
            { id: 6, title: 'Implement standardized pagination + reusable list...', priority: 'HIGH', tags: [], assignee: 'Backend Engineer' },
            { id: 7, title: 'GitHub PR #130: feat: route webhook leads via RQ batch...', priority: 'HIGH', tags: [], assignee: 'Backend Engineer' },
            { id: 8, title: 'Docs overhaul (Phase 2): Implement rancher-docs-...', priority: 'HIGH', tags: [{ name: 'CI', color: 'blue' }, { name: 'Documentation', color: 'green' }], assignee: 'Docs+Frontend QA' },
            { id: 9, title: 'Security gap assessment: app-layer findings + prioritized...', priority: 'HIGH', tags: [{ name: 'Security', color: 'red' }], assignee: 'Backend Engineer' }
        ],
        review: [
            { id: 10, title: 'Fix: blocked task transitions should return 409/422 (no...', priority: 'HIGH', highlight: 'yellow', extraStatus: 'APPROVAL NEEDED - 1', assignee: 'Backend Engineer' },
            { id: 11, title: 'Agent endpoint: read webhook payload (for backfill + dedupe)', priority: 'HIGH', highlight: 'blue', extraStatus: 'WAITING FOR LEAD REVIEW', assignee: 'Backend Engineer' },
            { id: 12, title: 'Policy: enforce 1 DB migration per PR + audit open PRs', priority: 'HIGH', highlight: 'blue', extraStatus: 'WAITING FOR LEAD REVIEW', assignee: 'Backend Engineer' },
            { id: 13, title: 'Dependabot PR triage: PR #122 (frontend npm/yarn) —...', priority: 'HIGH', highlight: 'blue', extraStatus: 'WAITING FOR LEAD REVIEW', assignee: 'Backend Engineer' }
        ],
        done: [
            { id: 14, title: 'GitHub PR #129: Fix agent task patch auth and add...', priority: 'HIGH', tags: [], assignee: 'Unassigned' },
            { id: 15, title: 'Auth/Permissions: assigned agents can\'t PATCH tasks (403)', priority: 'HIGH', tags: [{ name: 'Reliability', color: 'green' }, { name: 'Audit', color: 'gray' }], assignee: 'Unassigned' },
            { id: 16, title: 'GitHub PR #128: feat(skills): marketplace + packs...', priority: 'MEDIUM', tags: [], assignee: 'Unassigned' },
            { id: 17, title: 'CI: installer job failing (healthz not reachable on...', priority: 'HIGH', tags: [], assignee: 'Unassigned' },
            { id: 18, title: 'Investigate: task assignment/status reverting...', priority: 'HIGH', tags: [], assignee: 'Unassigned' }
        ]
    };

    const renderCard = (card) => {
        let tagsHtml = card.tags && card.tags.length > 0 ?
            `<div class="card-tags">
                ${card.tags.map(t => `<span class="tag tag-${t.color}"><span class="tag-dot"></span>${t.name}</span>`).join('')}
             </div>` : '';

        let highlightClass = card.highlight ? `card-highlight-${card.highlight}` : '';
        let extraStatus = card.extraStatus ? `<div style="font-size: 10px; font-weight: 700; color: ${card.highlight === 'yellow' ? '#d97706' : '#3b82f6'}; margin-top: 8px; margin-bottom: -4px;">● ${card.extraStatus}</div>` : '';

        return `
            <div class="kanban-card ${highlightClass}" draggable="true" data-id="${card.id}">
                <span class="priority-badge ${card.priority.toLowerCase()}">${card.priority}</span>
                <div class="card-title">${card.title}</div>
                ${tagsHtml}
                ${extraStatus}
                <div class="card-footer">
                    <div class="assignee">
                        <div class="avatar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                        ${card.assignee}
                    </div>
                </div>
            </div>
        `;
    };

    const html = `
        <div class="kanban-wrapper">
            <!-- HEADER -->
            <div class="kanban-header">
                <div class="header-left">
                    <div class="mac-controls">
                        <div class="mac-btn mac-close" id="k-btn-close"></div>
                        <div class="mac-btn mac-min" id="k-btn-min"></div>
                        <div class="mac-btn mac-max disabled"></div>
                    </div>
                    <div style="font-weight: 600; font-size: 16px;">Activity</div>
                </div>
                
                <div class="header-right">
                    <div class="view-toggles">
                        <button class="view-btn active">Board</button>
                        <button class="view-btn">List</button>
                    </div>
                    <button class="icon-btn primary">+</button>
                    <button class="icon-btn">✓</button>
                    <button class="icon-btn">00</button>
                    <button class="icon-btn">💬</button>
                    <button class="icon-btn">~</button>
                    <button class="icon-btn">⚙</button>
                </div>
            </div>
            
            <!-- BOARD -->
            <div class="kanban-board">
                <!-- INBOX -->
                <div class="kanban-col">
                    <div class="col-header">
                        <div class="col-title">
                            <span class="col-dot" style="background:#94a3b8"></span>
                            Inbox
                        </div>
                        <div class="col-badge">5</div>
                    </div>
                    <div class="col-cards" data-column="inbox">
                        ${mockData.inbox.map(renderCard).join('')}
                    </div>
                </div>
                
                <!-- IN PROGRESS -->
                <div class="kanban-col">
                    <div class="col-header">
                        <div class="col-title">
                            <span class="col-dot" style="background:#a855f7"></span>
                            In Progress
                        </div>
                        <div class="col-badge">4</div>
                    </div>
                    <div class="col-cards" data-column="inProgress">
                        ${mockData.inProgress.map(renderCard).join('')}
                    </div>
                </div>
                
                <!-- REVIEW -->
                <div class="kanban-col">
                    <div class="col-header">
                        <div class="col-title">
                            <span class="col-dot" style="background:#3b82f6"></span>
                            Review
                        </div>
                        <div class="col-badge">5</div>
                    </div>
                    <div class="col-filters">
                        <span class="sub-filter active">All - 5</span>
                        <span class="sub-filter">Approval needed - 1</span>
                        <span class="sub-filter">Lead review - 4</span>
                        <span class="sub-filter">Blocked - 0</span>
                    </div>
                    <div class="col-cards" data-column="review">
                        ${mockData.review.map(renderCard).join('')}
                    </div>
                </div>
                
                <!-- DONE -->
                <div class="kanban-col">
                    <div class="col-header">
                        <div class="col-title">
                            <span class="col-dot" style="background:#10b981"></span>
                            Done
                        </div>
                        <div class="col-badge" style="color: #10b981; border-color: #d1fae5; background: #f0fdf4;">41</div>
                    </div>
                    <div class="col-cards" data-column="done">
                        ${mockData.done.map(renderCard).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // === BIND INTERACTIONS ===

    // 1. MacOS Window Controls
    container.querySelector('#k-btn-close').addEventListener('click', closeCallback);
    if (minimizeCallback) container.querySelector('#k-btn-min').addEventListener('click', minimizeCallback);

    // 2. View Toggles (Board / List)
    const viewBtns = container.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            viewBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // 3. Icon Buttons (Animations)
    const iconBtns = container.querySelectorAll('.icon-btn');
    iconBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.style.transform = 'scale(0.9)';
            setTimeout(() => e.target.style.transform = 'none', 100);
        });
    });

    // 4. Sub-filters toggling
    const subFilters = container.querySelectorAll('.sub-filter');
    subFilters.forEach(f => {
        f.addEventListener('click', (e) => {
            subFilters.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // 5. Drag and Drop Functionality
    const draggables = container.querySelectorAll('.kanban-card');
    const droppables = container.querySelectorAll('.col-cards');

    let draggedCard = null;

    draggables.forEach(card => {
        card.addEventListener('dragstart', () => {
            draggedCard = card;
            setTimeout(() => card.classList.add('dragging'), 0);
        });

        card.addEventListener('dragend', () => {
            draggedCard = null;
            card.classList.remove('dragging');
            updateCounters(); // Update counters when drop completes
        });
    });

    droppables.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            col.classList.add('drag-over');

            // Logic to track mouse position to place dragged element precisely
            const afterElement = getDragAfterElement(col, e.clientY);
            if (draggedCard) {
                if (afterElement == null) {
                    col.appendChild(draggedCard);
                } else {
                    col.insertBefore(draggedCard, afterElement);
                }
            }
        });

        col.addEventListener('dragleave', () => {
            col.classList.remove('drag-over');
        });

        col.addEventListener('drop', () => {
            col.classList.remove('drag-over');
        });
    });

    // Helper math function to calculate exactly where a card should drop within a list
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // Offset calculates distance between center of card to cursor Y
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Helper to dynamically update the column counter badges
    function updateCounters() {
        const cols = container.querySelectorAll('.kanban-col');
        cols.forEach(col => {
            const count = col.querySelectorAll('.kanban-card').length;
            const badge = col.querySelector('.col-badge');
            if (badge) badge.textContent = count;
        });
    }
}
