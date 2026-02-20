/**
 * PresenceManager - Gère la présence/absence des agents
 * Si un agent est inactif depuis 5min, il quitte la salle (animation de sortie)
 * S'il redevient actif, il entre (animation d'entrée)
 */

import { EventEmitter } from './eventEmitter.js';
import { gateway } from './gateway.js';
import { delegationTracker } from './delegationTracker.js';
import { PREDEFINED_ROUTES } from '../routes.js';
import { state, updateLoadingProgress } from '../state.js';
import { loadSeatedEmployeeAtDesk } from '../characters/index.js';

const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL = 30000; // Vérification toutes les 30 secondes

class PresenceManager extends EventEmitter {
  constructor() {
    super();
    this.checkInterval = null;
    this.agentStates = new Map(); // agentName -> { present: boolean, lastSeen: timestamp }
    this.isInitialized = false;
  }

  /**
   * Initialise le gestionnaire de présence
   */
  initialize() {
    if (this.isInitialized) return;
    
    console.log('[PresenceManager] Initialisation...');
    
    // Commence la vérification périodique
    this.checkInterval = setInterval(() => {
      this.checkAllAgents();
    }, CHECK_INTERVAL);
    
    // Écoute les mises à jour de heartbeat
    gateway.on('data-updated', (data) => {
      this.updateHeartbeats(data.heartbeats || {});
    });
    
    this.isInitialized = true;
  }

  /**
   * Arrête le gestionnaire
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isInitialized = false;
  }

  /**
   * Met à jour les heartbeats reçus
   */
  updateHeartbeats(heartbeats) {
    Object.entries(heartbeats).forEach(([agent, lastBeat]) => {
      const currentState = this.agentStates.get(agent);
      
      if (currentState) {
        // Met à jour le timestamp
        currentState.lastSeen = lastBeat;
        
        // Si l'agent était absent et redevient actif
        if (!currentState.present && this.isActive(lastBeat)) {
          this.agentReturns(agent);
        }
      } else {
        // Nouvel agent
        this.agentStates.set(agent, {
          present: this.isActive(lastBeat),
          lastSeen: lastBeat
        });
      }
    });
  }

  /**
   * Vérifie tous les agents pour les sorties
   */
  checkAllAgents() {
    const now = Date.now();
    
    this.agentStates.forEach((state, agent) => {
      const shouldBePresent = this.isActive(state.lastSeen);
      
      if (state.present && !shouldBePresent) {
        // L'agent doit partir
        this.agentLeaves(agent);
      }
    });
  }

  /**
   * Vérifie si un timestamp indique un agent actif
   */
  isActive(lastBeat) {
    return (Date.now() - lastBeat) < INACTIVITY_THRESHOLD;
  }

  /**
   * Un agent quitte la salle (inactif depuis 5min)
   */
  agentLeaves(agentName) {
    console.log(`[PresenceManager] ${agentName} quitte la salle (inactif)`);
    
    const state = this.agentStates.get(agentName);
    if (state) state.present = false;
    
    // Déclenche l'animation de sortie
    const exitRoute = this.findExitRoute(agentName);
    if (exitRoute) {
      delegationTracker.forceDelegation(agentName, '🚪 PORTE SORTIE', 'exit', 'Inactivité prolongée');
    }
    
    this.emit('agent-left', { agent: agentName, reason: 'inactivity' });
  }

  /**
   * Un agent revient dans la salle (redevenu actif)
   */
  agentReturns(agentName) {
    console.log(`[PresenceManager] ${agentName} revient dans la salle`);
    
    const state = this.agentStates.get(agentName);
    if (state) state.present = true;
    
    // Déclenche l'animation d'entrée
    const enterRoute = this.findEnterRoute(agentName);
    if (enterRoute) {
      // Pour l'entrée, on utilise une interaction simulée
      delegationTracker.handleInteraction({
        id: `enter-${agentName}-${Date.now()}`,
        from: '🚪 PORTE SORTIE',
        to: agentName,
        fromName: '🚪 PORTE SORTIE',
        toName: agentName,
        type: 'enter',
        content: 'Retour après inactivité',
        timestamp: Date.now(),
        priority: 'low'
      });
    }
    
    this.emit('agent-returned', { agent: agentName });
  }

