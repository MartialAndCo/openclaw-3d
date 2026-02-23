/**
 * Gateway API - Interface entre OpenClaw réel et le Dashboard 3D
 * Polling toutes les 5 secondes pour récupérer les données temps réel via api_server.py
 */

import { EventEmitter } from './eventEmitter.js';

const API_BASE_URL = 'http://localhost:5000';

class Gateway extends EventEmitter {
  constructor() {
    super();
    this.pollingInterval = null;
    this.POLLING_DELAY = 5000; // 5 secondes
    this.agentData = new Map();
    this.globalStats = {
      tokens: 0,
      tasks: 0,
      activeAgents: 0,
      conversations: [],
      lastUpdate: null
    };

    // Mapping exact des noms OpenClaw (session keys) vers les noms 3D du Dashboard 
    this.agentMappings = {
      'orchestrator': 'CEO',
      'main': 'CEO',
      'head_of_tech': 'Head of Tech (CTO)',
      'tech': 'Head of Tech (CTO)',
      'head_of_business': 'Head of Biz (COO)',
      'head_of_security': 'Head of Security (CISO)',
      'head_of_personal': 'Head of Personal (COS)',
      'head_of_growth': 'Head of Growth (MB)',
      'ui_agent': 'ui-agent',
      'ux_agent': 'ux-agent',
      'codeur': 'codeur-agent',
      'debugger': 'debugger-agent',
      'media_tech': 'media-tech-agent',
      'monitoring': 'monitoring-agent',
      'backup': 'backup-agent',
      'perso': 'perso-agent',
      'calendar': 'calendar-agent',
      'trend': 'trend-agent',
      'ads': 'ads-agent',
      'report': 'report-agent',
      'pm': 'pm-agent',
      'cron': 'System'
    };
  }

  startPolling() {
    if (this.pollingInterval) return;

    console.log('[Gateway] Démarrage du polling local...');
    this.pollData();

    this.pollingInterval = setInterval(() => {
      this.pollData();
    }, this.POLLING_DELAY);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('[Gateway] Polling arrêté');
    }
  }

  async pollData() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      this.processProxyData(data);

    } catch (error) {
      console.error('[Gateway] Erreur polling from Local API Server:', error);
      this.emit('error', error);
    }
  }

  processProxyData(proxyData) {
    if (!proxyData || proxyData.status !== 'ok') return;
    const timestamp = Date.now();
    let rawSessions = [];

    // Extract parsed text if present
    const sessionsObj = proxyData.sessions;
    if (sessionsObj && sessionsObj.content && sessionsObj.content.length > 0) {
      const textParsed = sessionsObj.content[0].text_parsed;
      if (textParsed && textParsed.sessions) {
        rawSessions = textParsed.sessions;
      }
    }

    // Process Heartbeats and Active Agents
    let activeCount = 0;
    const currentActiveList = [];

    rawSessions.forEach(session => {
      // session.key looks like "agent:main:main" or "agent:tech:head_of_tech"
      const parts = (session.key || '').split(':');
      const scope = parts.length > 2 ? parts[2] : (parts[1] || 'unknown');

      let dashboardName = this.extractAgentFromSession(scope);

      if (dashboardName !== 'Unknown' && dashboardName !== 'System') {
        activeCount++;
        currentActiveList.push(dashboardName);

        this.agentData.set(dashboardName, {
          name: dashboardName,
          lastActivity: timestamp,
          status: 'active',
          openclawKey: session.key
        });
      }
    });

    this.globalStats = {
      tokens: Math.floor(Math.random() * 5000), // Placeholder until proxy gets it
      tasks: rawSessions.length,
      activeAgents: activeCount,
      totalAgents: 19,
      conversations: activeCount,
      lastUpdate: timestamp
    };

    const interactions = this.detectInteractions(currentActiveList);

    this.emit('data-updated', {
      timestamp: new Date(timestamp),
      interactions,
      stats: this.globalStats,
      agents: Object.fromEntries(this.agentData)
    });

    interactions.forEach(interaction => {
      this.emit('interaction-detected', interaction);
    });
  }

  detectInteractions(activeAgentsList) {
    // We emit mock interactions to see triggers for now based on purely who is active online
    const interactions = [];

    // Example: If CEO & Tech are online, maybe a delegation happened today
    if (activeAgentsList.includes("CEO") && activeAgentsList.includes("Head of Tech (CTO)")) {
      if (Math.random() > 0.9) {
        interactions.push({
          from: 'CEO',
          to: 'Head of Tech (CTO)',
          type: 'delegation',
          content: 'Check technical constraints for new feature',
          timestamp: Date.now()
        });
      }
    }

    return interactions;
  }

  getStats() {
    return { ...this.globalStats };
  }

  getAgentData(agentName) {
    return this.agentData.get(agentName);
  }

  isAgentActive(agentName) {
    const data = this.agentData.get(agentName);
    if (!data) return false;
    return (Date.now() - data.lastActivity) < 5 * 60 * 1000;
  }

  extractAgentFromSession(scopeKey) {
    for (const [key, dashboardName] of Object.entries(this.agentMappings)) {
      if (scopeKey.includes(key) || scopeKey === key) return dashboardName;
    }
    return 'Unknown';
  }

  async fetchActiveSessions() {
    const active = [];
    for (const [name, data] of this.agentData.entries()) {
      if (this.isAgentActive(name)) {
        active.push({
          agentName: name,
          lastActivity: data.lastActivity,
          status: 'active'
        });
      }
    }
    return active;
  }
}

export const gateway = new Gateway();
