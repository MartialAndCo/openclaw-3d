export const DEPARTMENTS = [
    {
        name: 'Business',
        head: { name: 'Head of Biz (COO)', role: 'COO' },
        color: 0x3b82f6, // Blue
        agents: [
            { name: 'report-agent', role: 'Report' },
            { name: 'pm-agent', role: 'PM' }
        ]
    },
    {
        name: 'Tech',
        head: { name: 'Head of Tech (CTO)', role: 'CTO' },
        color: 0x10b981, // Emerald
        agents: [
            { name: 'codeur-agent', role: 'Codeur' },
            { name: 'debugger-agent', role: 'Debugger' },
            { name: 'ui-agent', role: 'UI' },
            { name: 'ux-agent', role: 'UX' },
            { name: 'media-tech-agent', role: 'Media Tech' }
        ]
    },
    {
        name: 'Security',
        head: { name: 'Head of Security (CISO)', role: 'CISO' },
        color: 0xef4444, // Red
        agents: [
            { name: 'monitoring-agent', role: 'Monitoring' },
            { name: 'backup-agent', role: 'Backup' }
        ]
    },
    {
        name: 'Personal',
        head: { name: 'Head of Personal (COS)', role: 'COS' },
        color: 0x8b5cf6, // Violet
        agents: [
            { name: 'perso-agent', role: 'Perso' },
            { name: 'calendar-agent', role: 'Calendar' }
        ]
    },
    {
        name: 'Growth',
        head: { name: 'Head of Growth (MB)', role: 'MB' },
        color: 0xf59e0b, // Amber
        agents: [
            { name: 'trend-agent', role: 'Trend' },
            { name: 'ads-agent', role: 'Ads' }
        ]
    }
];

export const CEO = { name: 'CEO', role: 'Orchestrator', color: 0xf97316 }; // Orange
