export function renderTasksDashboard(container, closeCallback, minimizeCallback) {
    if (!document.getElementById('tasks-styles')) {
        const style = document.createElement('style');
        style.id = 'tasks-styles';
        style.textContent = `
            .dash-wrapper { width: 100%; height: 100%; background-color: #f8fafc; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; color: #0f172a; }
            .dash-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; height: 72px; }
            .mac-controls { display: flex; gap: 8px; margin-right: 24px; }
            .mac-btn { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); }
            .mac-close { background-color: #ff5f57; }
            .mac-min { background-color: #febc2e; }
            .mac-max { background-color: #28c840; }
            .mac-btn.disabled { background-color: #e2e8f0; border-color: rgba(0,0,0,0.05); cursor: default; }
            .header-left { display: flex; align-items: center; }
            .page-title { font-weight: 700; font-size: 18px; color: #0f172a; }
            .dash-content { display: flex; flex-direction: column; padding: 32px; gap: 24px; overflow-y: auto; flex: 1; margin: 0 auto; width: 100%; max-width: 1200px; }
            
            .task-filters { display: flex; gap: 12px; margin-bottom: 8px; }
            .filter-btn { padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; background: #ffffff; border: 1px solid #e2e8f0; color: #64748b; }
            .filter-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
            
            .task-table-wrapper { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; }
            .task-table { width: 100%; border-collapse: collapse; text-align: left; }
            .task-table th { background: #f8fafc; padding: 16px; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
            .task-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: middle; }
            .task-table tr:last-child td { border-bottom: none; }
            .task-table tr:hover { background: #f8fafc; }
            
            .t-title { font-weight: 600; color: #1e293b; margin-bottom: 4px; display: block;}
            .t-desc { font-size: 13px; color: #64748b; }
            .t-agent { display: flex; align-items: center; gap: 8px; font-weight: 500; }
            .t-avatar { width: 24px; height: 24px; border-radius: 50%; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; }
            
            .t-status { padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }
            .status-done { background: #d1fae5; color: #059669; }
            .status-fail { background: #fee2e2; color: #dc2626; }
            .status-prog { background: #dbeafe; color: #2563eb; }
            
            .t-time { font-family: monospace; color: #94a3b8; font-size: 13px; }
        `;
        document.head.appendChild(style);
    }

    const mockTasks = [
        { id: 'TSK-084', title: 'Compile Weekly Analytics', desc: 'Aggregated user metrics and performance data for Q2.', agent: 'Head of Biz', status: 'done', time: '2 mins ago' },
        { id: 'TSK-083', title: 'Deploy Webhook Microservice', desc: 'Pushed container to production registry and restarted proxy.', agent: 'Head of Tech', status: 'prog', time: '14 mins ago' },
        { id: 'TSK-082', title: 'Audit S3 Bucket Permissions', desc: 'Identified 2 public buckets and applied required IAM policies.', agent: 'Head of Security', status: 'done', time: '1 hour ago' },
        { id: 'TSK-081', title: 'Sync CRM Contacts', desc: 'Attempted to fetch latest leads from Salesforce API (Rate limit).', agent: 'Agent 04', status: 'fail', time: '2 hours ago' },
        { id: 'TSK-080', title: 'Draft Release Notes v1.2', desc: 'Compiled list of 14 PR summaries for the changelog.', agent: 'Head of Personal', status: 'done', time: '3 hours ago' },
        { id: 'TSK-079', title: 'Run End-to-End Test Suite', desc: 'Executed playwright tests on staging branch.', agent: 'Head of Tech', status: 'done', time: '5 hours ago' }
    ];

    const renderTask = (t) => {
        let statusClass = t.status === 'done' ? 'status-done' : t.status === 'fail' ? 'status-fail' : 'status-prog';
        let statusText = t.status === 'done' ? 'Completed' : t.status === 'fail' ? 'Failed' : 'In Progress';

        return `
            <tr>
                <td style="font-family: monospace; color: #64748b;">${t.id}</td>
                <td>
                    <span class="t-title">${t.title}</span>
                    <span class="t-desc">${t.desc}</span>
                </td>
                <td>
                    <div class="t-agent">
                        <div class="t-avatar">${t.agent.charAt(0)}</div>
                        ${t.agent}
                    </div>
                </td>
                <td><span class="t-status ${statusClass}">${statusText}</span></td>
                <td class="t-time">${t.time}</td>
            </tr>
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
                    <div class="page-title">Tasks History</div>
                </div>
            </div>
            
            <div class="dash-content">
                <div class="task-filters">
                    <button class="filter-btn active">All Tasks</button>
                    <button class="filter-btn">Completed</button>
                    <button class="filter-btn">Failed</button>
                    <button class="filter-btn" style="margin-left: auto;">Export CSV</button>
                </div>
                
                <div class="task-table-wrapper">
                    <table class="task-table">
                        <thead>
                            <tr>
                                <th width="10%">ID</th>
                                <th width="40%">Task Details</th>
                                <th width="20%">Assignee</th>
                                <th width="15%">Status</th>
                                <th width="15%">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${mockTasks.map(renderTask).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.querySelector('#k-btn-close').addEventListener('click', closeCallback);
    if (minimizeCallback) container.querySelector('#k-btn-min').addEventListener('click', minimizeCallback);
}
