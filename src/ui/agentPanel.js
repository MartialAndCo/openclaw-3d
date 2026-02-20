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
                    <div class="section-tab active" data-section="files">
                        <span class="tab-icon">📁</span>
                        <span class="tab-label">Fichiers</span>
                    </div>
                    <div class="section-tab" data-section="conversations">
                        <span class="tab-icon">💬</span>
                        <span class="tab-label">Conversations</span>
                    </div>
                    <div class="section-tab" data-section="tasks">
                        <span class="tab-icon">✓</span>
                        <span class="tab-label">Tâches</span>
                    </div>
                </div>
                
                <div class="section-content">
                    <div class="section-panel active" id="section-files">
                        <div class="empty-state">
                            <span class="empty-icon">📂</span>
                            <p>Aucun fichier</p>
                            <span class="empty-hint">Les fichiers de l'agent apparaîtront ici</span>
                        </div>
                    </div>
                    
                    <div class="section-panel" id="section-conversations">
                        <div class="empty-state">
                            <span class="empty-icon">💭</span>
                            <p>Aucune conversation</p>
                            <span class="empty-hint">Les conversations apparaîtront ici</span>
                        </div>
                    </div>
                    
                    <div class="section-panel" id="section-tasks">
                        <div class="empty-state">
                            <span class="empty-icon">📋</span>
                            <p>Aucune tâche</p>
                            <span class="empty-hint">Les tâches assignées apparaîtront ici</span>
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
function loadAgentData(agentName) {
    const data = dataAdapter.toAgentPanelData(agentName);
    
    // Mettre à jour les sections avec les vraies données
    updateSectionData('files', { files: data.files });
    updateSectionData('conversations', { conversations: data.conversations });
    updateSectionData('tasks', { tasks: data.tasks, stats: data.stats });
    
    // Ajouter un indicateur de statut
    updateAgentStatus(data.status, data.lastSeen);
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

    switch(sectionName) {
        case 'files':
            renderFiles(panel, data.files);
            break;
        case 'conversations':
            renderConversations(panel, data.conversations);
            break;
        case 'tasks':
            renderTasks(panel, data.tasks, data.stats);
            break;
    }
}

/**
 * Rendu de la section fichiers
 */
function renderFiles(container, files) {
    if (!files || files.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📂</span>
                <p>Aucun fichier</p>
                <span class="empty-hint">Les fichiers de l'agent apparaîtront ici</span>
            </div>
        `;
        return;
    }

    const fileList = document.createElement('div');
    fileList.className = 'file-list';

    files.forEach(file => {
        const fileEl = document.createElement('div');
        fileEl.className = 'file-item';
        
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
        `;
        
        fileList.appendChild(fileEl);
    });

    container.appendChild(fileList);
}

/**
 * Rendu de la section conversations
 */
function renderConversations(container, conversations) {
    if (!conversations || conversations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💭</span>
                <p>Aucune conversation</p>
                <span class="empty-hint">Les conversations apparaîtront ici</span>
            </div>
        `;
        return;
    }

    const convList = document.createElement('div');
    convList.className = 'conversation-list';

    conversations.forEach(conv => {
        const convEl = document.createElement('div');
        convEl.className = 'conversation-item';
        
        const typeIcon = conv.type === 'delegation' ? '📤' : 
                         conv.type === 'response' ? '📥' : '💬';
        const time = new Date(conv.timestamp).toLocaleTimeString();
        
        convEl.innerHTML = `
            <div class="conversation-header">
                <span class="conv-type">${typeIcon} ${conv.type}</span>
                <span class="conv-time">${time}</span>
            </div>
            <div class="conversation-with">Avec: ${conv.with}</div>
            <div class="conversation-content">${conv.content || 'Pas de contenu'}</div>
        `;
        
        convList.appendChild(convEl);
    });

    container.appendChild(convList);
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
