# OpenClaw — AI Agent Documentation

> **Language:** English (code comments mixed with French in some modules)  
> **Project Type:** Static 3D Web Application (ES Modules, no build step)  
> **Last Updated:** 2026-02-19

---

## Project Overview

OpenClaw is a **3D office dashboard visualization** built with Three.js. It renders a virtual office space representing "OpenClaw HQ" with:

- **24m × 12m** virtual office room with walls, floor, door, and furniture
- **19 employees** organized in **5 departments**: Business, Tech, Security, Personal, Growth
- **1 CEO** (Orchestrator) with sequential animation system
- **Department Heads** (COO, CTO, CISO, COS, MB) with distinctive visual markers (golden pyramids)
- **Interactive Editors** for layout customization, route creation, and simulation
- **Animated employees** using FBX models with sitting/walking/talking animations
- **War Room** with 6 chairs around a round table
- **Coffee Corner** lounge area

### Key Features

| Feature | Description |
|---------|-------------|
| 3D Office Scene | Procedural wood parquet floor, walls with functional door, potted plants |
| Employee System | 19 seated employees at desks with idle animations |
| CEO Animator | Sequential animation: Idle → Stand Up → Walk → Sit Down |
| Route System | 60+ predefined routes between employees with A* pathfinding |
| 2D Route Editor | Precise route creation with drag & drop, zoom, pan, waypoint editing |
| 3D Route Editor | Simple point-and-click route creation |
| Layout Editor | Drag-and-drop desk positioning with rotation |
| Auto Route Gen | Automatic route generation using A* pathfinding |
| Export/Import | JSON configuration save/load with drag-and-drop import |
| Employee Routes Menu | Click any employee to see available routes |

---

## Technology Stack

| Component | Technology | Version | Source |
|-----------|------------|---------|--------|
| 3D Engine | Three.js | 0.162.0 | CDN (jsdelivr) |
| Module System | ES Modules | — | Native browser |
| Controls | OrbitControls | addon | Three.js examples |
| Model Loaders | GLTFLoader, FBXLoader | addon | Three.js examples |
| Styling | CSS3 | — | Native |

### CDN Dependencies

```javascript
// Import map in index.html
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.162.0/examples/jsm/"
  }
}
```

---

## Project Structure

```
openclaw/
├── index.html                    # Entry point + import map + loading screen
├── style.css                     # UI styling, glass-morphism, loading animations
├── default-layout.json           # Default office desk positions (19 employees)
├── openclaw-layout-*.json        # Saved layout configurations
├── README.md                     # User-facing run instructions
├── AGENTS.md                     # This file
│
├── src/
│   ├── main.js                   # Entry point — init scene, animate loop
│   ├── config.js                 # DEPARTMENTS array + CEO constant
│   ├── state.js                  # Global state + loading progress management
│   ├── labels.js                 # DOM label overlays for 3D positions
│   ├── routes.js                 # 60+ predefined routes between employees
│   ├── editor.js                 # Layout editor, route editor UI, simulation
│   │
│   ├── scene/
│   │   ├── lights.js             # Directional sun + ambient lighting
│   │   ├── room.js               # Floor (parquet texture), walls, door, plants
│   │   ├── furniture.js          # Desks, chairs, CEO platform, layout loader
│   │   └── meeting.js            # War Room (round table), Coffee Corner
│   │
│   ├── characters/
│   │   ├── index.js              # FBX loading, seated employees, CEO loader
│   │   ├── ceoAnimator.js        # CEO animation state machine + route following
│   │   ├── employeeAnimator.js   # Employee route animation system
│   │   ├── routeGenerator.js     # Automatic route generation with A*
│   │   └── pathfinder.js         # A* pathfinding implementation
│   │
│   └── editor/
│       └── routeEditor2D.js      # Full-screen 2D route editor
│
└── 3D Assets (root level):
    ├── mr_man_walking.glb        # Character model (GLB) — backup
    ├── mr_man_walking_fixed.glb  # Character model (GLB) — active
    ├── Seated Idle.fbx           # Sitting animation
    ├── Stand Up.fbx              # Stand up animation
    ├── Stand To Sit.fbx          # Sit down animation
    ├── Mr_Man_Walking.fbx        # Walking animation
    └── Talking.fbx               # Talking animation
```

---

## Build and Run

