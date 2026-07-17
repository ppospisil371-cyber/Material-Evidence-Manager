import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { createServer } from "net";
import http from "http";

const isDev = !app.isPackaged;

function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address() as { port: number };
      srv.close(() => resolve(addr.port));
    });
  });
}

function waitForServer(port: number, attempts = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.request(
        { host: "127.0.0.1", port, path: "/api/health" },
        (res) => {
          if (res.statusCode === 200) resolve();
          else retry();
        }
      );
      req.on("error", retry);
      req.end();
    };
    const retry = () => {
      if (attempts++ > 40) {
        reject(new Error("Server did not start in time"));
      } else {
        setTimeout(check, 250);
      }
    };
    check();
  });
}

let win: BrowserWindow | null = null;
let serverPort: number | null = null;

function createWindow(port: number) {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Evidence přípojek",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(`http://127.0.0.1:${port}/`);

  if (isDev) win.webContents.openDevTools();

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.on("closed", () => {
    win = null;
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (win === null && serverPort !== null) createWindow(serverPort);
});

app.whenReady().then(async () => {
  const port = await getAvailablePort();
  serverPort = port;

  const dbPath = path.join(app.getPath("userData"), "evidence-pripojek.sqlite");

  const fontsDir = app.isPackaged
    ? path.join(process.resourcesPath, "fonts")
    : path.join(__dirname, "../assets/fonts");

  const rendererDir = app.isPackaged
    ? path.join(process.resourcesPath, "renderer")
    : path.join(__dirname, "../renderer");

  process.env.PORT = String(port);
  process.env.DB_PATH = dbPath;
  process.env.FONTS_DIR = fontsDir;
  process.env.RENDERER_DIR = rendererDir;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createApp } = require("./server/index") as typeof import("./server/index");
  const expressApp = createApp();
  expressApp.listen(port, "127.0.0.1", () => {
    console.log(`[desktop] Server running on http://127.0.0.1:${port}`);
  });

  await waitForServer(port);
  createWindow(port);
});
