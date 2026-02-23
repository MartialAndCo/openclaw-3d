// Helper module to draw dashboard-style UI on 3D canvas (Far View)
export function drawDashboardCanvas(screen) {
    const { ctx, canvas, texture, config, data } = screen;
    const w = 1920;
    const h = 1080;

    ctx.save();
    ctx.scale(canvas.width / w, canvas.height / h);

    if (!data) {
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'italic 80px "Inter", Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('EN ATTENTE DE DONNÉES...', w / 2, h / 2);
        ctx.restore();
        texture.needsUpdate = true;
        return;
    }

    const title = data.title || config.title;
    const colorHex = '#' + config.color.toString(16).padStart(6, '0');

    // WAR ROOM THEME (Dark and high contrast)
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, w, h);

    // Subtle grid background for tech look
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.03;
    ctx.lineWidth = 2;
    for (let i = 0; i < w; i += 80) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
    for (let i = 0; i < h; i += 80) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
    ctx.globalAlpha = 1.0;

    // Header: Super bold and simple
    ctx.fillStyle = colorHex + '22'; // 10% opacity
    ctx.fillRect(0, 0, w, 150);

    ctx.fillStyle = colorHex;
    ctx.fillRect(0, 0, 20, 150);
    ctx.fillRect(0, 145, w, 5);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 70px "Inter", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(title.toUpperCase(), 60, 75);

    // Main content area
    ctx.translate(0, 150);
    let ch = h - 150;

    if (screen.id === 'activity') drawBigActivity(ctx, data, colorHex, w, ch);
    else if (screen.id === 'tokens') drawBigTokens(ctx, data, colorHex, w, ch);
    else if (screen.id === 'tasks') drawBigTasks(ctx, data, colorHex, w, ch);
    else if (screen.id === 'cron') drawBigCron(ctx, data, colorHex, w, ch);
    else if (screen.id === 'system') drawBigSystem(ctx, data, colorHex, w, ch);
    else if (screen.id === 'chat') drawBigChat(ctx, data, colorHex, w, ch);

    ctx.restore();
    texture.needsUpdate = true;
}

function drawBigActivity(ctx, data, colorHex, w, h) {
    let cx = w / 4;
    let cy = h / 2;

    let vals = ["5", "4", "41"];
    let lbls = ['INBOX', 'IN PROGRESS', 'DONE'];
    let cols = ['#94a3b8', '#a855f7', '#10b981'];

    if (data.agents) {
        let active = Object.values(data.agents).filter(s => s === 'active').length;
        vals = [active.toString(), Object.keys(data.agents).length.toString(), "99%"];
        lbls = ['ACTIVE', 'TOTAL', 'UPTIME'];
    }

    for (let i = 0; i < 3; i++) {
        let x = cx * (i + 1);
        ctx.beginPath(); ctx.arc(x, cy - 80, 200, 0, Math.PI * 2);
        ctx.strokeStyle = cols[i] + '44'; ctx.lineWidth = 30; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, cy - 80, 200, -Math.PI / 2, Math.PI * 1.2);
        ctx.strokeStyle = cols[i]; ctx.lineWidth = 30; ctx.stroke();

        ctx.fillStyle = '#ffffff'; ctx.font = '900 160px "Inter"'; ctx.textAlign = 'center'; ctx.fillText(vals[i], x, cy - 60);
        ctx.fillStyle = cols[i]; ctx.font = '800 50px "Inter"'; ctx.fillText(lbls[i], x, cy + 220);
    }
}

function drawBigTokens(ctx, data, colorHex, w, h) {
    const val = data.value || "4.2M";
    ctx.fillStyle = colorHex;
    ctx.font = '900 380px "Inter"';
    ctx.textAlign = 'center';
    ctx.fillText(val, w / 2, h / 2 - 120);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 70px "Inter"';
    ctx.fillText('TOTAL USED', w / 2, h / 2 + 100);

    drawSimpleGraph(ctx, 0, h - 350, w, 350, colorHex);
}

function drawBigTasks(ctx, data, colorHex, w, h) {
    ctx.fillStyle = colorHex;
    ctx.font = '900 350px "Inter"';
    ctx.textAlign = 'center';
    ctx.fillText(data.value || "12", w / 2, h / 2 - 150);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 70px "Inter"';
    ctx.fillText('ACTIVE TASKS', w / 2, h / 2 + 60);

    ctx.fillStyle = '#10b981';
    ctx.font = '900 80px "Inter"';
    ctx.fillText('● 45 COMPLETED (24H)', w / 2, h / 2 + 200);
}

