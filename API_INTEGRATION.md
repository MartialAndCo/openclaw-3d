# Dashboard OpenClaw 3D - Intégration Données Réelles

## Architecture

### Structure des modules API

```
src/api/
├── index.js              # Point d'entrée (exports)
├── eventEmitter.js       # EventEmitter pour le browser
├── gateway.js            # Polling des données OpenClaw
├── dataAdapter.js        # Transformation des données
├── delegationTracker.js  # Gestion des déplacements
└── presenceManager.js    # Gestion présence/absence (5min)
```

## Fonctionnalités

### 1. Données Temps Réel (Gateway)
- **Polling**: Toutes les 5 secondes
- **Sources**: Fichiers mémoire, heartbeats, configurations agents
- **Événements**: `data-updated`, `interaction-detected`

### 2. Déplacements Bidirectionnels (DelegationTracker)

**Règle**: Quand un agent A parle à un agent B, A se déplace vers B.

**Types d'interactions**:
- `delegation`: Délégation (CEO → Head, Head → Agent)
- `response`: Réponse (Head → CEO, Agent → Head)
- `report`: Rapport (Agent → Head, Head → CEO)

**File d'attente**:
- Gestion automatique des interactions simultanées
- Priorité: high > medium > low
- Délai entre déplacements: 1 seconde

### 3. Présence (PresenceManager)

**Règle**: Si inactif depuis 5 minutes → l'agent quitte la salle

**États**:
- `present`: Agent visible à son bureau
- `away`: Agent sorti (animation vers la porte)

**Vérification**: Toutes les 30 secondes

### 4. Écrans (ScreenWall)

6 écrans connectés aux données temps réel:
- **Tokens**: Stats d'utilisation
- **Tâches**: Délégations et réponses
- **Activité**: Agents actifs/inactifs
- **CRON**: Jobs planifiés
- **Système**: Métriques système
- **Chat**: Dernières interactions

### 5. Panneau Agent (AgentPanel)

Affichage des données temps réel:
- **Fichiers**: SOUL.md, AGENTS.md, memory/
- **Conversations**: Historique des interactions
- **Tâches**: Tâches actives/terminées
- **Stats**: Tokens, tâches complétées, délégations

## Utilisation

### Démarrer le système

```javascript
// Main.js initialise automatiquement:
initRealtimeSystem();
```

### Tester une délégation manuelle

```javascript
// Dans la console du navigateur:
_delegationTracker.forceDelegation('CEO', 'Head of Tech (CTO)');
_delegationTracker.forceDelegation('Head of Tech (CTO)', 'ui-agent');
```

### Tester la présence

```javascript
// Forcer un agent à partir:
_presenceManager.forceLeave('ui-agent');

// Forcer un agent à revenir:
_presenceManager.forceReturn('ui-agent');
```

### Voir l'état du système

```javascript
// Statistiques globales
_gateway.getStats();

// État de la file d'attente
_delegationTracker.getQueueStatus();

// Agents présents/absents
_presenceManager.getStatus();
```

## Mapping des noms

### CEO
- `Orchestrator` → `CEO`
- `CEO` → `CEO`

### Heads
- `Head of Tech`, `CTO` → `Head of Tech (CTO)`
- `Head of Business`, `COO` → `Head of Biz (COO)`
- `Head of Security`, `CISO` → `Head of Security (CISO)`
- `Head of Personal`, `COS` → `Head of Personal (COS)`
- `Head of Growth`, `MB` → `Head of Growth (MB)`

### Agents
- `ui` → `ui-agent`
- `ux` → `ux-agent`
- `codeur` → `codeur-agent`
- `debugger` → `debugger-agent`
- etc.

## Routes Prédéfinies

Toutes les routes sont définies dans `src/routes.js`:

- `ceoToCTO`, `ceoToCOO`, `ceoToCISO`, `ceoToCOS`, `ceoToMB`
- `ctoToUI`, `ctoToUX`, `ctoToCodeur`, etc.
- `cisoToMonitoring`, `cisoToBackup`, etc.
- Routes de retour: `cisoToCEO`, `ctoToCEO`, etc.
- Routes de sortie: `uiAgentToDoor`, `codeurAgentToDoor`, etc.
- Routes d'entrée: `doorToUIAgent`, `doorToCodeurAgent`, etc.

## Prochaines Étapes

1. **Connecteur réel**: Remplacer les données simulées par des appels à l'API OpenClaw
2. **Persistance**: Sauvegarder l'état du dashboard entre les sessions
3. **Notifications**: Alertes visuelles pour les événements importants
4. **Historique**: Graphiques d'activité sur 24h/7j
