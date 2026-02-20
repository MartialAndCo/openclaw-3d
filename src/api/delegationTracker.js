/**
 * DelegationTracker - Gestion des déplacements bidirectionnels
 * Quand A parle à B, A se déplace vers B
 * Gère la file d'attente des interactions simultanées
 */

import { gateway } from './gateway.js';
import { PREDEFINED_ROUTES } from '../routes.js';
import { ceoAnimator } from '../characters/ceoAnimator.js';
import { state } from '../state.js';
import { presenceManager } from './presenceManager.js';

class DelegationTracker {
  constructor() {
    this.queue = []; // File d'attente des déplacements
    this.isProcessing = false;
    this.currentInteraction = null;
    this.employeeAnimators = new Map(); // Cache des animateurs par agent
    this.processingDelay = 1000; // Délai entre les déplacements
    
    // Mapping agent -> modèle 3D
    this.agentModels = new Map();
  }

  /**
   * Initialise le tracker
   */
  initialize() {
    console.log('[DelegationTracker] Initialisation...');
    
    // Écoute les interactions détectées par le gateway
    gateway.on('interaction-detected', (interaction) => {
      this.handleInteraction(interaction);
    });

    // Scan initial des modèles 3D
    this.scanAgentModels();
  }

  /**
   * Scan la scène pour trouver les modèles des agents
   */
  scanAgentModels() {
    if (!state.scene) return;

    state.scene.traverse((obj) => {
      if (obj.userData && obj.userData.employeeName) {
        this.agentModels.set(obj.userData.employeeName, obj);
        console.log(`[DelegationTracker] Agent trouvé: ${obj.userData.employeeName}`);
      }
    });

    // Le CEO est géré séparément via ceoAnimator
    console.log(`[DelegationTracker] ${this.agentModels.size} agents scannés`);
  }

  /**
   * Enregistre un animateur d'employé
   */
  registerEmployeeAnimator(agentName, animator) {
    this.employeeAnimators.set(agentName, animator);
  }