### ⚠️ IMPORTANT: Local Web Server Required

Due to ES Module CORS restrictions, **you cannot open `index.html` directly** via `file://` protocol.

### Option 1: VS Code Live Server (Recommended)
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"

### Option 2: Python HTTP Server
```bash
python -m http.server 8000
# Open http://localhost:8000
```

### Option 3: Node.js serve
```bash
npx serve
# Opens at http://localhost:3000 (or similar)
```

---

## Architecture

### Coordinate System

- **Scale:** 1 unit = 1 meter
- **Room dimensions:** 24m (width) × 12m (depth) × 4m (height)
- **Floor:** Procedural wood parquet texture generated on HTML5 Canvas
- **Character scale:** 0.01 for FBX models (cm to meter conversion)
- **Desk height:** 0.75m
- **Camera:** Positioned at (0, 13, 8), looking at center

### Scene Hierarchy

```
Scene
├── AmbientLight (0xffffff, 0.5)
├── DirectionalLight "sun" (shadow caster, 2048×2048 map)
├── DirectionalLight "fill" (0xd0e8ff, 0.3)
├── Floor (PlaneGeometry with procedural parquet texture)
├── GridHelper (24×24, subtle)
├── Walls (BoxGeometry with door opening)
│   └── Door panel (animated)
├── Plants (4 corner plants)
├── CEO Platform (desk, chair, monitors, animated CEO)
├── Department Desks (5 groups with head + agents)
├── War Room (round table + 6 chairs at position -8, 3)
├── Coffee Corner (sofa, coffee machine, table)
└── Editor Gizmos (move arrows, rotation ring, route markers)
```

### State Management

Single global state object (`src/state.js`):

```javascript
export const state = {
    scene: null,        // THREE.Scene instance
    camera: null,       // PerspectiveCamera (50°, positioned at 0,13,8)
    renderer: null,     // WebGLRenderer with PCFSoftShadowMap
    controls: null,     // OrbitControls with damping
    clock: new THREE.Clock(),
    mixers: [],         // AnimationMixer array for all animations
    characters: [],     // GLTF characters array (legacy)
    labels: [],         // DOM label overlays
    desks: [],          // Desk registry for editor
    ceoChairPosition: null,
    loadedCount: 0,     // Loading progress counter
    totalToLoad: 20     // 1 CEO + 19 employees
};
```

---

## Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `main.js` | Scene initialization, animation loop, window resize |
| `config.js` | Static department configuration, colors, roles |
| `state.js` | Global mutable state, loading progress, finish handling |
| `labels.js` | Create and update DOM labels positioned in 3D space |
| `routes.js` | Predefined routes (60+) between all employees |
| `editor.js` | Full editor system: selection, dragging, routes, simulation, export/import |
| `routeEditor2D.js` | Full-screen 2D route editor with zoom/pan/waypoint editing |
| `scene/lights.js` | Sun (directional with shadows) + fill light setup |
| `scene/room.js` | Parquet floor texture, walls with door, plants |
| `scene/furniture.js` | Desk creation, layout loading, chairs, employee spawning |
| `scene/meeting.js` | War Room round table (6 chairs), Coffee Corner lounge |
| `characters/index.js` | FBX/GLB loading, material fixes, seated employee setup |
| `characters/ceoAnimator.js` | CEO state machine and route following |
| `characters/employeeAnimator.js` | Employee route animations (stand, walk, turn, sit, talk) |
| `characters/routeGenerator.js` | Automatic route generation using A* pathfinding |
| `characters/pathfinder.js` | A* implementation with 5cm grid precision |

---

## Code Organization

### Naming Conventions

- **Variables:** camelCase (`state`, `ceoAnimator`, `createDesk`)
- **Constants:** UPPER_SNAKE_CASE for imported constants (`DEPARTMENTS`, `CEO`)
- **Classes:** PascalCase (`CEOAnimator`, `EmployeeAnimator`, `RouteEditor2D`)
- **Functions:** camelCase, verb-first (`createLights`, `loadCharacter`, `updateLabels`)
- **Three.js objects:** Descriptive nouns (`floor`, `sun`, `dragPlane`)

### Code Style

- **Imports:** Group Three.js core first, then addons, then local modules
- **Comments:** Mixed English and French (legacy from development)
- **Indentation:** 4 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required

### Example Pattern

