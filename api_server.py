#!/usr/bin/env python3
"""
API Server for OpenClaw Dashboard
Serves real data from the OpenClaw workspace
"""

import http.server
import socketserver
import json
import os
import glob
from datetime import datetime, timedelta

PORT = 8081
WORKSPACE = "/home/ubuntu/.openclaw/workspace"

class APIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_GET(self):
        if self.path == '/api/memory':
            self.serve_memory()
        elif self.path == '/api/sessions':
            self.serve_sessions()
        elif self.path == '/api/crons':
            self.serve_crons()
        elif self.path == '/api/stats':
            self.serve_stats()
        elif self.path == '/api/agents':
            self.serve_agents()
        else:
            super().do_GET()

    def serve_memory(self):
        """Serve memory files data"""
        memory_dir = os.path.join(WORKSPACE, "memory")
        files = []
        recent_entries = []

        try:
            for filepath in glob.glob(os.path.join(memory_dir, "*.md")):
                stat = os.stat(filepath)
                filename = os.path.basename(filepath)
                files.append({
                    "name": filename,
                    "modified": stat.st_mtime * 1000,
                    "size": stat.st_size
                })

                # Parse recent entries (last 24h)
                if stat.st_mtime > (datetime.now() - timedelta(days=1)).timestamp():
                    try:
                        with open(filepath, 'r') as f:
                            content = f.read()
                            entries = self.parse_memory_content(content, filename)
                            recent_entries.extend(entries)
                    except:
                        pass
        except Exception as e:
            print(f"Error reading memory: {e}")

        # Sort by timestamp descending
        recent_entries.sort(key=lambda x: x.get('timestamp', 0), reverse=True)

        self.send_json({
            "files": files,
            "recentEntries": recent_entries[:50],  # Last 50 entries
            "lastUpdate": datetime.now().isoformat()
        })

    def parse_memory_content(self, content, filename):
        """Parse memory file content to extract interactions"""
        entries = []
        lines = content.split('\n')
        current_entry = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Look for timestamp patterns
            if line.startswith('# ') and ('2026-' in line or '2025-' in line):
                if current_entry:
                    entries.append(current_entry)
                current_entry = {
                    "timestamp": self.extract_timestamp(line),
                    "title": line.replace('# ', ''),
                    "content": "",
                    "source": filename
                }
            elif line.startswith('## ') and current_entry:
                current_entry["content"] += line + "\n"
            elif line.startswith('- ') and current_entry:
                current_entry["content"] += line + "\n"
                # Try to extract interactions
                interaction = self.extract_interaction(line)
                if interaction:
                    current_entry["interaction"] = interaction
            elif current_entry:
                current_entry["content"] += line + "\n"

        if current_entry:
            entries.append(current_entry)

        return entries

    def extract_timestamp(self, line):
        """Extract timestamp from header line"""
        try:
            # Format: # 2026-02-20 - Title
            date_part = line.split(' - ')[0].replace('# ', '').strip()
            dt = datetime.strptime(date_part, '%Y-%m-%d')
            return dt.timestamp() * 1000
        except:
            return datetime.now().timestamp() * 1000

    def extract_interaction(self, line):
        """Try to extract agent interaction from a line"""
        # Look for patterns like "CEO → Head" or "délégué à"
        agents = ['CEO', 'Orchestrator', 'Head of Tech', 'Head of Biz', 'Head of Security',
                  'Head of Personal', 'Head of Growth', 'ui-agent', 'ux-agent',
                  'codeur-agent', 'debugger-agent', 'CTO', 'COO', 'CISO', 'COS', 'MB']

        found_agents = []
        for agent in agents:
            if agent in line:
                found_agents.append(agent)

        if len(found_agents) >= 2:
            return {
                "from": found_agents[0],
                "to": found_agents[1],
                "type": "delegation" if any(w in line.lower() for w in ['délég', 'deleg', 'envoy', 'ask']) else "response"
            }
        return None

    def serve_sessions(self):
        """Serve active sessions"""
        # Read from session transcript files
        sessions_dir = os.path.join(WORKSPACE, "..", "agents", "main", "sessions")
        sessions = []

        try:
            for filepath in glob.glob(os.path.join(sessions_dir, "*.jsonl")):
                stat = os.stat(filepath)
                # Active if modified in last 30 minutes
                if stat.st_mtime > (datetime.now() - timedelta(minutes=30)).timestamp():
                    sessions.append({
                        "id": os.path.basename(filepath).replace('.jsonl', ''),
                        "lastActivity": stat.st_mtime * 1000,
                        "active": True
                    })
        except Exception as e:
            print(f"Error reading sessions: {e}")

        self.send_json({
            "sessions": sessions,
            "count": len(sessions)
        })

    def serve_crons(self):
        """Serve cron jobs status"""
        # This would need to query the actual cron system
        # For now, return placeholder
        self.send_json({
            "jobs": [],
            "count": 0
        })

    def serve_stats(self):
        """Serve global stats"""
        # Calculate stats from memory files
        memory_dir = os.path.join(WORKSPACE, "memory")
        total_files = 0
        total_size = 0
        today_entries = 0

        try:
            for filepath in glob.glob(os.path.join(memory_dir, "*.md")):
                stat = os.stat(filepath)
                total_files += 1
                total_size += stat.st_size
                if datetime.fromtimestamp(stat.st_mtime).date() == datetime.now().date():
                    today_entries += 1
        except:
            pass

        self.send_json({
            "tokens": total_size,  # Using file size as proxy
            "tasks": today_entries,
            "activeAgents": total_files,
            "conversations": today_entries,
            "lastUpdate": datetime.now().isoformat()
        })

    def serve_agents(self):
        """Serve agent configurations"""
        agents = [
            {"name": "CEO", "role": "Orchestrator", "department": "Executive"},
            {"name": "Head of Tech (CTO)", "role": "CTO", "department": "Tech"},
            {"name": "Head of Biz (COO)", "role": "COO", "department": "Business"},
            {"name": "Head of Security (CISO)", "role": "CISO", "department": "Security"},
            {"name": "Head of Personal (COS)", "role": "COS", "department": "Personal"},
            {"name": "Head of Growth (MB)", "role": "MB", "department": "Growth"},
        ]

        self.send_json({"agents": agents})

    def send_json(self, data):
        """Send JSON response"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

if __name__ == '__main__':
    os.chdir(os.path.join(WORKSPACE, "..", ".."))  # Serve from openclaw root
    with socketserver.TCPServer(("", PORT), APIHandler) as httpd:
        print(f"API Server running at http://localhost:{PORT}/")
        httpd.serve_forever()
