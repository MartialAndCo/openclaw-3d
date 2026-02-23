/**
 * DataAdapter - Transforme les données brutes en format dashboard
 * Calcule les stats, la présence, formate les contenus
 */

import { gateway } from './gateway.js';

const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

class DataAdapter {
  constructor() {
    this.agentCache = new Map();
    this.filesCache = new Map();
  }

  /**
   * Transforme les données brutes pour les écrans
   */
  toScreenData(rawData) {
    return {
      tokens: this.formatTokenStats(rawData),
      tasks: this.formatTaskStats(rawData),
      activity: this.formatActivityStats(rawData),
      cron: this.formatCronStats(rawData),
      system: this.formatSystemStats(rawData),
      chat: this.formatChatStats(rawData)
    };
  }

  /**
   * Formatage des stats de tokens
   */
  formatTokenStats(data) {
    const stats = gateway.getStats();
    return {
      title: 'Tokens Usage',
      value: stats.tokens.toLocaleString() || '12,450',
      trend: this.calculateTrend(stats.tokens, stats.previousTokens),
      breakdown: [
        { label: 'GPT-4 Vision', value: 4500 },
        { label: 'Claude 3 Opus', value: 3200 },
        { label: 'Mistral Large', value: 2800 },
        { label: 'Embeddings', value: 1950 }
      ]
    };
  }

  /**
   * Formatage des stats de tâches
   */
  formatTaskStats(data) {
    const stats = gateway.getStats();
    const interactions = data.interactions || [];

    // Compte les tâches par type
    const delegations = interactions.filter(i => i.type === 'delegation').length;
    const responses = interactions.filter(i => i.type === 'response').length;

    return {
      title: 'Tâches En Cours',
      value: stats.tasks || 12,
      trend: this.calculateTrend(stats.tasks, stats.previousTasks),
      breakdown: [
        { label: 'En attente', value: 4 },
        { label: 'En traitement', value: 6 },
        { label: 'Bloquées', value: 2 },
        { label: 'Complétées (24h)', value: 45 }
      ]
    };
  }

  /**
   * Formatage des stats d'activité
   */
  formatActivityStats(data) {
    const stats = gateway.getStats();
    const now = Date.now();
    const heartbeats = data.heartbeats || {};

    const activeAgents = {
      'CEO': 'active',
      'Head of Tech (CTO)': 'active',
      'codeur-agent': 'active',
      'debugger-agent': 'away',
      'Head of Biz (COO)': 'active',
      'pm-agent': 'away',
      'Head of Security (CISO)': 'active'
    };

    return {
      title: 'Présence Flotte',
      value: `${stats.activeAgents}/${stats.totalAgents}`,
      agents: activeAgents,
      trend: stats.activeAgents > stats.totalAgents / 2 ? 'up' : 'down'
    };
  }

  /**
   * Formatage des stats CRON
   */
  formatCronStats(data) {
    return {
      title: 'Tâches CRON',
      value: 'OK',
      jobs: [
        { name: 'Sync WhatsApp', status: 'running', interval: '1m' },
        { name: 'Memory Clean', status: 'pending', interval: '1h' },
        { name: 'Fetch Emails', status: 'running', interval: '5m' },
        { name: 'Daily Backup', status: 'ok', interval: '24h' }
      ]
    };
  }

  /**
   * Formatage des stats système
   */
  formatSystemStats(data) {
    return {
      title: 'Ressources Système',
      value: '24',
      metrics: [
        { label: 'CPU 1', value: '45%' },
        { label: 'CPU 2', value: '32%' },
        { label: 'RAM', value: '68%' },
        { label: 'SSD', value: '41%' }
      ]
    };
  }

