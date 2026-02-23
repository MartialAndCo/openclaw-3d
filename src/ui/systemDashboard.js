export function renderSystemDashboard(container, closeCallback, minimizeCallback) {
    if (!document.getElementById('system-styles')) {
        const style = document.createElement('style');
        style.id = 'system-styles';
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
            .dash-content { display: flex; flex-direction: column; padding: 32px; gap: 24px; overflow-y: auto; flex: 1; }
            
            .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
            .kpi-card { background: #ffffff; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .kpi-card.warning { border-left-color: #f59e0b; }
            .kpi-card.healthy { border-left-color: #10b981; }
            .kpi-title { font-size: 13px; font-weight: 600; color: #64748b; margin-bottom: 6px; text-transform: uppercase;}
            .kpi-value { font-size: 28px; font-weight: 800; color: #0f172a; display: flex; align-items: baseline; gap: 8px; }
            .kpi-sub { font-size: 14px; font-weight: 500; color: #94a3b8; }
            
            .panels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; flex: 1; }
            .panel { background: #ffffff; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; }
            .panel-header { font-size: 16px; font-weight: 700; margin-bottom: 20px; color: #0f172a; display: flex; justify-content: space-between; align-items: center; }
            
            .resource-bar { margin-bottom: 20px; }
            .res-head { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; font-weight: 600;}
            .res-track { width: 100%; height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; }
            .res-fill { height: 100%; border-radius: 6px; transition: width 0.5s ease; }
            
            .service-list { display: flex; flex-direction: column; gap: 12px; }
            .service-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; }
            .srv-name { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 12px; color: #1e293b;}
            .srv-dot { width: 10px; height: 10px; border-radius: 50%; }
            .dot-green { background: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.4); }
            .dot-yellow { background: #f59e0b; box-shadow: 0 0 8px rgba(245,158,11,0.4); }
            .srv-meta { font-size: 12px; color: #64748b; font-family: monospace; }
        `;
        document.head.appendChild(style);
    }

    const html = `
        <div class="dash-wrapper">
            <div class="dash-header">
                <div class="header-left">
                    <div class="mac-controls">
                        <div class="mac-btn mac-close" id="k-btn-close"></div>
                        <div class="mac-btn mac-min" id="k-btn-min"></div>
                        <div class="mac-btn mac-max disabled"></div>
                    </div>
                    <div class="page-title">System Health & APIs</div>
                </div>
                <div style="font-size: 13px; color: #10b981; font-weight: 600; background: #d1fae5; padding: 6px 12px; border-radius: 20px;">
                    ● All Systems Operational
                </div>
            </div>
            
            <div class="dash-content">
                <div class="kpi-row">
                    <div class="kpi-card healthy">
                        <div class="kpi-title">Global Uptime</div>
                        <div class="kpi-value">99.98<span class="kpi-sub">%</span></div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">API Latency</div>
                        <div class="kpi-value">124<span class="kpi-sub">ms</span></div>
                    </div>
                    <div class="kpi-card warning">
                        <div class="kpi-title">Active Connections</div>
                        <div class="kpi-value">1,204</div>
                    </div>
                    <div class="kpi-card healthy">
                        <div class="kpi-title">Errors (1h)</div>
                        <div class="kpi-value">0</div>
                    </div>
                </div>
                
                <div class="panels-grid">
                    <div class="panel">
                        <div class="panel-header">Server Resources</div>
                        
                        <div class="resource-bar">
                            <div class="res-head">
                                <span>CPU Usage (Core-i9)</span>
                                <span>42%</span>
                            </div>
                            <div class="res-track"><div class="res-fill" style="width: 42%; background: #3b82f6;"></div></div>
                        </div>
                        
                        <div class="resource-bar">
                            <div class="res-head">
                                <span>Memory (RAM)</span>
                                <span style="color: #f59e0b">78%</span>
                            </div>
                            <div class="res-track"><div class="res-fill" style="width: 78%; background: #f59e0b;"></div></div>
                        </div>
                        
                        <div class="resource-bar">
                            <div class="res-head">
                                <span>Storage (SSD)</span>
                                <span>24%</span>
                            </div>
                            <div class="res-track"><div class="res-fill" style="width: 24%; background: #10b981;"></div></div>
                        </div>
                        
                        <div class="resource-bar">
                            <div class="res-head">
                                <span>Network T/X</span>
                                <span>65 Mbps</span>
                            </div>
                            <div class="res-track"><div class="res-fill" style="width: 65%; background: #8b5cf6;"></div></div>
                        </div>
                    </div>
                    
                    <div class="panel">
                        <div class="panel-header">
                            Core Services 
                            <span style="font-size: 12px; font-weight: 500; color: #64748b;">last check: just now</span>
                        </div>
                        <div class="service-list">
                            <div class="service-item">
                                <div class="srv-name"><div class="srv-dot dot-green"></div> OpenClaw API Gateway</div>
                                <div class="srv-meta">Ping: 12ms | OK</div>
                            </div>
                            <div class="service-item">
                                <div class="srv-name"><div class="srv-dot dot-green"></div> PostgreSQL Primary DB</div>
                                <div class="srv-meta">Conns: 42 | OK</div>
                            </div>
                            <div class="service-item">
                                <div class="srv-name"><div class="srv-dot dot-green"></div> Redis Cache Cluster</div>
                                <div class="srv-meta">Hits: 99.2% | OK</div>
                            </div>
                            <div class="service-item">
                                <div class="srv-name"><div class="srv-dot dot-yellow"></div> External Webhook Sync</div>
                                <div class="srv-meta">Lag: 4s | WARN</div>
                            </div>
                            <div class="service-item">
                                <div class="srv-name"><div class="srv-dot dot-green"></div> Python Task Queue</div>
                                <div class="srv-meta">Jobs: 0 | OK</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.querySelector('#k-btn-close').addEventListener('click', closeCallback);
    if (minimizeCallback) container.querySelector('#k-btn-min').addEventListener('click', minimizeCallback);
}
