/**
 * Gateway API - Interface entre OpenClaw réel et le Dashboard 3D
 * Polling toutes les 5 secondes pour récupérer les données temps réel
 */

import { EventEmitter } from './eventEmitter.js';

const API_BASE_URL = 'http://100.101.199.17:8081';

class Gateway extends EventEmitter {
  constructor() {
    super();
    this.pollingInterval = null;
    this.POLLING_DELAY = 5000; // 5 secondes
    this.lastMemoryCheck = new Date(0);
    this.agentData = new Map();
    this.globalStats = {
      tokens: 0,
      tasks: 0,
      activeAgents: 0,
      conversations: [],
      lastUpdate: null
    };
    this.workspacePath = '/home/ubuntu/.openclaw/workspace';
    this.useRealAPI = true; // Active l'API réelle
  }

  /**
   * Démarre le polling des données
   */
  startPolling() {
    if (this.pollingInterval) return;
    
    console.log('[Gateway] Démarrage du polling...');
    
    // Premier poll immédiat
    this.pollData();
    
    // Polling régulier
    this.pollingInterval = setInterval(() => {
      this.pollData();
    }, this.POLLING_DELAY);
  }

  /**
   * Arrête le polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[Gateway] Polling arrêté');
    }
  }

  /**
   * Récupère toutes les données en une fois
   */
  async pollData() {
    try {
      const timestamp = new Date();
      
      // Récupération parallèle des données
      const [memoryData, agentConfigs, heartbeats] = await Promise.all([
        this.fetchMemoryData(),
        this.fetchAgentConfigs(),
        this.fetchHeartbeats()
      ]);

      // Détection des interactions bidirectionnelles
      const interactions = this.detectInteractions(memoryData);
      
      // Mise à jour des stats globales
      await this.updateGlobalStats(memoryData, agentConfigs, heartbeats);
      
      // Notification des changements
      this.emit('data-updated', {
        timestamp,
        interactions,
        stats: this.globalStats,
        agents: Object.fromEntries(this.agentData)
      });

      // Émission spécifique des nouvelles interactions
      interactions.forEach(interaction => {
        this.emit('interaction-detected', interaction);
      });

    } catch (error) {
      console.error('[Gateway] Erreur polling:', error);
      this.emit('error', error);
    }
  }

  /**
   * Récupère les données des fichiers mémoire depuis l'API
   */
  async fetchMemoryData() {
    if (!this.useRealAPI) {
      return this.fetchMemoryDataFallback();
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/memory`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      return {
        files: data.files || [],
        recentEntries: this.transformEntries(data.recentEntries || []),
        lastModified: Date.now()
      };
    } catch (error) {
      console.warn('[Gateway] API mémoire indisponible:', error.message);
      return this.fetchMemoryDataFallback();
    }
  }

  /**
   * Fallback si l'API n'est pas disponible
   */
  fetchMemoryDataFallback() {
    return {
      files: [],
      recentEntries: [],
      lastModified: Date.now()
    };
  }

  /**
   * Transforme les entrées API au format interne
   */
  transformEntries(entries) {
    return entries.map(entry => ({
      timestamp: entry.timestamp || Date.now(),
      from: entry.interaction?.from || entry.from || 'System',
      to: entry.interaction?.to || entry.to || 'System',
      type: entry.interaction?.type || entry.type || 'info',
      content: entry.content?.substring(0, 200) || '',
      source: entry.source
    }));
  }

  /**
   * Détecte les interactions bidirectionnelles entre agents
   */
  detectInteractions(memoryData) {
    const interactions = [];
    const entries = memoryData.recentEntries || [];

    // Filtre des entrées des 5 dernières minutes
    const recentCutoff = Date.now() - 5 * 60 * 1000;
    const recentEntries = entries.filter(e => e.timestamp > recentCutoff);

    // Détection des patterns d'interaction
    recentEntries.forEach(entry => {
      const fromId = this.mapAgentNameToId(entry.from);
      const toId = this.mapAgentNameToId(entry.to);

      if (fromId && toId && fromId !== toId) {
        interactions.push({
          id: `${fromId}-${toId}-${entry.timestamp}`,
          from: fromId,
          to: toId,
          fromName: entry.from,
          toName: entry.to,
          type: entry.type,
          content: entry.content,
          timestamp: entry.timestamp,
          priority: this.calculatePriority(entry)
        });
      }
    });

    return interactions;
  }

  /**
   * Mapping des noms d'agents vers les IDs du dashboard
   */
  mapAgentNameToId(name) {
    if (!name) return null;
    
    const mappings = {
      'Orchestrator': 'CEO',
      'CEO': 'CEO',
      'KAOS': 'CEO',
      'Head of Tech': 'Head of Tech (CTO)',
      'CTO': 'Head of Tech (CTO)',
      'Head of Business': 'Head of Biz (COO)',
      'COO': 'Head of Biz (COO)',
      'Head of Security': 'Head of Security (CISO)',
      'CISO': 'Head of Security (CISO)',
      'Head of Personal': 'Head of Personal (COS)',
      'COS': 'Head of Personal (COS)',
      'Head of Growth': 'Head of Growth (MB)',
      'MB': 'Head of Growth (MB)',
      'ui-agent': 'ui-agent',
      'ux-agent': 'ux-agent',
      'codeur-agent': 'codeur-agent',
      'debugger-agent': 'debugger-agent',
      'media-tech-agent': 'media-tech-agent',
      'monitoring-agent': 'monitoring-agent',
      'backup-agent': 'backup-agent',
      'perso-agent': 'perso-agent',
      'calendar-agent': 'calendar-agent',
      'trend-agent': 'trend-agent',
      'ads-agent': 'ads-agent',
      'report-agent': 'report-agent',
      'pm-agent': 'pm-agent'
    };

    return mappings[name] || name;
  }

  /**
   * Calcule la priorité d'une interaction
   */
  calculatePriority(entry) {
    if (entry.type === 'delegation') return 'high';
    if (entry.type === 'response') return 'medium';
    return 'low';
  }

  /**
   * Récupère les configurations des agents
   */
  async fetchAgentConfigs() {
    if (!this.useRealAPI) {
      return this.fetchAgentConfigsFallback();
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/agents`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const configs = {};
      (data.agents || []).forEach(agent => {
        configs[agent.name] = {
          name: agent.name,
          role: agent.role,
          department: agent.department,
          status: 'active'
        };
      });
      
      return configs;
    } catch (error) {
      console.warn('[Gateway] API agents indisponible:', error.message);
      return this.fetchAgentConfigsFallback();
    }
  }