  /**
   * Gère une nouvelle interaction
   */
  handleInteraction(interaction) {
    console.log(`[DelegationTracker] Nouvelle interaction: ${interaction.from} → ${interaction.to}`);
    
    // Ajoute à la file d'attente
    this.queue.push({
      ...interaction,
      addedAt: Date.now()
    });

    // Traite la file si pas déjà en cours
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Force une délégation manuelle (pour tests ou déclenchement externe)
   */
  forceDelegation(from, to, type = 'delegation', content = '') {
    const interaction = {
      id: `manual-${Date.now()}`,
      from: this.mapToDashboardName(from),
      to: this.mapToDashboardName(to),
      fromName: from,
      toName: to,
      type,
      content,
      timestamp: Date.now(),
      priority: 'high'
    };

    this.handleInteraction(interaction);
  }

  /**
   * Traite la file d'attente des déplacements
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      this.currentInteraction = null;
      return;
    }

    this.isProcessing = true;
    
    // Prend la prochaine interaction (triée par priorité/timestamp)
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.timestamp - b.timestamp;
    });

    const interaction = this.queue.shift();
    this.currentInteraction = interaction;

    console.log(`[DelegationTracker] Traitement: ${interaction.from} → ${interaction.to}`);

    // Exécute le déplacement
    await this.executeMovement(interaction);

    // Attend avant le prochain déplacement
    await this.wait(this.processingDelay);

    // Continue avec la file
    this.processQueue();
  }

  /**
   * Exécute le déplacement d'un agent vers un autre
   */
  async executeMovement(interaction) {
    const { from, to, type } = interaction;

    // Vérifie si les agents sont présents, sinon les spawn
    const fromName = interaction.fromName || from;
    const toName = interaction.toName || to;
    
    // Spawn l'agent "from" s'il n'est pas présent (et ce n'est pas la porte)
    if (fromName !== '🚪 PORTE SORTIE' && fromName !== 'CEO') {
      const fromStatus = presenceManager.agentStates.get(fromName);
      if (!fromStatus || !fromStatus.present) {
        console.log(`[DelegationTracker] ${fromName} n'est pas présent, spawning...`);
        presenceManager.spawnAgent(fromName);
        await this.wait(500); // Attend que le modèle charge
      }
    }
    
    // Spawn l'agent "to" s'il n'est pas présent (et ce n'est pas la porte)
    if (toName !== '🚪 PORTE SORTIE' && toName !== 'CEO') {
      const toStatus = presenceManager.agentStates.get(toName);
      if (!toStatus || !toStatus.present) {
        console.log(`[DelegationTracker] ${toName} n'est pas présent, spawning...`);
        presenceManager.spawnAgent(toName);
        await this.wait(500); // Attend que le modèle charge
      }
    }

    // Trouve la route appropriée
    const route = this.findRoute(from, to);
    
    if (!route) {
      console.warn(`[DelegationTracker] Pas de route trouvée: ${from} → ${to}`);
      return;
    }

    // Détermine l'animateur à utiliser
    const isCEO = from === 'CEO';
    
    if (isCEO) {
      // Utilise le CEO animator
      await this.animateCEO(route, interaction);
    } else {
      // Utilise l'animateur d'employé
      await this.animateEmployee(from, route, interaction);
    }
  }

  /**
   * Anime le CEO
   */
  async animateCEO(route, interaction) {
    console.log(`[DelegationTracker] Animation CEO → ${interaction.to}`);

    return new Promise((resolve) => {
      ceoAnimator.startRoute(route.points, () => {
        console.log(`[DelegationTracker] CEO arrivé chez ${interaction.to}`);
        
        // Joue l'animation de discussion
        this.playTalkingAnimation('CEO', interaction.to);
        
        // Attend un peu puis retour
        setTimeout(() => {
          this.returnToDesk('CEO', route.points).then(resolve);
        }, 3000);
      });
    });
  }

  /**
   * Anime un employé
   */
  async animateEmployee(agentName, route, interaction) {
    console.log(`[DelegationTracker] Animation ${agentName} → ${interaction.to}`);

    const animator = this.employeeAnimators.get(agentName);
    if (!animator) {
      console.warn(`[DelegationTracker] Animateur non trouvé pour ${agentName}`);
      return;
    }

    // Détermine si c'est une sortie (vers la porte)
    const isExit = interaction.to === '🚪 PORTE SORTIE';
    const isWarRoom = route.isWarRoom;

    await animator.executeRoute(
      route.points,
      route.finalOrientation,
      route.name,
      route.chairIndex || 0
    );

    // Si ce n'est pas une sortie ou war room, retour au bureau après discussion
    if (!isExit && !isWarRoom) {
      await this.wait(2000);
      
      // Route inverse pour le retour
      const returnRoute = [...route.points].reverse();
      await animator.executeRoute(
        returnRoute,
        null,
        `${agentName} retour`,
        0
      );
    }
  }

  /**
   * Retourne un agent à son bureau
   */
  async returnToDesk(agentName, originalPoints) {
    if (agentName === 'CEO') {
      // Route retour CEO
      const returnPoints = [...originalPoints].reverse();
      ceoAnimator.startRoute(returnPoints, () => {
        console.log('[DelegationTracker] CEO de retour à son bureau');
      });
    }
  }

  /**
   * Joue l'animation de discussion entre deux agents
   */
  playTalkingAnimation(from, to) {
    // Trouve les deux agents et joue l'anim "talk"
    // Pour l'instant, juste un log
    console.log(`[DelegationTracker] Discussion: ${from} ⟷ ${to}`);
  }

  /**
   * Trouve la route prédéfinie entre deux agents
   */
  findRoute(from, to) {
    // Cherche dans PREDEFINED_ROUTES
    const routes = Object.values(PREDEFINED_ROUTES);
    
    // Essaie de trouver une correspondance exacte
    let route = routes.find(r => 
      r.startName === from && r.endName === to
    );

    // Si pas trouvé, essaie avec des variations de noms
    if (!route) {
      route = this.findRouteWithFallback(from, to, routes);
    }

    return route;
  }

  /**
   * Recherche de route avec fallback
   */
  findRouteWithFallback(from, to, routes) {
    // Mapping des variations de noms
    const variations = {
      'CEO': ['CEO', 'Orchestrator'],
      'Head of Tech (CTO)': ['Head of Tech (CTO)', 'CTO', 'Head of Tech'],
      'Head of Biz (COO)': ['Head of Biz (COO)', 'COO', 'Head of Business'],
      'Head of Security (CISO)': ['Head of Security (CISO)', 'CISO', 'Head of Security'],
      'Head of Personal (COS)': ['Head of Personal (COS)', 'COS', 'Head of Personal'],
      'Head of Growth (MB)': ['Head of Growth (MB)', 'MB', 'Head of Growth']
    };

    const fromVariations = variations[from] || [from];
    const toVariations = variations[to] || [to];

    for (const fromV of fromVariations) {
      for (const toV of toVariations) {
        const route = routes.find(r => 
          r.startName === fromV && r.endName === toV
        );
        if (route) return route;
      }
    }

    return null;
  }

  /**
   * Mappe les noms internes vers les noms du dashboard
   */
  mapToDashboardName(name) {
    const mappings = {
      'orchestrator': 'CEO',
      'tech': 'Head of Tech (CTO)',
      'business': 'Head of Biz (COO)',
      'security': 'Head of Security (CISO)',
      'personal': 'Head of Personal (COS)',
      'growth': 'Head of Growth (MB)',
      'ui': 'ui-agent',
      'ux': 'ux-agent',
      'codeur': 'codeur-agent',
      'debugger': 'debugger-agent',
      'media-tech': 'media-tech-agent',
      'monitoring': 'monitoring-agent',
      'backup': 'backup-agent',
      'perso-agent': 'perso-agent',
      'calendar': 'calendar-agent',
      'trend': 'trend-agent',
      'ads': 'ads-agent',
      'report': 'report-agent',
      'pm': 'pm-agent'
    };

    return mappings[name.toLowerCase()] || name;
  }

  /**
   * Retourne l'état actuel de la file
   */
  getQueueStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      currentInteraction: this.currentInteraction,
      pendingInteractions: this.queue
    };
  }

  /**
   * Vide la file d'attente
   */
  clearQueue() {
    this.queue = [];
    console.log('[DelegationTracker] File vidée');
  }

  /**
   * Utility: wait
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton export
export const delegationTracker = new DelegationTracker();