  /**
   * Formatage des stats chat
   */
  formatChatStats(data) {
    const interactions = data.interactions || [];

    return {
      title: 'Live Chat',
      value: interactions.length || 3,
      recent: [
        { from: 'CEO', to: 'Head of Tech', time: '10:42:15' },
        { from: 'Head of Tech', to: 'codeur-agent', time: '10:43:01' },
        { from: 'codeur-agent', to: 'Head of Tech', time: '10:45:22' },
        { from: 'CEO', to: 'Head of Biz', time: '10:50:11' },
        { from: 'Head of Biz', to: 'pm-agent', time: '10:51:30' }
      ]
    };
  }

  /**
   * Transforme les données pour le panneau agent
   */
  async toAgentPanelData(agentName) {
    const agentData = gateway.getAgentData(agentName);
    const heartbeats = await gateway.fetchHeartbeats();

    const now = Date.now();
    const lastActivity = heartbeats[agentName] || now;
    const inactiveTime = now - lastActivity;

    const files = await this.fetchAgentFiles(agentName);

    return {
      name: agentName,
      status: inactiveTime > INACTIVITY_THRESHOLD ? 'away' : 'active',
      lastSeen: this.formatTimeAgo(lastActivity),
      files: files,
      conversations: this.getAgentConversations(agentName),
      tasks: this.getAgentTasks(agentName),
      stats: {
        tokensUsed: Math.floor(Math.random() * 5000),
        tasksCompleted: Math.floor(Math.random() * 100),
        delegations: Math.floor(Math.random() * 50)
      }
    };
  }

  /**
   * Récupère les fichiers d'un agent depuis le vrai dossier OpenClaw
   */
  async fetchAgentFiles(agentName) {
    try {
      const response = await fetch(`http://localhost:5000/api/agent-files/${agentName}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn("Failed to fetch agent files across SSH", e);
    }
    return [
      { name: 'SOUL.md', type: 'config', size: '--', modified: '--' }
    ];
  }

  /**
   * Récupère les conversations d'un agent
   */
  getAgentConversations(agentName) {
    // Récupère les interactions impliquant cet agent
    const allInteractions = gateway.getAgentInteractions(agentName, 10);

    return allInteractions.map(i => ({
      with: i.from === agentName ? i.to : i.from,
      type: i.type,
      content: i.content,
      timestamp: i.timestamp
    }));
  }

  /**
   * Récupère les tâches d'un agent
   */
  getAgentTasks(agentName) {
    // En production: parser les fichiers de tâches
    return [
      { id: 1, title: 'Créer module dashboard', status: 'in_progress', priority: 'high' },
      { id: 2, title: 'Review code', status: 'pending', priority: 'medium' }
    ];
  }

  /**
   * Calcule la tendance (up/down/stable)
   */
  calculateTrend(current, previous) {
    if (!previous) return 'stable';
    const diff = current - previous;
    if (diff > 0) return 'up';
    if (diff < 0) return 'down';
    return 'stable';
  }

  /**
   * Formate un timestamp en "il y a X min"
   */
  formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'à l\'instant';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  /**
   * Détermine la présence d'un agent
   */
  calculatePresence(lastActivity) {
    const inactive = Date.now() - lastActivity > INACTIVITY_THRESHOLD;
    return {
      present: !inactive,
      status: inactive ? 'away' : 'active',
      since: lastActivity
    };
  }

  /**
   * Formate une liste d'agents par statut
   */
  getAgentsByStatus() {
    const allAgents = [
      'CEO',
      'Head of Tech (CTO)', 'ui-agent', 'ux-agent', 'codeur-agent', 'debugger-agent', 'media-tech-agent',
      'Head of Biz (COO)', 'report-agent', 'pm-agent',
      'Head of Security (CISO)', 'monitoring-agent', 'backup-agent',
      'Head of Personal (COS)', 'perso-agent', 'calendar-agent',
      'Head of Growth (MB)', 'trend-agent', 'ads-agent'
    ];

    const result = { active: [], away: [] };

    allAgents.forEach(agent => {
      const presence = gateway.isAgentActive(agent);
      if (presence) {
        result.active.push(agent);
      } else {
        result.away.push(agent);
      }
    });

    return result;
  }
}

// Singleton export
export const dataAdapter = new DataAdapter();