```javascript
// Good: Clear function with scene registration
function createDesk(x, y, z, occupant, color, isHead, dept) {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    // ... mesh creation with shadows
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    state.scene.add(group);
    
    // Register for editor
    group.userData.isDesk = true;
    group.userData.deskData = deskData;
}
```

---

## Configuration System

### Department Configuration (`config.js`)

```javascript
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
    // ... Tech, Security, Personal, Growth
];

export const CEO = { name: 'CEO', role: 'Orchestrator', color: 0xf97316 };
```

### Layout Configuration (JSON)

The office layout can be saved/loaded via JSON files:

```json
{
  "version": "1.0",
  "timestamp": "2026-02-18T23:16:59.129Z",
  "desks": [
    {
      "id": "CEO",
      "role": "Orchestrator",
      "department": null,
      "position": { "x": -0.257, "y": 0, "z": -4.478 },
      "rotation": { "y": -3.142 },
      "isHead": false
    }
  ]
}
```

---

## Editor System

The application includes three editor modes:

### 1. Layout Mode
- **Select:** Click on any desk to select
- **Move:** Drag with move gizmo (red/blue arrows) or input fields
- **Rotate:** Toggle rotation mode for Y-axis rotation

### 2. 2D Route Editor (Recommended)
- **Open:** Click "🗺️ Éditeur 2D (Précis)"
- **Create Route:** Click start desk → Click end desk → Add waypoints → Validate
- **Edit Route:** Click existing route in list → Drag waypoints → Save
- **War Room:** Select War Room destination → Choose from 6 chairs
- **Zoom/Pan:** Mouse wheel zooms to cursor, middle-drag pans
- **Delete:** Select waypoint → Click delete button

### 3. 3D Route Editor
- **Create Routes:** Click "🛤️ Routes 3D (Simple)" button
- **Select Start:** Click departure desk (highlighted green)
- **Select End:** Click arrival desk (highlighted red)
- **Draw Path:** Click on floor to add waypoints
- **Orient:** Left/right click to adjust final facing direction
- **Validate:** Save route with name

### 4. Simulation Mode
- **Select Route:** Click "▶️ Simuler Routes" and choose from list
- **Animation:** Employee will: Stand Up → Walk → Pause/Talk → Return → Sit Down
- **Special Routes:**
  - Door routes: Employee exits/enters through animated door
  - War Room routes: Employee sits at selected chair, faces table
- **Stop:** Click "⏹ Arrêter" to abort

### Export/Import
- **Export:** Downloads `openclaw-config-{timestamp}.json` with desk positions and routes
- **Import:** Load previously saved configuration
- **Employee Menu:** Click on any employee to see their available routes

---

## Animation System

### CEO Animator (`ceoAnimator.js`)

State machine with 4 FBX animations:
1. **IDLE** - Seated Idle (loop)
2. **STAND_UP** - Stand Up (once)
3. **WALK** - Walking (loop)
4. **SIT_DOWN** - Stand To Sit (once)

Route following:
```javascript
ceoAnimator.startRoute([
    { x: 0, z: 1 },      // Start
    { x: -4, z: 1 },     // Waypoint
    { x: -4, z: 0.5 }    // End (CTO desk)
], onComplete);
```

### Employee Animator (`employeeAnimator.js`)

Similar system for any employee with additional features:
- **TALK** - Talking animation for conversations
- **Door animation** - Door opens/closes for exit/entry routes
- **War Room** - Sits at chair, faces table center

Sequence for conversation: Stand Up → Walk to destination → Talk → 180° Turn → Walk back → Sit Down

---

## Pathfinding System

### A* Pathfinder (`pathfinder.js`)

- **Grid size:** 5cm per cell for high precision
- **Obstacles:** 2.5m radius around each desk, room walls
- **Algorithm:** Standard A* with Manhattan distance heuristic
- **Path simplification:** Removes collinear waypoints

Usage:
```javascript
const path = pathfinder.findPath(startX, startZ, endX, endZ);
// Returns: [{x, z}, {x, z}, ...]
```

### Route Generator (`routeGenerator.js`)

Automatically generates routes:
1. CEO → Each Head (5 routes)
2. Head → CEO (5 routes)
3. Head → Their employees
4. Employee → Their Head

---

## Material Handling

All FBX/GLB models require material fixes to prevent transparency artifacts:

```javascript
model.traverse((o) => {
    if (!o.isMesh) return;
    
    // Hide shadow planes
    if (n.includes('shadow') || n.includes('blob')) {
        o.visible = false;
        return;
    }
    
    // Force opaque rendering
    mats.forEach(mat => {
        mat.transparent = false;
        mat.alphaTest = 0;
        mat.depthWrite = true;
        mat.side = THREE.FrontSide;
        mat.needsUpdate = true;
    });
    
    o.castShadow = true;
    o.receiveShadow = true;
});
```

---

## Shadow Configuration

```javascript
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 60;
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 6;
sun.shadow.camera.bottom = -6;
sun.shadow.bias = -0.001;
```

---

## Testing Strategy

This project has **no automated test suite**. Testing is manual:

1. **Visual verification:** All 19 employees seated at desks
2. **Animation check:** CEO and employee route simulations
3. **Editor functionality:** Select, drag, rotate, export, import
4. **Route system:** Create route, simulate, verify animation sequence
5. **2D Editor:** Zoom, pan, create/edit routes, War Room chair selection
6. **Pathfinding:** Auto-generate routes, verify no collisions
7. **Responsiveness:** Resize browser window, canvas adapts
8. **Error scenarios:** Rename .glb/.fbx files to test error UI

---

## Security Considerations

1. **No user input sanitization needed:** Configuration is JSON-based, no server
2. **CDN dependencies:** Loaded from jsdelivr.net (trusted CDN)
3. **No authentication:** Public dashboard display
4. **No sensitive data:** Mock office environment only
5. **File import:** Client-side only, no server upload

---

## Performance Notes

- **Device pixel ratio capped at 2x** to prevent mobile performance issues
- **Shadow map size:** 2048×2048 (balance of quality/performance)
- **Parquet floor:** Procedural texture instead of individual meshes (optimized)
- **Character models:** ~12 MB FBX files (loaded once, reused)
- **No post-processing:** Straight render for maximum compatibility
- **A* grid:** 5cm cells with obstacle caching

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Loading..." stuck | FBX files not found | Check file paths, verify server is running |
| CORS errors in console | Opening file:// directly | Use local web server |
| Character appears transparent | Material alpha issues | Check material fix function is applied |
| Shadows look blocky | Shadow map too small | Already at 2048×2048, adjust camera bounds |
| Editor gizmos not visible | Nothing selected | Click on a desk first |
| Route simulation fails | Model not found | Check employee name matches route |
| 2D editor blank | Canvas sizing issue | Resize browser window to trigger resize handler |

---

## Asset Management

### FBX Animation Files

| File | Purpose | Size |
|------|---------|------|
| `Seated Idle.fbx` | Idle sitting pose | ~12 MB |
| `Stand Up.fbx` | Standing up animation | ~12 MB |
| `Stand To Sit.fbx` | Sitting down animation | ~12 MB |
| `Mr_Man_Walking.fbx` | Walking loop | ~12 MB |
| `Talking.fbx` | Talking animation | ~12 MB |

### GLB Character Models

| File | Purpose | Size |
|------|---------|------|
| `mr_man_walking.glb` | Original model (backup) | ~9 MB |
| `mr_man_walking_fixed.glb` | Active model with fixes | ~11 MB |

---

## File Loading Flow

1. **index.html** loads → shows loading screen
2. **main.js** init() called
3. **Scene setup:** lights, room, furniture
4. **createOfficeLayout():**
   - Try to fetch `default-layout.json`
   - If found: create desks from JSON positions
   - If not found: createDefaultLayout() with hardcoded positions
5. **For each desk:**
   - Create desk geometry
   - Load seated employee FBX (`Seated Idle.fbx`)
   - Increment loading counter
6. **CEO loading:**
   - Load all 4 FBX animations
   - Initialize CEOAnimator
   - Increment loading counter
7. **Loading complete:**
   - Fade out loading screen
   - Fade in canvas
   - Update info panel: "OpenClaw HQ Active | 19 Employees"

---

## Future Enhancement Areas

1. **Instanced rendering** for particle effects
2. **Compressed textures** for better mobile performance
3. **Web Workers** for FBX loading to prevent UI blocking
4. **LOD system** for character models
5. **TypeScript migration** for better code safety

---

*Last updated: 2026-02-19*
