export function renderCronDashboard(container, closeCallback, minimizeCallback) {
    if (!document.getElementById('cron-styles')) {
        const style = document.createElement('style');
        style.id = 'cron-styles';
        style.textContent = `
            .dash-wrapper { width: 100%; height: 100%; background-color: #f1f5f9; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; color: #0f172a; }
            .dash-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; height: 72px; }
            .mac-controls { display: flex; gap: 8px; margin-right: 24px; }
            .mac-btn { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); }
            .mac-close { background-color: #ff5f57; }
            .mac-min { background-color: #febc2e; }
            .mac-max { background-color: #28c840; }
            .mac-btn.disabled { background-color: #e2e8f0; border-color: rgba(0,0,0,0.05); cursor: default; }
            .header-left { display: flex; align-items: center; }
            .page-title { font-weight: 700; font-size: 18px; color: #0f172a; }
            .dash-content { padding: 32px; overflow-y: auto; flex: 1; }
            
            .cron-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; }
            .cron-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; position: relative; overflow: hidden; }
            
            .cron-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
            .cron-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
            .cron-desc { font-size: 13px; color: #64748b; line-height: 1.4; }
            
            .cron-status { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;}
            .status-idle { background: #f1f5f9; color: #64748b; }
            .status-running { background: #dbeafe; color: #2563eb; animation: pulse 2s infinite; }
            .status-failed { background: #fee2e2; color: #ef4444; }
            
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(37, 99, 235, 0); }
                100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
            }
            
            .cron-meta { display: flex; flex-direction: column; gap: 12px; margin-top: auto; padding-top: 20px; border-top: 1px solid #f1f5f9; }
            .meta-row { display: flex; justify-content: space-between; font-size: 13px; }
            .meta-label { color: #64748b; font-weight: 500; }
            .meta-val { color: #0f172a; font-weight: 600; font-family: monospace; }
            
            .cron-progress { width: 100%; height: 4px; background: #f1f5f9; border-radius: 2px; position: absolute; bottom: 0; left: 0; }
            .prog-bar { height: 100%; background: #3b82f6; border-radius: 2px; }
        `;
        document.head.appendChild(style);
    }

    const mockJobs = [
        { name: 'Sync CRM Leads', desc: 'Fetches new leads from Salesforce and populates internal DB.', status: 'running', interval: 'Every 15 mins', next: 'Running...', last: '14m ago', progress: 65 },
        { name: 'Daily Backup S3', desc: 'Dumps Postgres database and uploads encrypted archive to S3.', status: 'idle', interval: 'Daily at 02:00', next: 'in 4h 30m', last: '19h ago', progress: 0 },
        { name: 'Analytics Aggregation', desc: 'Calculates daily metrics for the Tokens dashboard.', status: 'idle', interval: 'Daily at 23:55', next: 'in 2h 25m', last: '21h ago', progress: 0 },
        { name: 'Stale Sessions Cleanup', desc: 'Removes dead WebSocket connections and frees memory.', status: 'idle', interval: 'Every 5 mins', next: 'in 1m 12s', last: '3m ago', progress: 0 },
        { name: 'Invoice PDF Generation', desc: 'Generates PDFs for recurring billing clients.', status: 'failed', interval: 'Monthly on 1st', next: 'Retry pending', last: 'Yesterday', progress: 100 }
    ];

    const renderJob = (job) => {
        let sc = job.status === 'running' ? 'status-running' : job.status === 'failed' ? 'status-failed' : 'status-idle';
        let prog = job.status === 'running' ? `<div class="cron-progress"><div class="prog-bar" style="width: ${job.progress}%"></div></div>` : '';
        let sTxt = job.status === 'running' ? 'Running' : job.status === 'failed' ? 'Failed' : 'Idle';

        return `
            <div class="cron-card">
                <div class="cron-header">
                    <div>
                        <div class="cron-title">${job.name}</div>
                        <div class="cron-desc">${job.desc}</div>
                    </div>
                    <div class="cron-status ${sc}">${sTxt}</div>
                </div>
                <div class="cron-meta">
                    <div class="meta-row">
                        <span class="meta-label">Schedule:</span>
                        <span class="meta-val">${job.interval}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Next Run:</span>
                        <span class="meta-val" style="${job.status === 'running' ? 'color:#2563eb' : ''}">${job.next}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Last Run:</span>
                        <span class="meta-val" style="${job.status === 'failed' ? 'color:#ef4444' : ''}">${job.last}</span>
                    </div>
                </div>
                ${prog}
            </div>
        `;
    };

    const html = `
        <div class="dash-wrapper">
            <div class="dash-header">
                <div class="header-left">
                    <div class="mac-controls">
                        <div class="mac-btn mac-close" id="k-btn-close"></div>
                        <div class="mac-btn mac-min" id="k-btn-min"></div>
                        <div class="mac-btn mac-max disabled"></div>
                    </div>
                    <div class="page-title">Cron & Background Jobs</div>
                </div>
            </div>
            
            <div class="dash-content">
                <div class="cron-grid">
                    ${mockJobs.map(renderJob).join('')}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.querySelector('#k-btn-close').addEventListener('click', closeCallback);
    if (minimizeCallback) container.querySelector('#k-btn-min').addEventListener('click', minimizeCallback);
}
