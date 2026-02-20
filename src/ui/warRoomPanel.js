/**
 * Panneau pour le mode Réunion War Room
 * Phase 1: Préparation avec bouton "Démarrer"
 * Phase 2: Réunion en cours avec participants et timer
 */

let panelElement = null;
let isOpen = false;
let isInPreparation = true;
let onStartMeetingCallback = null;
let onEndMeetingCallback = null;

/**
 * Initialise le panneau War Room
 */
export function initWarRoomPanel() {
    if (panelElement) return;

    panelElement = document.createElement('div');
    panelElement.id = 'warroom-panel';
    panelElement.className = 'warroom-panel';
    panelElement.innerHTML = `
        <div class="warroom-panel-content">
            <!-- Header -->
            <div class="warroom-header">
                <div class="warroom-title">
                    <span class="warroom-icon">⚡</span>
                    <div>
                        <h2>War Room</h2>
                        <span class="warroom-subtitle" id="warroom-phase">Préparation</span>
                    </div>
                </div>
                <button class="warroom-close-btn" title="Fermer">✕</button>
            </div>
            
            <!-- Body -->
            <div class="warroom-body">
                <!-- Phase Préparation -->
                <div id="prep-section" class="warroom-section">
                    <div class="prep-info">
                        <span class="prep-icon">👥</span>
                        <p class="prep-text">CEO + 5 Heads</p>
                        <span class="prep-hint">Prêts pour la réunion stratégique</span>
                    </div>
                    
                    <button class="warroom-start-btn" id="btn-start-meeting">
                        <span class="btn-icon">▶</span>
                        <span>Démarrer la réunion</span>
                    </button>
                </div>
                
                <!-- Phase Réunion (cachée au début) -->
                <div id="meeting-section" class="warroom-section" style="display:none;">
                    <div class="participants-section">
                        <h3>
                            <span>Participants</span>
                            <span class="participants-count" id="participants-count">0/6</span>
                        </h3>
                        <div class="participants-list" id="participants-list">
                            <div class="empty-participants">
                                <span class="empty-icon">🚶</span>
                                <p>En cours d'arrivée...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="meeting-controls">
                        <div class="control-item">
                            <span class="control-label">Durée</span>
                            <span class="control-value" id="meeting-timer">00:00</span>
                        </div>
                        <div class="control-item">
                            <span class="control-label">Statut</span>
                            <span class="control-value status-active" id="meeting-status">En préparation</span>
                        </div>
                    </div>
                    
                    <button class="warroom-end-btn" id="btn-end-meeting">
                        <span>Terminer la réunion</span>
                        <span class="btn-icon">✕</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(panelElement);

    // Event listeners
    panelElement.querySelector('.warroom-close-btn').addEventListener('click', closeWarRoomPanel);
    
    panelElement.querySelector('#btn-start-meeting').addEventListener('click', () => {
        startMeeting();
    });
    
    panelElement.querySelector('#btn-end-meeting').addEventListener('click', () => {
        if (onEndMeetingCallback) {
            onEndMeetingCallback();
        }
    });

    console.log('[WarRoomPanel] Initialisé');
}

/**
 * Démarre la réunion (transition de préparation → réunion)
 */
function startMeeting() {
    isInPreparation = false;
    
    // UI: cacher préparation, montrer réunion
    document.getElementById('prep-section').style.display = 'none';
    document.getElementById('meeting-section').style.display = 'block';
    document.getElementById('warroom-phase').textContent = 'Réunion en cours';
    
    // Démarrer le timer
    startTimer();
    
    // Appeler le callback pour lancer les animations
    if (onStartMeetingCallback) {
        onStartMeetingCallback();
    }
    
    console.log('[WarRoomPanel] Réunion démarrée');
}

/**
 * Ouvre le panneau War Room en mode préparation
 */
export function openWarRoomPanel(options = {}) {
    if (!panelElement) {
        initWarRoomPanel();
    }

    onStartMeetingCallback = options.onStartMeeting || null;
    onEndMeetingCallback = options.onEndMeeting || null;
    
    // Réinitialiser à l'état préparation
    isInPreparation = true;
    resetTimer();
    
    // Reset UI
    document.getElementById('prep-section').style.display = 'block';
    document.getElementById('meeting-section').style.display = 'none';
    document.getElementById('warroom-phase').textContent = 'Préparation';
    document.getElementById('meeting-status').textContent = 'En préparation';
    document.getElementById('meeting-status').className = 'control-value status-pending';
    
    // Reset participants
    document.getElementById('participants-list').innerHTML = `
        <div class="empty-participants">
            <span class="empty-icon">🚶</span>
            <p>En cours d'arrivée...</p>
        </div>
    `;
    document.getElementById('participants-count').textContent = '0/6';

    // Animer l'ouverture
    panelElement.classList.add('open');
    isOpen = true;

    console.log('[WarRoomPanel] Ouvert - Mode Préparation');
}

/**
 * Ferme le panneau
 */
export function closeWarRoomPanel() {
    if (!panelElement) return;

    panelElement.classList.remove('open');
    isOpen = false;
    stopTimer();
    isInPreparation = true;

    console.log('[WarRoomPanel] Fermé');
}

/**
 * Met à jour le statut quand un participant arrive
 */
export function participantArrived(name, role) {
    const list = document.getElementById('participants-list');
    const emptyState = list.querySelector('.empty-participants');
    
    if (emptyState) {
        emptyState.remove();
    }

    const participantEl = document.createElement('div');
    participantEl.className = 'participant-item arrived';
    participantEl.innerHTML = `
        <span class="participant-avatar">👤</span>
        <div class="participant-info">
            <span class="participant-name">${name}</span>
            <span class="participant-role">${role}</span>
        </div>
        <span class="participant-status arrived" title="Arrivé">✓</span>
    `;

    list.appendChild(participantEl);
    updateParticipantCount();
}

/**
 * Met à jour le compteur de participants
 */
function updateParticipantCount() {
    const count = document.querySelectorAll('.participant-item').length;
    document.getElementById('participants-count').textContent = `${count}/6`;
    
    // Si tous sont arrivés, mettre à jour le statut
    if (count === 6) {
        document.getElementById('meeting-status').textContent = 'En cours';
        document.getElementById('meeting-status').className = 'control-value status-active';
    }
}

/**
 * Vérifie si on est en préparation
 */
export function isInPreparationMode() {
    return isInPreparation;
}

// Timer
let timerInterval = null;
let startTime = null;

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    const timerEl = document.getElementById('meeting-timer');
    if (timerEl) {
        timerEl.textContent = '00:00';
    }
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    
    const timerEl = document.getElementById('meeting-timer');
    if (timerEl) {
        timerEl.textContent = `${minutes}:${seconds}`;
    }
}

/**
 * Vérifie si le panneau est ouvert
 */
export function isWarRoomPanelOpen() {
    return isOpen;
}
