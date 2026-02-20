/**
 * API Module - Point d'entrée unique pour les données OpenClaw
 * Exporte tous les modules de l'API
 */

export { gateway } from './gateway.js';
export { delegationTracker } from './delegationTracker.js';
export { dataAdapter } from './dataAdapter.js';
export { EventEmitter } from './eventEmitter.js';
export { presenceManager } from './presenceManager.js';

// Version de l'API
export const API_VERSION = '1.0.0';

// État de connexion
export const ConnectionStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  POLLING: 'polling',
  ERROR: 'error'
};
