/**
 * Test de l'intégration API
 * Fichier temporaire pour tester les fonctionnalités
 */

import { gateway } from './api/gateway.js';
import { delegationTracker } from './api/delegationTracker.js';
import { dataAdapter } from './api/dataAdapter.js';
import { presenceManager } from './api/presenceManager.js';

// Expose pour les tests manuels dans la console
window.testAPI = {
  /**
   * Test une délégation CEO → Head
   */
  testCEOToHead() {
    console.log('[Test] CEO → Head of Tech');
    delegationTracker.forceDelegation('CEO', 'Head of Tech (CTO)', 'delegation', 'Test délégation');
  },

  /**
   * Test une délégation Head → Agent
   */
  testHeadToAgent() {
    console.log('[Test] Head of Tech → ui-agent');
    delegationTracker.forceDelegation('Head of Tech (CTO)', 'ui-agent', 'delegation', 'Créer un bouton');
  },

  /**
   * Test une réponse Agent → Head
   */
  testAgentToHead() {
    console.log('[Test] ui-agent → Head of Tech');
    delegationTracker.forceDelegation('ui-agent', 'Head of Tech (CTO)', 'response', 'Bouton créé');
  },

  /**
   * Test une réponse Head → CEO
   */
  testHeadToCEO() {
    console.log('[Test] Head of Tech → CEO');
    delegationTracker.forceDelegation('Head of Tech (CTO)', 'CEO', 'response', 'Module prêt');
  },

  /**
   * Test une série de délégations
   */
  async testDelegationChain() {
    console.log('[Test] Chaîne de délégations');
    
    this.testCEOToHead();
    await this.wait(4000);
    
    this.testHeadToAgent();
    await this.wait(4000);
    
    this.testAgentToHead();
    await this.wait(4000);
    
    this.testHeadToCEO();
    
    console.log('[Test] Chaîne terminée');
  },

  /**
   * Test la présence (sortie)
   */
  testLeave() {
    console.log('[Test] ui-agent quitte la salle');
    presenceManager.forceLeave('ui-agent');
  },

  /**
   * Test la présence (retour)
   */
  testReturn() {
    console.log('[Test] ui-agent revient');
    presenceManager.forceReturn('ui-agent');
  },

  /**
   * Test les données des écrans
   */
  testScreenData() {
    console.log('[Test] Mise à jour des écrans');
    
    const mockData = {
      interactions: [
        { from: 'CEO', to: 'Head of Tech (CTO)', type: 'delegation', timestamp: Date.now() },
        { from: 'Head of Tech (CTO)', to: 'ui-agent', type: 'delegation', timestamp: Date.now() - 60000 }
      ],
      heartbeats: {
        'CEO': Date.now(),
        'Head of Tech (CTO)': Date.now() - 30000,
        'ui-agent': Date.now() - 400000 // Inactif
      }
    };

    const screenData = dataAdapter.toScreenData(mockData);
    console.log('[Test] Données écrans:', screenData);
    
    return screenData;
  },

  /**
   * Test le panneau agent
   */
  testAgentPanel() {
    console.log('[Test] Données panneau ui-agent');
    
    const data = dataAdapter.toAgentPanelData('ui-agent');
    console.log('[Test] Données agent:', data);
    
    return data;
  },

  /**
   * Fait apparaître un agent à son bureau
   */
  spawnAgent(agentName) {
    console.log(`[Test] Spawning agent: ${agentName}`);
    presenceManager.spawnAgent(agentName);
  },

  /**
   * Affiche l'état du système
   */
  status() {
    console.log('=== État du Système ===');
    console.log('Gateway:', gateway.getStats());
    console.log('Delegation Queue:', delegationTracker.getQueueStatus());
    console.log('Presence:', presenceManager.getStatus());
  },

  /**
   * Liste toutes les commandes disponibles
   */
  help() {
    console.log(`
=== Commandes de Test ===

testAPI.testCEOToHead()        - Test CEO → Head
testAPI.testHeadToAgent()      - Test Head → Agent
testAPI.testAgentToHead()      - Test Agent → Head
testAPI.testHeadToCEO()        - Test Head → CEO
testAPI.testDelegationChain()  - Test chaîne complète
testAPI.spawnAgent('ui-agent') - Faire apparaître un agent
testAPI.testLeave()            - Test sortie (inactivité)
testAPI.testReturn()           - Test retour
testAPI.testScreenData()       - Test données écrans
testAPI.testAgentPanel()       - Test données panneau
testAPI.status()               - État du système
    `);
  },

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

console.log('[TestAPI] Chargé. Utilisez testAPI.help() pour voir les commandes');
