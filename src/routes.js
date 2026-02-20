/**
 * ROUTES PRÉDÉFINIES - OpenClaw
 * Toutes les routes possibles dans l'office
 */

export const PREDEFINED_ROUTES = {
    // ===== CEO → HEADS =====
    ceoToCISO: {
        id: 'ceo_to_ciso',
        name: 'CEO → Head of Security (CISO)',
        startName: 'CEO',
        endName: 'Head of Security (CISO)',
        points: [
            { x: -0.698, z: -5.043 },
            { x: -4.503, z: -4.675 }
        ],
        finalOrientation: -1.530
    },

    ceoToCOO: {
        id: 'ceo_to_coo',
        name: 'CEO → Head of Biz (COO)',
        startName: 'CEO',
        endName: 'Head of Biz (COO)',
        points: [
            { x: -0.706, z: -5.040 },
            { x: -1.625, z: -4.765 },
            { x: -3.359, z: -2.820 }
        ],
        finalOrientation: -0.762
    },

    ceoToCTO: {
        id: 'ceo_to_cto',
        name: 'CEO → Head of Tech (CTO)',
        startName: 'CEO',
        endName: 'Head of Tech (CTO)',
        points: [
            { x: -0.685, z: -5.022 },
            { x: -1.160, z: -4.927 },
            { x: -1.203, z: -3.711 },
            { x: -0.325, z: -2.411 }
        ],
        finalOrientation: 0.086
    },

    ceoToCOS: {
        id: 'ceo_to_cos',
        name: 'CEO → Head of Personal (COS)',
        startName: 'CEO',
        endName: 'Head of Personal (COS)',
        points: [
            { x: 0.108, z: -5.017 },
            { x: 0.635, z: -4.851 },
            { x: 2.869, z: -2.631 }
        ],
        finalOrientation: 0.786
    },

    ceoToMB: {
        id: 'ceo_to_mb',
        name: 'CEO → Head of Growth (MB)',
        startName: 'CEO',
        endName: 'Head of Growth (MB)',
        points: [
            { x: 0.117, z: -5.017 },
            { x: 4.150, z: -4.338 }
        ],
        finalOrientation: 1.334
    },

    // ===== HEADS → CEO (RETOURS) =====
    cisoToCEO: {
        id: 'ciso_to_ceo',
        name: 'Head of Security (CISO) → CEO',
        startName: 'Head of Security (CISO)',
        endName: 'CEO',
        points: [
            { x: -5.860, z: -4.317 },
            { x: -5.860, z: -3.863 },
            { x: -5.272, z: -3.641 },
            { x: -0.313, z: -3.840 }
        ],
        finalOrientation: 3.053
    },

    cooToCEO: {
        id: 'coo_to_ceo',
        name: 'Head of Biz (COO) → CEO',
        startName: 'Head of Biz (COO)',
        endName: 'CEO',
        points: [
            { x: -4.040, z: -1.611 },
            { x: -3.763, z: -1.367 },
            { x: -3.319, z: -1.389 },
            { x: -0.302, z: -3.840 }
        ],
        finalOrientation: 3.071
    },

    ctoToCEO: {
        id: 'cto_to_ceo',
        name: 'Head of Tech (CTO) → CEO',
        startName: 'Head of Tech (CTO)',
        endName: 'CEO',
        points: [
            { x: 0.042, z: -1.001 },
            { x: 0.519, z: -1.056 },
            { x: 0.729, z: -1.356 },
            { x: 0.752, z: -1.810 },
            { x: -0.280, z: -3.785 }
        ],
        finalOrientation: 3.108
    },

    cosToCEO: {
        id: 'cos_to_ceo',
        name: 'Head of Personal (COS) → CEO',
        startName: 'Head of Personal (COS)',
        endName: 'CEO',
        points: [
            { x: 3.625, z: -1.334 },
            { x: 3.414, z: -1.089 },
            { x: 3.148, z: -0.979 },
            { x: -0.247, z: -3.752 }
        ],
        finalOrientation: -3.128
    },

    mbToCEO: {
        id: 'mb_to_ceo',
        name: 'Head of Growth (MB) → CEO',
        startName: 'Head of Growth (MB)',
        endName: 'CEO',
        points: [
            { x: 5.531, z: -3.625 },
            { x: 5.311, z: -3.290 },
            { x: 4.952, z: -3.128 },
            { x: 4.570, z: -3.047 },
            { x: -0.245, z: -3.672 }
        ],
        finalOrientation: -3.127
    },

    // ===== HEADS → LEURS AGENTS =====
    cisoToMonitoring: {
        id: 'ciso_to_monitoring',
        name: 'Head of Security (CISO) → monitoring-agent',
        startName: 'Head of Security (CISO)',
        endName: 'monitoring-agent',
        points: [
            { x: -5.887, z: -4.353 },
            { x: -6.865, z: -4.349 },
            { x: -7.860, z: -4.028 }
        ],
        finalOrientation: -0.809
    },

    cisoToBackup: {
        id: 'ciso_to_backup',
        name: 'Head of Security (CISO) → backup-agent',
        startName: 'Head of Security (CISO)',
        endName: 'backup-agent',
        points: [
            { x: -5.880, z: -4.906 },
            { x: -7.132, z: -4.798 },
            { x: -8.310, z: -4.392 }
        ],
        finalOrientation: -0.889
    },

    cooToReport: {
        id: 'coo_to_report',
        name: 'Head of Biz (COO) → report-agent',
        startName: 'Head of Biz (COO)',
        endName: 'report-agent',
        points: [
            { x: -4.450, z: -2.094 },
            { x: -5.497, z: -1.153 }
        ],
        finalOrientation: -0.629
    },

    cooToPM: {
        id: 'coo_to_pm',
        name: 'Head of Biz (COO) → pm-agent',
        startName: 'Head of Biz (COO)',
        endName: 'pm-agent',
        points: [
            { x: -4.025, z: -1.679 },
            { x: -4.985, z: -0.846 }
        ],
        finalOrientation: -0.615
    },

    ctoToUI: {
        id: 'cto_to_ui',
        name: 'Head of Tech (CTO) → ui-agent',
        startName: 'Head of Tech (CTO)',
        endName: 'ui-agent',
        points: [
            { x: -0.539, z: -1.009 },
            { x: -1.161, z: -0.616 }
        ],
        finalOrientation: 0.009
    },

    ctoToUX: {
        id: 'cto_to_ux',
        name: 'Head of Tech (CTO) → ux-agent',
        startName: 'Head of Tech (CTO)',
        endName: 'ux-agent',
        points: [
            { x: 0.082, z: -1.022 },
            { x: 0.640, z: -0.604 }
        ],
        finalOrientation: 0.130
    },

    ctoToCodeur: {
        id: 'cto_to_codeur',
        name: 'Head of Tech (CTO) → codeur-agent',
        startName: 'Head of Tech (CTO)',
        endName: 'codeur-agent',
        points: [
            { x: 0.082, z: -0.984 },
            { x: 0.170, z: 1.349 }
        ],
        finalOrientation: 0.952
    },

    ctoToDebugger: {
        id: 'cto_to_debugger',
        name: 'Head of Tech (CTO) → debugger-agent',
        startName: 'Head of Tech (CTO)',
        endName: 'debugger-agent',
        points: [
            { x: 0.069, z: -1.009 },
            { x: -0.108, z: 1.323 }
        ],
        finalOrientation: -0.098
    },

    ctoToMediaTech: {
        id: 'cto_to_mediatech',
        name: 'Head of Tech (CTO) → media-tech-agent',
        startName: 'Head of Tech (CTO)',
        endName: 'media-tech-agent',
        points: [
            { x: -0.552, z: -1.022 },
            { x: -0.616, z: 1.323 }
        ],
        finalOrientation: -0.857
    },

    mbToTrend: {
        id: 'mb_to_trend',
        name: 'Head of Growth (MB) → trend-agent',
        startName: 'Head of Growth (MB)',
        endName: 'trend-agent',
        points: [
            { x: 5.697, z: -4.251 },
            { x: 7.465, z: -3.567 }
        ],
        finalOrientation: 0.897
    },

    mbToAds: {
        id: 'mb_to_ads',
        name: 'Head of Growth (MB) → ads-agent',
        startName: 'Head of Growth (MB)',
        endName: 'ads-agent',
        points: [
            { x: 5.716, z: -4.251 },
            { x: 8.036, z: -3.947 }
        ],
        finalOrientation: 0.878
    },

    cosToPerso: {
        id: 'cos_to_perso',
        name: 'Head of Personal (COS) → perso-agent',
        startName: 'Head of Personal (COS)',
        endName: 'perso-agent',
        points: [
            { x: 4.177, z: -1.791 },
            { x: 6.490, z: -0.659 }
        ],
        finalOrientation: 0.148
    },

    cosToCalendar: {
        id: 'cos_to_calendar',
        name: 'Head of Personal (COS) → calendar-agent',
        startName: 'Head of Personal (COS)',
        endName: 'calendar-agent',
        points: [
            { x: 4.160, z: -1.807 },
            { x: 7.139, z: -0.609 }
        ],
        finalOrientation: 0.153
    },

    // ===== AGENTS → PORTE (SORTIE) =====
    // Business Agents
    reportAgentToDoor: {
        id: 'report_agent_to_door',
        name: 'report-agent → 🚪 PORTE SORTIE',
        startName: 'report-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: -6.189, z: -0.202 },
            { x: -4.000, z: 0 },
            { x: -2.000, z: -3.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    pmAgentToDoor: {
        id: 'pm_agent_to_door',
        name: 'pm-agent → 🚪 PORTE SORTIE',
        startName: 'pm-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: -5.694, z: 0.157 },
            { x: -4.000, z: 0 },
            { x: -2.000, z: -3.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    // Security Agents
    monitoringAgentToDoor: {
        id: 'monitoring_agent_to_door',
        name: 'monitoring-agent → 🚪 PORTE SORTIE',
        startName: 'monitoring-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: -8.688, z: -3.238 },
            { x: -6.000, z: -3.500 },
            { x: -2.000, z: -3.500 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    backupAgentToDoor: {
        id: 'backup_agent_to_door',
        name: 'backup-agent → 🚪 PORTE SORTIE',
        startName: 'backup-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: -9.153, z: -3.708 },
            { x: -6.000, z: -3.500 },
            { x: -2.000, z: -3.500 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    // Tech Agents
    uiAgentToDoor: {
        id: 'ui_agent_to_door',
        name: 'ui-agent → 🚪 PORTE SORTIE',
        startName: 'ui-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: -1.151, z: 0.493 },
            { x: -0.500, z: -1.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    uxAgentToDoor: {
        id: 'ux_agent_to_door',
        name: 'ux-agent → 🚪 PORTE SORTIE',
        startName: 'ux-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: 0.782, z: 0.489 },
            { x: 0.500, z: -1.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    codeurAgentToDoor: {
        id: 'codeur_agent_to_door',
        name: 'codeur-agent → 🚪 PORTE SORTIE',
        startName: 'codeur-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: 0.785, z: 1.786 },
            { x: 0.500, z: -1.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    debuggerAgentToDoor: {
        id: 'debugger_agent_to_door',
        name: 'debugger-agent → 🚪 PORTE SORTIE',
        startName: 'debugger-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: -0.186, z: 2.11 },
            { x: -0.500, z: -1.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    mediaTechAgentToDoor: {
        id: 'mediatech_agent_to_door',
        name: 'media-tech-agent → 🚪 PORTE SORTIE',
        startName: 'media-tech-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: -1.149, z: 1.785 },
            { x: -0.500, z: -1.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    // Personal Agents
    persoAgentToDoor: {
        id: 'perso_agent_to_door',
        name: 'perso-agent → 🚪 PORTE SORTIE',
        startName: 'perso-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: 6.664, z: 0.511 },
            { x: 4.000, z: 0 },
            { x: 2.000, z: -3.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    calendarAgentToDoor: {
        id: 'calendar_agent_to_door',
        name: 'calendar-agent → 🚪 PORTE SORTIE',
        startName: 'calendar-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: 7.312, z: 0.515 },
            { x: 4.000, z: 0 },
            { x: 2.000, z: -3.000 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    // Growth Agents
    trendAgentToDoor: {
        id: 'trend_agent_to_door',
        name: 'trend-agent → 🚪 PORTE SORTIE',
        startName: 'trend-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: 8.43, z: -2.796 },
            { x: 6.000, z: -3.500 },
            { x: 2.000, z: -3.500 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    adsAgentToDoor: {
        id: 'ads_agent_to_door',
        name: 'ads-agent → 🚪 PORTE SORTIE',
        startName: 'ads-agent',
        endName: '🚪 PORTE SORTIE',
        points: [
            { x: 8.886, z: -3.242 },
            { x: 6.000, z: -3.500 },
            { x: 2.000, z: -3.500 },
            { x: 0, z: 5.9 }
        ],
        finalOrientation: 1.571
    },

    // ===== PORTE → AGENTS (ENTRÉE) =====
    // Business Agents
    doorToReportAgent: {
        id: 'door_to_report_agent',
        name: '🚪 PORTE SORTIE → report-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'report-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: -2.000, z: -3.000 },
            { x: -4.000, z: 0 },
            { x: -6.189, z: -0.202 }
        ],
        finalOrientation: 0.96
    },

    doorToPmAgent: {
        id: 'door_to_pm_agent',
        name: '🚪 PORTE SORTIE → pm-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'pm-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: -2.000, z: -3.000 },
            { x: -4.000, z: 0 },
            { x: -5.694, z: 0.157 }
        ],
        finalOrientation: -2.182
    },

    // Security Agents
    doorToMonitoringAgent: {
        id: 'door_to_monitoring_agent',
        name: '🚪 PORTE SORTIE → monitoring-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'monitoring-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: -2.000, z: -3.500 },
            { x: -6.000, z: -3.500 },
            { x: -8.688, z: -3.238 }
        ],
        finalOrientation: 0.785
    },

    doorToBackupAgent: {
        id: 'door_to_backup_agent',
        name: '🚪 PORTE SORTIE → backup-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'backup-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: -2.000, z: -3.500 },
            { x: -6.000, z: -3.500 },
            { x: -9.153, z: -3.708 }
        ],
        finalOrientation: -2.356
    },

    // Tech Agents
    doorToUiAgent: {
        id: 'door_to_ui_agent',
        name: '🚪 PORTE SORTIE → ui-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'ui-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: -0.500, z: -1.000 },
            { x: -1.151, z: 0.493 }
        ],
        finalOrientation: -1.571
    },

    doorToUxAgent: {
        id: 'door_to_ux_agent',
        name: '🚪 PORTE SORTIE → ux-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'ux-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: 0.500, z: -1.000 },
            { x: 0.782, z: 0.489 }
        ],
        finalOrientation: 1.571
    },

    doorToCodeurAgent: {
        id: 'door_to_codeur_agent',
        name: '🚪 PORTE SORTIE → codeur-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'codeur-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: 0.500, z: -1.000 },
            { x: 0.785, z: 1.786 }
        ],
        finalOrientation: 1.571
    },

    doorToDebuggerAgent: {
        id: 'door_to_debugger_agent',
        name: '🚪 PORTE SORTIE → debugger-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'debugger-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: -0.500, z: -1.000 },
            { x: -0.186, z: 2.11 }
        ],
        finalOrientation: 0
    },

    doorToMediaTechAgent: {
        id: 'door_to_mediatech_agent',
        name: '🚪 PORTE SORTIE → media-tech-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'media-tech-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: -0.500, z: -1.000 },
            { x: -1.149, z: 1.785 }
        ],
        finalOrientation: -1.571
    },

    // Personal Agents
    doorToPersoAgent: {
        id: 'door_to_perso_agent',
        name: '🚪 PORTE SORTIE → perso-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'perso-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: 2.000, z: -3.000 },
            { x: 4.000, z: 0 },
            { x: 6.664, z: 0.511 }
        ],
        finalOrientation: -1.571
    },

    doorToCalendarAgent: {
        id: 'door_to_calendar_agent',
        name: '🚪 PORTE SORTIE → calendar-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'calendar-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: 2.000, z: -3.000 },
            { x: 4.000, z: 0 },
            { x: 7.312, z: 0.515 }
        ],
        finalOrientation: 1.571
    },

    // Growth Agents
    doorToTrendAgent: {
        id: 'door_to_trend_agent',
        name: '🚪 PORTE SORTIE → trend-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'trend-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: 2.000, z: -3.500 },
            { x: 6.000, z: -3.500 },
            { x: 8.43, z: -2.796 }
        ],
        finalOrientation: -0.785
    },

    doorToAdsAgent: {
        id: 'door_to_ads_agent',
        name: '🚪 PORTE SORTIE → ads-agent',
        startName: '🚪 PORTE SORTIE',
        endName: 'ads-agent',
        points: [
            { x: 0, z: 5.9 },
            { x: 2.000, z: -3.500 },
            { x: 6.000, z: -3.500 },
            { x: 8.886, z: -3.242 }
        ],
        finalOrientation: 2.356
    },

    // ===== WAR ROOM CHAIRS (6 chaises autour de la table à -8, 3) =====
    // Routes avec MULTIPLES waypoints depuis le fichier de configuration

    // CEO → Chaise 1 (4 points)
    ceoToWarRoomChair1: {
        id: 'ceo_to_warroom_chair1',
        name: 'CEO → 🪑 War Room Chaise 1',
        startName: 'CEO',
        endName: '🪑 War Room Chaise 1',
        points: [
            { x: -0.719, z: -5.012 },
            { x: -1.858, z: -5.049 },
            { x: -2.073, z: -3.321 },
            { x: -2.439, z: -2.044 },
            { x: -3.742, z: 1.611 },
            { x: -6.65, z: 3 }
        ],
        finalOrientation: 1.5707963267948966, // Math.PI/2 - 0
        isWarRoom: true,
        chairIndex: 0
    },

    // CEO → Chaise 2 (via route existante)
    ceoToWarRoomChair2: {
        id: 'ceo_to_warroom_chair2',
        name: 'CEO → 🪑 War Room Chaise 2',
        startName: 'CEO',
        endName: '🪑 War Room Chaise 2',
        points: [
            { x: -0.719, z: -5.012 },
            { x: -1.858, z: -5.049 },
            { x: -2.073, z: -3.321 },
            { x: -2.439, z: -2.044 },
            { x: -4.368, z: 0.796 },
            { x: -5.747, z: 3.599 },
            { x: -7.325, z: 4.169 }
        ],
        finalOrientation: 0.5235987755982988, // Math.PI/2 - Math.PI/3
        isWarRoom: true,
        chairIndex: 1
    },

    // CISO → Chaise 6 (4 points)
    cisoToWarRoomChair6: {
        id: 'ciso_to_warroom_chair6',
        name: 'Head of Security (CISO) → 🪑 War Room Chaise 6',
        startName: 'Head of Security (CISO)',
        endName: '🪑 War Room Chaise 6',
        points: [
            { x: -5.902, z: -4.326 },
            { x: -7.572, z: -1.631 },
            { x: -7.888, z: -0.286 },
            { x: -7.325, z: 1.831 }
        ],
        finalOrientation: 2.6179938779914944, // Math.PI/2 - (5*Math.PI/3) => -1.047
        isWarRoom: true,
        chairIndex: 5
    },

    // COO → Chaise 2 (4 points)
    cooToWarRoomChair2: {
        id: 'coo_to_warroom_chair2',
        name: 'Head of Biz (COO) → 🪑 War Room Chaise 2',
        startName: 'Head of Biz (COO)',
        endName: '🪑 War Room Chaise 2',
        points: [
            { x: -4.052, z: -1.622 },
            { x: -4.369, z: 0.796 },
            { x: -5.747, z: 3.599 },
            { x: -7.325, z: 4.169 }
        ],
        finalOrientation: 0.5235987755982988, // Math.PI/2 - Math.PI/3
        isWarRoom: true,
        chairIndex: 1
    },

    // CTO → Chaise 3 (5 points)
    ctoToWarRoomChair3: {
        id: 'cto_to_warroom_chair3',
        name: 'Head of Tech (CTO) → 🪑 War Room Chaise 3',
        startName: 'Head of Tech (CTO)',
        endName: '🪑 War Room Chaise 3',
        points: [
            { x: -0.590, z: -0.938 },
            { x: -1.926, z: -0.645 },
            { x: -3.725, z: 1.334 },
            { x: -4.531, z: 2.434 },
            { x: -6.800, z: 4.180 },
            { x: -8.675, z: 4.169 }
        ],
        finalOrientation: -0.5235987755982988, // Math.PI/2 - 2*Math.PI/3
        isWarRoom: true,
        chairIndex: 2
    },

    // COS → Chaise 4 (5 points)
    cosToWarRoomChair4: {
        id: 'cos_to_warroom_chair4',
        name: 'Head of Personal (COS) → 🪑 War Room Chaise 4',
        startName: 'Head of Personal (COS)',
        endName: '🪑 War Room Chaise 4',
        points: [
            { x: 3.614, z: -1.291 },
            { x: 3.517, z: -0.026 },
            { x: 3.274, z: 0.923 },
            { x: 2.835, z: 1.927 },
            { x: 1.092, z: 3.168 },
            { x: -1.028, z: 3.615 },
            { x: -4.995, z: 3.276 },
            { x: -9.35, z: 3 }
        ],
        finalOrientation: -1.5707963267948966, // Math.PI/2 - Math.PI
        isWarRoom: true,
        chairIndex: 3
    },

    // MB → Chaise 5 (5 points)
    mbToWarRoomChair5: {
        id: 'mb_to_warroom_chair5',
        name: 'Head of Growth (MB) → 🪑 War Room Chaise 5',
        startName: 'Head of Growth (MB)',
        endName: '🪑 War Room Chaise 5',
        points: [
            { x: 5.586, z: -3.628 },
            { x: 5.415, z: -2.387 },
            { x: 5.172, z: -1.097 },
            { x: 4.588, z: -0.091 },
            { x: 3.226, z: 1.331 },
            { x: 1.092, z: 3.168 },
            { x: -1.028, z: 3.615 },
            { x: -4.995, z: 3.276 },
            { x: -8.675, z: 1.831 }
        ],
        finalOrientation: -2.6179938779914944, // Math.PI/2 - 4*Math.PI/3 -> -2.61799
        isWarRoom: true,
        chairIndex: 4
    }
};

// Toutes les routes sous forme de tableau
export const ALL_ROUTES = Object.values(PREDEFINED_ROUTES);

// Fonction pour récupérer les routes d'un employé
export function getRoutesForEmployee(employeeName) {
    return ALL_ROUTES.filter(r => r.startName === employeeName || r.endName === employeeName);
}

// Fonction pour récupérer les routes de départ d'un employé
export function getDepartureRoutes(employeeName) {
    return ALL_ROUTES.filter(r => r.startName === employeeName);
}

// Fonction pour récupérer les routes d'arrivée d'un employé
export function getArrivalRoutes(employeeName) {
    return ALL_ROUTES.filter(r => r.endName === employeeName);
}
