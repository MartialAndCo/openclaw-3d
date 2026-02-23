/**
 * Panneau latéral pour afficher les infos d'un agent
 * Drawer qui slide depuis la droite
 * Connecté aux données temps réel d'OpenClaw
 */

import { resetCameraToGlobalView } from '../interactions/cameraAnimator.js';
import { dataAdapter } from '../api/dataAdapter.js';
import { gateway } from '../api/gateway.js';

let panelElement = null;
let isOpen = false;
let currentAgent = null;

/**
 * Initialise le panneau agent (crée les éléments DOM)
 */
export function initAgentPanel() {
    if (panelElement) return;

    // Créer le conteneur principal
    panelElement = document.createElement('div');
    panelElement.id = 'agent-panel';
    panelElement.className = 'agent-panel';
    panelElement.innerHTML = `
        <div class="agent-panel-overlay"></div>
        <div class="agent-panel-content">
            <button class="agent-panel-close" title="Fermer">×</button>
            
            <div class="agent-panel-header">
                <div class="agent-avatar">
                    <span class="avatar-icon">👤</span>
                </div>
                <div class="agent-info">
                    <h2 class="agent-name">Agent Name</h2>
                    <span class="agent-role">Role</span>
                    <span class="agent-dept">Department</span>
                </div>
            </div>
            
            <div class="agent-panel-body">
                <div class="agent-sections">
                    <div class="section-tab active" data-section="chat">
                        <span class="tab-icon">💬</span>
                        <span class="tab-label">Chat</span>
                    </div>
                    <div class="section-tab" data-section="config">
                        <span class="tab-icon">⚙️</span>
                        <span class="tab-label">Config</span>
                    </div>
                    <div class="section-tab" data-section="tasks">
                        <span class="tab-icon">✓</span>
                        <span class="tab-label">Tâches</span>
                    </div>
                    <div class="section-tab" data-section="files">
                        <span class="tab-icon">📁</span>
                        <span class="tab-label">Fichiers</span>
                    </div>
                </div>
                
                <div class="section-content">
                    <div class="section-panel active" id="section-chat">
                        <div class="chat-container">
                            <div class="chat-messages" id="agent-chat-messages">
                                <div class="empty-state">
                                    <span class="empty-icon">💭</span>
                                    <p>Aucun message</p>
                                    <span class="empty-hint">L'historique apparaîtra ici</span>
                                </div>
                            </div>
                            <div class="chat-input-area">
                                <input type="text" id="agent-chat-input" class="chat-input" placeholder="Envoyer un message...">
                                <button id="agent-chat-send" class="chat-send-btn">➤</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section-panel" id="section-config">
                        <div class="config-container">
                            <div class="config-group">
                                <label>Modèle IA Principal</label>
                                <select class="config-select">
                                    <option>GPT-4o</option>
                                    <option>Claude 3.5 Sonnet</option>
                                    <option>Llama 3</option>
                                </select>
                            </div>
                            <button class="config-save-btn">Enregistrer</button>
                        </div>
                    </div>
                    
                    <div class="section-panel" id="section-tasks">
                        <div class="empty-state">
                            <span class="empty-icon">📋</span>
                            <p>Aucune tâche</p>
                            <span class="empty-hint">Les tâches assignées apparaîtront ici</span>
                        </div>
                    </div>
                    
                    <div class="section-panel" id="section-files">
                        <div class="files-view">
                            <div class="files-list-container" id="files-list-wrapper">
                                <div class="empty-state">
                                    <span class="empty-icon">📂</span>
                                    <p>Aucun fichier</p>
                                </div>
                            </div>
                            <div class="file-editor-container" id="file-editor-wrapper" style="display: none;">
                                <div class="file-editor-header">
                                    <button class="file-editor-back" id="file-editor-back">◀</button>
                                    <span class="file-editor-title" id="file-editor-title">filename</span>
                                    <button class="file-editor-save" id="file-editor-save">💾</button>
                                </div>
                                <textarea class="file-editor-textarea" id="file-editor-textarea" spellcheck="false"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(panelElement);

    // Event listeners
    const closeBtn = panelElement.querySelector('.agent-panel-close');
    const overlay = panelElement.querySelector('.agent-panel-overlay');

    closeBtn.addEventListener('click', closeAgentPanel);
    overlay.addEventListener('click', closeAgentPanel);

    // Tabs
    const tabs = panelElement.querySelectorAll('.section-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const section = tab.dataset.section;
            switchTab(section);
        });
    });

    // Chat Events
    const chatSendBtn = panelElement.querySelector('#agent-chat-send');
    const chatInput = panelElement.querySelector('#agent-chat-input');
    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener('click', () => {
            const msg = chatInput.value.trim();
            if (msg) {
                appendChatMessage('Me', msg, 'outgoing');
                chatInput.value = '';
                setTimeout(() => {
                    appendChatMessage(currentAgent?.name || 'Agent', 'Je traite votre demande...', 'incoming');
                }, 1000);
            }
        });
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') chatSendBtn.click();
        });
    }

    // File Editor Events
    const backBtn = panelElement.querySelector('#file-editor-back');
    const saveBtn = panelElement.querySelector('#file-editor-save');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            panelElement.querySelector('#file-editor-wrapper').style.display = 'none';
            panelElement.querySelector('#files-list-wrapper').style.display = 'block';
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveBtn.textContent = '✅';
            setTimeout(() => saveBtn.textContent = '💾', 2000);
        });
    }

    console.log('[AgentPanel] Initialisé');
}

/**
 * Ouvre le panneau avec les données d'un agent
 * Charge les données temps réel depuis l'API
 */
export function openAgentPanel(agentData) {
    if (!panelElement) {
        initAgentPanel();
    }

    currentAgent = agentData;

    // Mettre à jour les infos de base
    const nameEl = panelElement.querySelector('.agent-name');
    const roleEl = panelElement.querySelector('.agent-role');
    const deptEl = panelElement.querySelector('.agent-dept');

    nameEl.textContent = agentData.name || 'Unknown';
    roleEl.textContent = agentData.role || 'Agent';
    deptEl.textContent = agentData.department || 'Unknown';

    // Afficher des loaders
    updateSectionData('files', { files: [] });

    // Charger les données temps réel
    loadAgentData(agentData.name);

    // Ouvrir le panneau
    panelElement.classList.add('open');
    isOpen = true;

    console.log('[AgentPanel] Ouvert pour:', agentData.name);
}

/**
 * Charge les données d'un agent depuis l'adaptateur
 */
async function loadAgentData(agentName) {
    const header = panelElement.querySelector('.agent-panel-header');
    const oldStatus = header.querySelector('.agent-status-badge');
    if (oldStatus) oldStatus.textContent = "⏳ Chargement...";

    try {
        const data = await dataAdapter.toAgentPanelData(agentName);

        // Mettre à jour les sections avec les vraies données
        updateSectionData('files', { files: data.files });
        updateSectionData('chat', { conversations: data.conversations });
        updateSectionData('tasks', { tasks: data.tasks, stats: data.stats });

        // Ajouter un indicateur de statut
        updateAgentStatus(data.status, data.lastSeen);
    } catch (e) {
        console.error("Erreur de chargement data agent:", e);
    }
}

/**
 * Met à jour l'indicateur de statut de l'agent
 */
function updateAgentStatus(status, lastSeen) {
    const header = panelElement.querySelector('.agent-panel-header');

    // Supprime l'ancien statut s'il existe
    const oldStatus = header.querySelector('.agent-status-badge');
    if (oldStatus) oldStatus.remove();

    // Crée le nouveau badge
    const statusBadge = document.createElement('span');
    statusBadge.className = `agent-status-badge status-${status}`;
    statusBadge.textContent = status === 'active' ? `🟢 En ligne (${lastSeen})` : `⚪ ${lastSeen}`;

    header.querySelector('.agent-info').appendChild(statusBadge);
}

/**
 * Ferme le panneau
 */
export function closeAgentPanel() {
    if (!panelElement) return;

    panelElement.classList.remove('open');
    isOpen = false;
    currentAgent = null;

    // Retourner la caméra à la vue globale
    resetCameraToGlobalView();

    console.log('[AgentPanel] Fermé - retour caméra globale');
}

/**
 * Change d'onglet
 */
function switchTab(sectionName) {
    // Mettre à jour les tabs
    const tabs = panelElement.querySelectorAll('.section-tab');
    tabs.forEach(tab => {
        if (tab.dataset.section === sectionName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Mettre à jour les panels
    const panels = panelElement.querySelectorAll('.section-panel');
    panels.forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = panelElement.querySelector(`#section-${sectionName}`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

/**
 * Vérifie si le panneau est ouvert
 */
export function isAgentPanelOpen() {
    return isOpen;
}

/**
 * Récupère l'agent actuellement affiché
 */
export function getCurrentAgent() {
    return currentAgent;
}

/**
 * Met à jour les données d'une section avec les vraies données
 * @param {string} sectionName - 'files', 'conversations', ou 'tasks'
 * @param {any} data - Les données à afficher
 */
export function updateSectionData(sectionName, data) {
    if (!panelElement) return;

    const panel = panelElement.querySelector(`#section-${sectionName}`);
    if (!panel) return;

    // Vide le contenu actuel
    panel.innerHTML = '';

    switch (sectionName) {
        case 'files':
            renderFiles(panel.querySelector('#files-list-wrapper') || panel, data.files);
            break;
        case 'chat':
            renderChat(panel.querySelector('#agent-chat-messages') || panel, data.conversations);
            break;
        case 'config':
            // Config handled statically for now
            break;
        case 'tasks':
            renderTasks(panel, data.tasks, data.stats);
            break;
    }
}

/**
 * Ouvre l'éditeur de fichier
 */
function openFileEditor(file) {
    if (!panelElement) return;

    const listWrapper = panelElement.querySelector('#files-list-wrapper');
    const editorWrapper = panelElement.querySelector('#file-editor-wrapper');
    const titleEl = panelElement.querySelector('#file-editor-title');
    const textareaEl = panelElement.querySelector('#file-editor-textarea');

    if (listWrapper && editorWrapper && titleEl && textareaEl) {
        titleEl.textContent = file.name;
        // Mock data content based on filename
        if (file.name === 'memory.md') {
            textareaEl.value = '## Memory Object\n- User is active\n- Last task completed successfully.';
        } else if (file.name === 'agent.md') {
            textareaEl.value = `# System Prompt\nYou are an AI assistant specialized in development.`;
        } else {
            textareaEl.value = `// Contenu de ${file.name}\n\n`;
        }

        listWrapper.style.display = 'none';
        editorWrapper.style.display = 'flex';
    }
}

/**
 * Rendu de la section fichiers
 */
function renderFiles(container, files) {
    if (!files || files.length === 0) {
        // Ajout de mocks pour la démo
        files = [
            { name: 'memory', type: 'folder', count: 12, modified: 'Aujourd\'hui' },
            { name: 'agent.md', type: 'file', size: '5 KB', modified: 'Hier' },
            { name: 'soul.md', type: 'file', size: '1 KB', modified: 'Hier' }
        ];
    }

    container.innerHTML = '';
    const fileList = document.createElement('div');
    fileList.className = 'file-list';

    files.forEach(file => {
        const fileEl = document.createElement('div');
        fileEl.className = 'file-item file-clickable';

        fileEl.addEventListener('click', () => {
            if (file.type !== 'folder') openFileEditor(file);
        });

        const icon = file.type === 'folder' ? '📁' : '📄';
        const meta = file.type === 'folder'
            ? `${file.count || 0} fichiers`
            : `${file.size} • ${file.modified}`;

        fileEl.innerHTML = `
            <span class="file-icon">${icon}</span>
            <div class="file-info">
                <span class="file-name">${file.name}</span>
                <span class="file-meta">${meta}</span>
            </div>
            <span class="file-action">✎</span>
        `;

        fileList.appendChild(fileEl);
    });

    container.appendChild(fileList);
}

/**
 * Rendu de la section chat
 */
function renderChat(container, conversations) {
    // Si la logique de conversations précédente est passée, on les transforme en bulles
    container.innerHTML = '';

    // Message de bienvenue par défaut
    appendChatMessage('Système', 'Session démarrée.', 'system');
}

/**
 * Ajoute un message au chat
 */
function appendChatMessage(sender, content, type) {
    if (!panelElement) return;
    const msgContainer = panelElement.querySelector('#agent-chat-messages');
    if (!msgContainer) return;

    // Retirer le empty-state si présent
    const emptyState = msgContainer.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble chat-${type}`; // type: 'incoming', 'outgoing', 'system'

    msgEl.innerHTML = `
        <div class="chat-bubble-sender">${sender}</div>
        <div class="chat-bubble-content">${content}</div>
    `;

    msgContainer.appendChild(msgEl);

    // Auto-scroll to bottom
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

/**
 * Rendu de la section tâches
 */
function renderTasks(container, tasks, stats) {
    // Stats en haut
    if (stats) {
        const statsEl = document.createElement('div');
        statsEl.className = 'agent-stats';
        statsEl.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${stats.tokensUsed.toLocaleString()}</span>
                <span class="stat-label">Tokens</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.tasksCompleted}</span>
                <span class="stat-label">Terminées</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.delegations}</span>
                <span class="stat-label">Délégations</span>
            </div>
        `;
        container.appendChild(statsEl);
    }

    if (!tasks || tasks.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>Aucune tâche active</p>
            </div>
        `;
        container.appendChild(emptyEl);
        return;
    }

    const taskList = document.createElement('div');
    taskList.className = 'task-list';

    tasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-item task-${task.status}`;

        const statusIcon = task.status === 'in_progress' ? '▶️' :
            task.status === 'completed' ? '✅' : '⏸️';
        const priorityClass = `priority-${task.priority}`;

        taskEl.innerHTML = `
            <div class="task-header">
                <span class="task-status">${statusIcon}</span>
                <span class="task-title">${task.title}</span>
                <span class="task-priority ${priorityClass}">${task.priority}</span>
            </div>
        `;

        taskList.appendChild(taskEl);
    });

    container.appendChild(taskList);
}
