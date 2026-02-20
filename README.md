# How to Run OpenClaw 3D Dashboard

Because this project uses **ES Modules** (modern JavaScript imports), browsers block it from running directly from `file://` (double-clicking `index.html`) for security reasons (CORS policy).

You need to run a simple local web server. Here are 3 easy ways:

### Option 1: VS Code (Easiest)
If you use VS Code, install the **Live Server** extension.
1. Right-click `index.html`
2. Select "Open with Live Server"

### Option 2: Python (Built-in on most systems)
Open a terminal in this folder and run:
```bash
python -m http.server 8000
```
Then open http://localhost:8000

### Option 3: Node.js
If you have Node.js installed:
```bash
npx serve
```
Then open the URL it shows (usually http://localhost:3000)
