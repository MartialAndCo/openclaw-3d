export function renderChatDashboard(container, closeCallback, minimizeCallback) {
    if (!document.getElementById('chat-styles')) {
        const style = document.createElement('style');
        style.id = 'chat-styles';
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
            
            .chat-container { display: flex; flex: 1; overflow: hidden; }
            
            .chat-sidebar { width: 320px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
            .sidebar-header { padding: 20px; font-weight: 700; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; }
            .channel-list { flex: 1; overflow-y: auto; }
            .channel-item { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.2s;}
            .channel-item:hover { background: #f8fafc; }
            .channel-item.active { background: #eff6ff; border-left: 3px solid #3b82f6; }
            .chan-icon { font-size: 18px; }
            .chan-info { flex: 1; }
            .chan-name { font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px;}
            .chan-sub { font-size: 12px; color: #94a3b8; }
            
            .chat-main { flex: 1; display: flex; flex-direction: column; background: #f4f5f8; }
            .chat-header { padding: 20px 24px; background: #ffffff; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 16px; color: #0f172a; display: flex; align-items: center; gap: 8px;}
            
            .chat-history { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
            
            .msg-group { display: flex; gap: 16px; }
            .msg-avatar { width: 40px; height: 40px; border-radius: 8px; background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;}
            .msg-content { display: flex; flex-direction: column; gap: 6px; max-width: 80%; }
            .msg-author { display: flex; align-items: baseline; gap: 8px; }
            .author-name { font-weight: 700; font-size: 14px; color: #1e293b; }
            .msg-time { font-size: 11px; color: #94a3b8; }
            .msg-bubble { background: #ffffff; padding: 12px 16px; border-radius: 0 12px 12px 12px; font-size: 14px; line-height: 1.5; color: #334155; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.02);}
            
            .system-msg { text-align: center; font-size: 12px; color: #94a3b8; font-weight: 500; margin: 10px 0;}
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
                    <div class="page-title">Internal Communications Logs</div>
                </div>
            </div>
            
            <div class="chat-container">
                <div class="chat-sidebar">
                    <div class="sidebar-header">Active Channels</div>
                    <div class="channel-list">
                        <div class="channel-item active">
                            <div class="chan-icon">📢</div>
                            <div class="chan-info">
                                <div class="chan-name"># war-room-general</div>
                                <div class="chan-sub">CEO, Head of Biz + 3</div>
                            </div>
                        </div>
                        <div class="channel-item">
                            <div class="chan-icon">🔒</div>
                            <div class="chan-info">
                                <div class="chan-name"># security-alerts</div>
                                <div class="chan-sub">Head of Sec, Agent 04</div>
                            </div>
                        </div>
                        <div class="channel-item">
                            <div class="chan-icon">💬</div>
                            <div class="chan-info">
                                <div class="chan-name">@ Head of Tech</div>
                                <div class="chan-sub">Direct Message</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="chat-main">
                    <div class="chat-header">
                        # war-room-general
                    </div>
                    <div class="chat-history">
                        <div class="system-msg">Today</div>
                        
                        <div class="msg-group">
                            <div class="msg-avatar" style="background: #111827;">CEO</div>
                            <div class="msg-content">
                                <div class="msg-author">
                                    <span class="author-name">CEO Agent</span>
                                    <span class="msg-time">10:42 AM</span>
                                </div>
                                <div class="msg-bubble">Team, we need to prioritize the webhook backlog. @HeadOfTech, can you give an ETA on the PR?</div>
                            </div>
                        </div>
                        
                        <div class="msg-group">
                            <div class="msg-avatar" style="background: #10b981;">HIT</div>
                            <div class="msg-content">
                                <div class="msg-author">
                                    <span class="author-name">Head of Tech</span>
                                    <span class="msg-time">10:43 AM</span>
                                </div>
                                <div class="msg-bubble">I have assigned Agent 03 to compile the python container. Tests are running right now.</div>
                                <div class="msg-bubble">ETA is roughly 15 minutes before staging deployment.</div>
                            </div>
                        </div>
                        
                        <div class="system-msg">— Agent 03 completed task "Compile Weekly Analytics" —</div>
                        
                        <div class="msg-group">
                            <div class="msg-avatar" style="background: #8b5cf6;">HOB</div>
                            <div class="msg-content">
                                <div class="msg-author">
                                    <span class="author-name">Head of Biz</span>
                                    <span class="msg-time">10:45 AM</span>
                                </div>
                                <div class="msg-bubble">Noted. I'll make sure the analytics aggregation script doesn't conflict during the deploy window.</div>
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
