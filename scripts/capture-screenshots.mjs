import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs", "screenshots");
const userDataDir = path.join(rootDir, `.tmp-edge-profile-${Date.now()}`);
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9222;
const baseUrl = process.env.SITE_URL || "http://127.0.0.1:3000";

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(userDataDir, { recursive: true, force: true });

  const browser = spawn(edgePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], {
    stdio: "ignore",
  });

  try {
    await waitForDebugPort();
    await capturePage(`${baseUrl}/`, path.join(outputDir, "input-form.png"));
    await captureResults(`${baseUrl}/`, path.join(outputDir, "audit-results.png"));

    const audit = await createAudit();
    await capturePage(`${baseUrl}/a/${audit.publicId}`, path.join(outputDir, "public-report.png"));
    console.log(`Saved screenshots to ${outputDir}`);
  } finally {
    browser.kill();
    await wait(1200);
    await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function createAudit() {
  const response = await fetch(`${baseUrl}/api/audits`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      teamSize: 12,
      useCase: "mixed",
      tools: [
        { id: "1", toolId: "openai_api", planId: "frontier", monthlySpend: 1200, seats: 1 },
        { id: "2", toolId: "chatgpt", planId: "team", monthlySpend: 360, seats: 12 },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Audit API returned ${response.status}`);
  }

  return response.json();
}

async function captureResults(url, filePath) {
  const client = await openPage(url);
  try {
    await wait(900);
    await client.send("Runtime.evaluate", {
      expression: "document.querySelector('form.panel')?.requestSubmit()",
      awaitPromise: false,
    });
    await waitForCondition(client, "Boolean(document.querySelector('.share-box'))", 10000);
    await wait(600);
    await screenshot(client, filePath);
  } finally {
    client.close();
  }
}

async function capturePage(url, filePath) {
  const client = await openPage(url);
  try {
    await wait(900);
    await screenshot(client, filePath);
  } finally {
    client.close();
  }
}

async function openPage(url) {
  const target = await createTarget(url);
  const client = await CdpClient.connect(target.webSocketDebuggerUrl);
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1200,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return client;
}

async function createTarget(url) {
  const version = await fetchJson(`http://127.0.0.1:${debugPort}/json/version`);
  const browserClient = await CdpClient.connect(version.webSocketDebuggerUrl);
  const created = await browserClient.send("Target.createTarget", { url });
  browserClient.close();

  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    const target = targets.find((item) => item.id === created.targetId);
    if (target?.webSocketDebuggerUrl) {
      return target;
    }
    await wait(100);
  }

  throw new Error("Could not find created Edge target.");
}

async function screenshot(client, filePath) {
  const captured = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    fromSurface: true,
  });
  await fs.writeFile(filePath, Buffer.from(captured.data, "base64"));
}

async function waitForCondition(client, expression, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await client.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    if (result.result?.value) {
      return;
    }
    await wait(250);
  }
  throw new Error(`Condition timed out: ${expression}`);
}

async function waitForDebugPort() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    try {
      await fetchJson(`http://127.0.0.1:${debugPort}/json/version`);
      return;
    } catch {
      await wait(250);
    }
  }
  throw new Error("Edge debugging port did not open.");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.json();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpClient {
  static async connect(url) {
    const socket = new WebSocket(url);
    const client = new CdpClient(socket);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return client;
  }

  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.socket.addEventListener("message", (event) => {
      const payload = JSON.parse(event.data);
      if (payload.id && this.pending.has(payload.id)) {
        const { resolve, reject } = this.pending.get(payload.id);
        this.pending.delete(payload.id);
        if (payload.error) {
          reject(new Error(payload.error.message));
        } else {
          resolve(payload.result ?? {});
        }
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    this.socket.close();
  }
}

await main();
