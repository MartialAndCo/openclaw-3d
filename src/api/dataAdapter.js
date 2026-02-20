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
      title: 'Tokens',
      value: stats.tokens.toLocaleString(),
      trend: this.calculateTrend(stats.tokens, stats.previousTokens),
      breakdown: [
        { label: 'CEO', value: Math.floor(stats.tokens * 0.05) },
        { label: 'Heads', value: Math.floor(stats.tokens * 0.25) },
        { label: 'Agents', value: Math.floor(stats.tokens * 0.70) }
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
      title: 'Tâches',
      value: stats.tasks,
      trend: this.calculateTrend(stats.tasks, stats.previousTasks),
      breakdown: [
        { label: 'Délégations', value: delegations },
        { label: 'Réponses', value: responses },
        { label: 'En cours', value: interactions.length }
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

    // Détermine le statut de chaque agent
    const agentStatus = {};
    Object.entries(heartbeats).forEach(([agent, lastBeat]) => {
      const inactive = now - lastBeat > INACTIVITY_THRESHOLD;
      agentStatus[agent] = inactive ? 'away' : 'active';
    });

    return {
      title: 'Activité',
      value: `${stats.activeAgents}/${stats.totalAgents}`,
      agents: agentStatus,
      trend: stats.activeAgents > stats.totalAgents / 2 ? 'up' : 'down'
    };
  }

  /**
   * Formatage des stats CRON
   */
  formatCronStats(data) {
    return {
      title: 'CRON',
      value: 'OK',
      jobs: [
        { name: 'Heartbeat', status: 'running', interval: '5s' },
        { name: 'Memory Clean', status: 'pending', interval: '1h' },
        { name: 'Backup', status: 'ok', interval: '24h' }
      ]
    };
  }

  /**
   * Formatage des stats système
   */
  formatSystemStats(data) {
    return {
      title: 'Système',
      value: 'OK',
      metrics: [
        { label: 'CPU', value: '12%' },
        { label: 'RAM', value: '45%' },
        { label: 'Disk', value: '67%' }
      ]
    };
  }

  /**
   * Formatage des stats chat
   */
  formatChatStats(data) {
    const interactions = data.interactions || [];
    
    return {
      title: 'Chat',
      value: interactions.length,
      recent: interactions.slice(0, 5).map(i => ({
        from: i.from,
        to: i.to,
        type: i.type,
        time: new Date(i.timestamp).toLocaleTimeString()
      }))
    };
  }

  /**
   * Transforme les données pour le panneau agent
   */
  toAgentPanelData(agentName) {
    const agentData = gateway.getAgentData(agentName);
    const heartbeats = gateway.fetchHeartbeats(); // À optimiser
    
    const now = Date.now();
    const lastActivity = heartbeats[agentName] || now;
    const inactiveTime = now - lastActivity;

    return {
      name: agentName,
      status: inactiveTime > INACTIVITY_THRESHOLD ? 'away' : 'active',
      lastSeen: this.formatTimeAgo(lastActivity),
      files: this.getAgentFiles(agentName),
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
   * Récupère les fichiers d'un agent
   */
  getAgentFiles(agentName) {
    // En production: lire le workspace de l'agent
    return [
      { name: 'SOUL.md', type: 'config', size: '2.1 KB', modified: '2h ago' },
      { name: 'AGENTS.md', type: 'config', size: '1.5 KB', modified: '1d ago' },
      { name: 'memory/', type: 'folder', count: 12 }
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