function drawBigSystem(ctx, data, colorHex, w, h) {
    ctx.fillStyle = '#10b981';
    ctx.font = '900 350px "Inter"';
    ctx.textAlign = 'center';
    ctx.fillText('99.9%', w / 2, h / 2 - 200);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 60px "Inter"';
    ctx.fillText('SYSTEM HEALTH', w / 2, h / 2 - 20);

    let bx = w * 0.15;
    let bW = w * 0.7;

    let cpu = 42, ram = 78;
    if (data.metrics) {
        data.metrics.forEach(m => {
            if (m.label.includes('CPU')) cpu = parseInt(m.value) || 42;
            if (m.label.includes('RAM')) ram = parseInt(m.value) || 78;
        });
    }

    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(bx, h - 350, bW, 60, 30); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.roundRect(bx, h - 350, bW * (cpu / 100), 60, 30); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = '800 45px "Inter"'; ctx.textAlign = 'left'; ctx.fillText(`CPU ${cpu}%`, bx + 30, h - 380);

    ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(bx, h - 180, bW, 60, 30); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.roundRect(bx, h - 180, bW * (ram / 100), 60, 30); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(`RAM ${ram}%`, bx + 30, h - 210);
    ctx.textAlign = 'center';
}

function drawBigChat(ctx, data, colorHex, w, h) {
    let msgs = data.recent || [
        { from: "CEO", message: "Team, prioritize the webhook backlog." },
        { from: "Head of Tech", message: "Tests are running right now. ETA 15m." },
        { from: "Head of Biz", message: "Noted. I'll make sure it's smooth." }
    ];

    let y = 80;
    msgs.slice(0, 3).forEach((m, i) => {
        let isMe = i % 2 !== 0; // Simulate alternating
        let boxCol = isMe ? '#10b981' : '#1e293b';
        let txtCol = isMe ? '#000000' : '#ffffff';
        let subCol = isMe ? '#064e3b' : '#94a3b8';

        ctx.fillStyle = boxCol; ctx.beginPath(); ctx.roundRect(isMe ? 250 : 150, y, w - 400, 220, 30); ctx.fill();
        ctx.fillStyle = isMe ? '#059669' : colorHex; ctx.beginPath(); ctx.roundRect(isMe ? 250 : 150, y, 30, 220, [30, 0, 0, 30]); ctx.fill();

        ctx.fillStyle = txtCol; ctx.font = '900 70px "Inter"'; ctx.textAlign = 'left';
        ctx.fillText(m.from, isMe ? 320 : 220, y + 90);

        ctx.fillStyle = subCol; ctx.font = '500 55px "Inter"';
        let msgText = m.message || "";
        if (msgText.length > 55) msgText = msgText.substring(0, 52) + "...";
        ctx.fillText(msgText, isMe ? 320 : 220, y + 170);

        y += 260;
    });
}

function drawBigCron(ctx, data, colorHex, w, h) {
    let jobs = data.jobs || [
        { name: 'Sync WhatsApp', status: 'running' },
        { name: 'Memory Clean', status: 'pending' },
        { name: 'Fetch Emails', status: 'running' }
    ];

    let y = 100;
    jobs.slice(0, 4).forEach((job, i) => {
        let isRun = job.status === 'running';

        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.roundRect(150, y, w - 300, 150, 25); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = '800 70px "Inter"'; ctx.textAlign = 'left';
        ctx.fillText(job.name, 200, y + 75);

        ctx.fillStyle = isRun ? '#059669' : '#d97706';
        ctx.beginPath(); ctx.roundRect(w - 600, y + 35, 400, 80, 40); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = '800 45px "Inter"'; ctx.textAlign = 'center';
        ctx.fillText(job.status.toUpperCase(), w - 400, y + 78);

        y += 190;
    });
}

function drawSimpleGraph(ctx, x, y, width, height, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 20;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    let pts = 12;
    for (let i = 0; i <= pts; i++) {
        let px = x + (i * width / pts);
        let py = y + height - (Math.random() * height * 0.7) - 30;
        ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Gradient fill
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);

    let grad = ctx.createLinearGradient(0, y, 0, y + height);
    grad.addColorStop(0, color + '66'); // 40%
    grad.addColorStop(1, color + '00'); // 0%

    ctx.fillStyle = grad;
    ctx.fill();
}