  fetchAgentConfigsFallback() {
    const configs = {};
    const agents = [
      'orchestrator', 'tech', 'business', 'security', 'personal', 'growth',
      'ui', 'ux', 'codeur', 'debugger', 'media-tech',
      'monitoring', 'backup', 'perso-agent', 'calendar',
      'trend', 'ads', 'report', 'pm'
    ];

    agents.forEach(agent => {
      configs[agent] = { name: agent, status: 'active' };
    });

    return configs;
  }

  /**
   * Récupère les heartbeats des agents
   */
  async fetchHeartbeats() {
    // Calcule les heartbeats à partir des entrées mémoire
    try {
      const memoryData = await this.fetchMemoryData();
      const heartbeats = {};
      const now = Date.now();
      
      const allAgents = ['CEO', 'Head of Tech (CTO)', 'Head of Biz (COO)', 
                         'Head of Security (CISO)', 'Head of Personal (COS)', 
                         'Head of Growth (MB)'];
      allAgents.forEach(agent => {
        heartbeats[agent] = now - 24 * 60 * 60 * 1000;
      });
      
      if (memoryData.recentEntries) {
        memoryData.recentEntries.forEach(entry => {
          if (entry.from) {
            const fromId = this.mapAgentNameToId(entry.from);
            if (fromId) {
              heartbeats[fromId] = Math.max(heartbeats[fromId] || 0, entry.timestamp);
            }
          }
          if (entry.to) {
            const toId = this.mapAgentNameToId(entry.to);
            if (toId) {
              heartbeats[toId] = Math.max(heartbeats[toId] || 0, entry.timestamp);
            }
          }
        });
      }
      
      return heartbeats;
    } catch (error) {
      console.warn('[Gateway] Erreur fetchHeartbeats:', error);
      return {};
    }
  }

  /**
   * Met à jour les statistiques globales
   */
  async updateGlobalStats(memoryData, agentConfigs, heartbeats) {
    // Essaie de récupérer les stats depuis l'API
    if (this.useRealAPI) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stats`);
        if (response.ok) {
          const stats = await response.json();
          this.globalStats = {
            tokens: stats.tokens || 0,
            tasks: stats.tasks || 0,
            activeAgents: stats.activeAgents || 0,
            totalAgents: 19,
            conversations: stats.conversations || 0,
            lastUpdate: Date.now()
          };
          return;
        }
      } catch (error) {
        console.warn('[Gateway] API stats indisponible');
      }
    }
    
    // Fallback: calcule depuis les données locales
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    let activeCount = 0;
    Object.entries(heartbeats).forEach(([agent, lastBeat]) => {
      if (lastBeat > fiveMinutesAgo) {
        activeCount++;
      }
    });

    this.globalStats = {
      tokens: memoryData.files?.reduce((sum, f) => sum + (f.size || 0), 0) || 0,
      tasks: memoryData.recentEntries?.length || 0,
      activeAgents: activeCount,
      totalAgents: 19,
      conversations: memoryData.recentEntries?.length || 0,
      lastUpdate: now
    };
  }

  /**
   * Récupère les stats globales
   */
  getStats() {
    return { ...this.globalStats };
  }

  /**
   * Récupère les données d'un agent spécifique
   */
  getAgentData(agentName) {
    return this.agentData.get(agentName);
  }

  /**
   * Vérifie si un agent est actif (présent)
   */
  isAgentActive(agentName) {
    const lastBeat = this.globalStats.lastUpdate;
    return (Date.now() - lastBeat) < 5 * 60 * 1000;
  }

  /**
   * Récupère l'historique des interactions d'un agent
   */
  getAgentInteractions(agentName, limit = 10) {
    return [];
  }

  /**
   * Force un refresh immédiat
   */
  async forceRefresh() {
    await this.pollData();
  }

  /**
   * Récupère les sessions actives (agents en train de travailler)
   */
  async fetchActiveSessions() {
    if (!this.useRealAPI) {
      return [];
    }
    
    console.log('[Gateway] Récupération des sessions actives...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const sessions = (data.sessions || []).map(session => ({
        agentName: this.extractAgentFromSession(session.id),
        lastActivity: session.lastActivity,
        status: session.active ? 'active' : 'idle'
      }));
      
      console.log(`[Gateway] ${sessions.length} sessions actives trouvées`);
      return sessions;
      
    } catch (error) {
      console.warn('[Gateway] API sessions indisponible:', error.message);
      return [];
    }
  }

  /**
   * Extrait le nom d'agent depuis l'ID de session
   */
  extractAgentFromSession(sessionId) {
    const mappings = {
      'cron': 'System',
      'main': 'CEO'
    };
    
    for (const [key, agent] of Object.entries(mappings)) {
      if (sessionId.includes(key)) return agent;
    }
    
    return 'Unknown';
  }
}

// Singleton export
export const gateway = new Gateway();