  /**
   * Trouve la route de sortie pour un agent
   */
  findExitRoute(agentName) {
    const routes = Object.values(PREDEFINED_ROUTES);
    
    // Cherche la route agentName → PORTE
    return routes.find(r => 
      r.startName === agentName && r.endName === '🚪 PORTE SORTIE'
    );
  }

  /**
   * Trouve la route d'entrée pour un agent
   */
  findEnterRoute(agentName) {
    const routes = Object.values(PREDEFINED_ROUTES);
    
    // Cherche la route PORTE → agentName
    return routes.find(r => 
      r.startName === '🚪 PORTE SORTIE' && r.endName === agentName
    );
  }

  /**
   * Force un agent à quitter la salle (pour tests)
   */
  forceLeave(agentName) {
    const state = this.agentStates.get(agentName);
    if (state) {
      state.lastSeen = Date.now() - INACTIVITY_THRESHOLD - 1000;
      this.checkAllAgents();
    }
  }

  /**
   * Force un agent à rentrer (pour tests)
   */
  forceReturn(agentName) {
    const state = this.agentStates.get(agentName);
    if (state) {
      state.lastSeen = Date.now();
      state.present = false; // Force le changement d'état
      this.agentReturns(agentName);
    }
  }

  /**
   * Retourne la liste des agents présents
   */
  getPresentAgents() {
    const present = [];
    this.agentStates.forEach((state, agent) => {
      if (state.present) present.push(agent);
    });
    return present;
  }

  /**
   * Retourne la liste des agents absents
   */
  getAbsentAgents() {
    const absent = [];
    this.agentStates.forEach((state, agent) => {
      if (!state.present) absent.push(agent);
    });
    return absent;
  }

  /**
   * Fait apparaître (spawner) un agent à son bureau
   * Utilisé quand un agent est appelé pour la première fois
   */
  spawnAgent(agentName) {
    console.log(`[PresenceManager] Spawning agent: ${agentName}`);
    
    // Vérifie si l'agent existe déjà
    const existingState = this.agentStates.get(agentName);
    if (existingState && existingState.present) {
      console.log(`[PresenceManager] ${agentName} est déjà présent`);
      return true;
    }
    
    // Trouve le bureau de l'agent
    const desk = state.desks.find(d => d.occupant && d.occupant.name === agentName);
    if (!desk) {
      console.warn(`[PresenceManager] Bureau non trouvé pour: ${agentName}`);
      return false;
    }
    
    // Trouve le groupe du bureau dans la scène
    let deskGroup = null;
    state.scene.traverse((obj) => {
      if (obj.userData && obj.userData.deskData && obj.userData.deskData.occupant && 
          obj.userData.deskData.occupant.name === agentName) {
        deskGroup = obj;
      }
    });
    
    if (!deskGroup) {
      console.warn(`[PresenceManager] Groupe de bureau non trouvé pour: ${agentName}`);
      return false;
    }
    
    // Charge l'employé à son bureau
    const chairZ = 0.65 / 2 + 0.25; // deskDepth/2 + 0.25 (standard)
    loadSeatedEmployeeAtDesk(deskGroup, chairZ, agentName);
    
    // Met à jour le statut
    this.agentStates.set(agentName, {
      present: true,
      lastSeen: Date.now()
    });
    
    // Met à jour la progression
    updateLoadingProgress();
    
    // Enregistre le modèle dans le delegation tracker
    setTimeout(() => {
      delegationTracker.scanAgentModels();
    }, 1000);
    
    console.log(`[PresenceManager] ${agentName} a été spawné avec succès`);
    this.emit('agent-spawned', { agent: agentName });
    return true;
  }

  /**
   * Retourne l'état complet
   */
  getStatus() {
    return {
      present: this.getPresentAgents(),
      absent: this.getAbsentAgents(),
      total: this.agentStates.size
    };
  }
}

// Singleton export
export const presenceManager = new PresenceManager();
