export function renderTokensDashboard(container, closeCallback, minimizeCallback) {
    if (!document.getElementById('tokens-styles')) {
        const style = document.createElement('style');
        style.id = 'tokens-styles';
        style.textContent = `
            .dash-wrapper {
                width: 100%;
                height: 100%;
                background-color: #f1f5f9;
                font-family: 'Inter', sans-serif;
                display: flex;
                flex-direction: column;
                color: #0f172a;
            }
            .dash-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background-color: #ffffff;
                border-bottom: 1px solid #e2e8f0;
                height: 72px;
            }
            .mac-controls { display: flex; gap: 8px; margin-right: 24px; }
            .mac-btn { width: 12px; height: 12px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(0,0,0,0.1); }
            .mac-close { background-color: #ff5f57; }
            .mac-min { background-color: #febc2e; }
            .mac-max { background-color: #28c840; }
            .mac-btn.disabled { background-color: #e2e8f0; border-color: rgba(0,0,0,0.05); cursor: default; }
            
            .header-left { display: flex; align-items: center; }
            .page-title { font-weight: 700; font-size: 18px; color: #0f172a; }
            
            .dash-content {
                display: flex;
                flex-direction: column;
                padding: 32px;
                gap: 24px;
                overflow-y: auto;
                flex: 1;
            }
            
            .kpi-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 24px;
            }
            
            .kpi-card {
                background: #ffffff;
                border-radius: 16px;
                padding: 24px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .kpi-title { font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;}
            .kpi-value { font-size: 36px; font-weight: 800; color: #0f172a; }
            .kpi-trend { font-size: 14px; font-weight: 600; margin-top: 8px; display: flex; align-items: center; gap: 4px; }
            .trend-up { color: #ef4444; } /* Cost up is bad */
            .trend-down { color: #10b981; } /* Cost down is good */
            
            .main-panel-row {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 24px;
                flex: 1;
                min-height: 400px;
            }
            
            .panel {
                background: #ffffff;
                border-radius: 16px;
                padding: 24px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                display: flex;
                flex-direction: column;
            }
            .panel-header { font-size: 18px; font-weight: 700; margin-bottom: 20px; color: #0f172a; }
            
            .chart-placeholder {
                flex: 1;
                background: #f8fafc;
                border: 1px dashed #cbd5e1;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #94a3b8;
                font-weight: 500;
                position: relative;
                overflow: hidden;
            }
            
            .fake-bar {
                width: 12%;
                background: #3b82f6;
                position: absolute;
                bottom: 0;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                transition: height 0.5s ease;
            }
            
            .list-table {
                width: 100%;
                border-collapse: collapse;
            }
            .list-table th, .list-table td {
                padding: 12px 0;
                border-bottom: 1px solid #f1f5f9;
                text-align: left;
            }
            .list-table th { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
            .list-table td { font-size: 14px; font-weight: 500; color: #1e293b; }
            .model-badge {
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
            }
            .model-gpt4 { background: #dbeafe; color: #1d4ed8; }
            .model-claude { background: #fce7f3; color: #be185d; }
            .model-llama { background: #fef3c7; color: #b45309; }
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
                    <div class="page-title">Tokens & API Usage</div>
                </div>
            </div>
            
            <div class="dash-content">
                <div class="kpi-row">
                    <div class="kpi-card">
                        <div class="kpi-title">Total Tokens (7d)</div>
                        <div class="kpi-value">4.2M</div>
                        <div class="kpi-trend trend-up">↑ 12% vs last week</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Estimated Cost</div>
                        <div class="kpi-value">$142.50</div>
                        <div class="kpi-trend trend-up">↑ 8% vs last week</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-title">Most Active Agent</div>
                        <div class="kpi-value">Head of Biz</div>
                        <div class="kpi-trend" style="color:#64748b">1.8M tokens generated</div>
                    </div>
                </div>
                
                <div class="main-panel-row">
                    <div class="panel">
                        <div class="panel-header">Consumption Over Time (Tokens)</div>
                        <div class="chart-placeholder">
                            <div class="fake-bar" style="left: 5%; height: 30%;"></div>
                            <div class="fake-bar" style="left: 20%; height: 45%;"></div>
                            <div class="fake-bar" style="left: 35%; height: 60%;"></div>
                            <div class="fake-bar" style="left: 50%; height: 40%;"></div>
                            <div class="fake-bar" style="left: 65%; height: 80%;"></div>
                            <div class="fake-bar" style="left: 80%; height: 65%; background: #1d4ed8;"></div>
                        </div>
                    </div>
                    <div class="panel">
                        <div class="panel-header">Usage by Model</div>
                        <table class="list-table">
                            <thead>
                                <tr>
                                    <th>Model</th>
                                    <th>Tokens</th>
                                    <th>Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span class="model-badge model-gpt4">GPT-4o</span></td>
                                    <td>2.1M</td>
                                    <td>$82.00</td>
                                </tr>
                                <tr>
                                    <td><span class="model-badge model-claude">Claude 3.5</span></td>
                                    <td>1.5M</td>
                                    <td>$45.00</td>
                                </tr>
                                <tr>
                                    <td><span class="model-badge model-llama">Llama 3 70B</span></td>
                                    <td>600K</td>
                                    <td>$15.50</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div class="panel-header" style="margin-top: 32px">Top Consumers</div>
                        <table class="list-table">
                            <tbody>
                                <tr>
                                    <td>Head of Biz</td>
                                    <td>42%</td>
                                </tr>
                                <tr>
                                    <td>Head of Tech</td>
                                    <td>28%</td>
                                </tr>
                                <tr>
                                    <td>Agent 03</td>
                                    <td>15%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.querySelector('#k-btn-close').addEventListener('click', closeCallback);
    if (minimizeCallback) container.querySelector('#k-btn-min').addEventListener('click', minimizeCallback);
}
