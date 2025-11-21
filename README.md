
# GrandMA3 Macro Agent

AI-powered assistant for fixing and generating GrandMA3 Macros and Lua scripts.

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Google Gemini API Key

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ma3-agent.git
   cd ma3-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment:
   Create a `.env` file in the root directory:
   ```env
   API_KEY=your_google_gemini_api_key
   ```

### Development
To run the application locally:
```bash
npm run dev
```

### Production Deployment (PM2)
To run the application on a server using PM2:

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start the application:**
   Serve the `dist` folder on port 3000 in SPA mode:
   ```bash
   pm2 serve dist 3000 --name "ma3-agent" --spa
   ```

4. **Setup Auto-restart:**
   Save the process list and generate startup script:
   ```bash
   pm2 save
   pm2 startup
   ```

### Desktop App (Windows/Electron)
To package this application as a standalone Windows executable (`.exe`):

1. **Install Electron dependencies:**
   ```bash
   npm install --save-dev electron electron-builder concurrently wait-on cross-env
   ```

2. **Create `electron.js`** in the root directory:
   ```javascript
   const { app, BrowserWindow } = require('electron');
   const path = require('path');

   // Handle creating/removing shortcuts on Windows when installing/uninstalling.
   if (require('electron-squirrel-startup')) {
     app.quit();
   }

   function createWindow() {
     const win = new BrowserWindow({
       width: 1200,
       height: 800,
       title: "GrandMA3 Macro Agent",
       webPreferences: {
         nodeIntegration: true,
         contextIsolation: false
       },
     });

     // In production, load the build file. In dev, load localhost.
     const isDev = !app.isPackaged;
     
     if (isDev) {
       win.loadURL('http://localhost:3000');
     } else {
       win.loadFile(path.join(__dirname, 'dist', 'index.html'));
     }
   }

   app.whenReady().then(createWindow);

   app.on('window-all-closed', () => {
     if (process.platform !== 'darwin') {
       app.quit();
     }
   });
   ```

3. **Update `package.json`:**
   Add the `main` entry and `build` config. Add the `electron:build` script.
   ```json
   {
     "main": "electron.js",
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "electron:dev": "concurrently \"cross-env BROWSER=none npm run dev\" \"wait-on http://localhost:3000 && electron .\"",
       "electron:build": "npm run build && electron-builder"
     },
     "build": {
       "appId": "com.ma3agent.app",
       "productName": "MA3 Agent",
       "directories": {
         "output": "release"
       },
       "win": {
         "target": "nsis"
       }
     }
   }
   ```

4. **Build:**
   ```bash
   npm run electron:build
   ```
   The `.exe` file will be generated in the `release` folder.

### Management
- Restart: `pm2 restart ma3-agent`
- Stop: `pm2 stop ma3-agent`
- Logs: `pm2 logs ma3-agent`
