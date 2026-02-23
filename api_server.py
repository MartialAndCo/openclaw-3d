from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import time
import threading

app = Flask(__name__)
CORS(app)

# Configuration based on ~/.openclaw/config.json found on the server
GATEWAY_URL = "http://100.101.199.17:34871"  # Target the Tailscale IP of the Ubuntu server
GATEWAY_TOKEN = os.environ.get("OPENCLAW_GATEWAY_TOKEN", "fb43d812f2c46dc15cb2f9b1d05f9dfae4c10488d1f7e06f")
HEADERS = {
    "Authorization": f"Bearer {GATEWAY_TOKEN}",
    "Content-Type": "application/json"
}

# In-memory cache to simulate the old file polling without spamming the gateway too hard
cache = {
    "sessions": [],
    "last_update": 0
}

def fetch_active_sessions():
    """Poll the gateway for active sessions."""
    try:
        payload = {
            "tool": "sessions_list",
            "action": "json",
            "args": {"activeMinutes": 60}
        }
        res = requests.post(f"{GATEWAY_URL}/tools/invoke", json=payload, headers=HEADERS, timeout=5)
        if res.status_code == 200:
            data = res.json()
            # Depending on how the array is wrapped in your specific openclaw version
            # Usually it returns {"result": [...]} or directly the array [...]
            sessions = data.get("result", data) if isinstance(data, dict) else data
            
            cache["sessions"] = sessions
            cache["last_update"] = time.time()
            print(f"[API] Successfully fetched {len(sessions) if isinstance(sessions, list) else 0} sessions.")
        else:
            print(f"[API Error] Failed to fetch sessions: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"[API Exception] Could not connect to OpenClaw Gateway: {e}")

def background_poller():
    """Poll everyday 5 seconds."""
    while True:
        fetch_active_sessions()
        time.sleep(5)

@app.route('/api/status', methods=['GET'])
def get_status():
    """Endpoint for the 3D dashboard to read the current state."""
    sessions_data = cache["sessions"]
    
    # OpenClaw sometimes returns a stringified JSON block in content[0].text. Unpack it for the dashboard.
    try:
        if isinstance(sessions_data, dict) and "content" in sessions_data:
            content_array = sessions_data["content"]
            if len(content_array) > 0 and "text" in content_array[0]:
                raw_text = content_array[0]["text"]
                # Try parsing the string to JSON
                import json
                parsed_text = json.loads(raw_text)
                
                # Replace the raw text with a clean dictionary
                sessions_data["content"][0]["text_parsed"] = parsed_text
    except Exception as e:
        print(f"[API Warning] Could not parse session text logic: {e}")
        
    return jsonify({
        "status": "ok",
        "last_update": cache["last_update"],
        "sessions": sessions_data
    })

@app.route('/api/invoke', methods=['POST'])
def invoke_tool():
    """Proxy any explicit tool invocation from the dashboard directly to the gateway."""
    try:
        data = request.json
        res = requests.post(f"{GATEWAY_URL}/tools/invoke", json=data, headers=HEADERS, timeout=10)
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/agent-files/<agent_name>', methods=['GET'])
def get_agent_files(agent_name):
    """Uses local SSH to read the agent's folder on the server."""
    # Security: basic sanitization
    safe_name = "".join(c for c in agent_name if c.isalnum() or c in "-_")
    if not safe_name:
        return jsonify([])

    # Some agents map differently to their folder names. Let's do a basic mapping
    folder_mapping = {
        "CEO": "main",
        "Head of Tech (CTO)": "tech",
        "Head of Biz (COO)": "business",
        "Head of Security (CISO)": "security",
        "Head of Personal (COS)": "personal",
        "Head of Growth (MB)": "growth"
    }
    folder = folder_mapping.get(safe_name, safe_name)

    import subprocess
    cmd = f"ls -lh ~/.openclaw/agents/{folder} ~/.openclaw/agents/{folder}/agent ~/.openclaw/agents/{folder}/sessions 2>/dev/null"
    
    try:
        result = subprocess.check_output(
            ["ssh", "-i", "peds.pem", "-o", "StrictHostKeyChecking=no", "ubuntu@100.101.199.17", cmd],
            text=True, timeout=5
        )
        
        files = []
        for line in result.split('\n'):
            parts = line.split()
            if len(parts) >= 9 and not line.startswith('d'):
                size = parts[4]
                date = f"{parts[5]} {parts[6]} {parts[7]}"
                name = parts[8]
                if name.endswith('.md') or name.endswith('.json') or name.endswith('.jsonl'):
                    files.append({
                        "name": name,
                        "type": "memory" if "session" in name or name.endswith('.jsonl') else "config",
                        "size": size,
                        "modified": date
                    })
        
        return jsonify(files)
    except Exception as e:
        print(f"[API Error] Cannot fetch SSH files for {folder}: {e}")
        return jsonify([])

if __name__ == '__main__':
    # Start the background poller before listening
    threading.Thread(target=background_poller, daemon=True).start()
    
    # Start the local flask server
    print("Starting Dashboard3D Proxy API on port 5000...")
    app.run(host='0.0.0.0', port=5000)
