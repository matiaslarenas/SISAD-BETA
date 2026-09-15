/**
 * Servidor local de El Mesón de Los Laureles.
 *
 * Corre en el computador de escritorio. La tablet y los celulares se
 * conectan a este servidor por la red WiFi local — no requiere internet.
 *
 * Sin dependencias externas (solo módulos nativos de Node): sirve el
 * build de producción (`dist/`) y expone una API JSON simple que aplica
 * las mismas funciones puras de `src/state/appState.js` que antes corrían
 * solo en el navegador de cada dispositivo. Ahora hay una única fuente de
 * verdad (este proceso), y cada dispositivo consulta/actualiza contra ella.
 *
 * Sincronización entre dispositivos: por simplicidad y para no depender de
 * paquetes externos (este servidor no requiere `npm install` de nada
 * nuevo), se usa polling corto desde el cliente en vez de WebSockets. Con
 * varios dispositivos en la misma red local el retraso es de ~1-2
 * segundos, lo cual es aceptable para POS/inventario. Si más adelante
 * quieren latencia menor, se puede agregar el paquete `ws` y reemplazar
 * el polling por push en tiempo real sin tocar la lógica de negocio.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appDataReducer } from "../src/state/rootReducer.js";
import { loadState, saveState } from "./persistence.js";
import {
  buildKitchenComandaTicket,
  buildCustomerReceiptTicket,
  printTicketBuffer,
} from "./printer.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

// --- Estado en memoria + persistencia en disco -----------------------

let state = loadState();
let revision = 1;

function applyAction(action) {
  state = appDataReducer(state, action);
  revision += 1;
  saveState(state);
  return state;
}

// --- Utilidades HTTP ----------------------------------------------------

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 5_000_000) {
        req.destroy();
        reject(new Error("Cuerpo de la petición demasiado grande"));
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function serveStatic(req, res, pathname) {
  if (!existsSync(DIST_DIR)) {
    sendJson(res, 500, {
      error:
        "No existe la carpeta dist/. Corre 'npm run build' antes de iniciar el servidor.",
    });
    return;
  }

  let filePath = path.join(DIST_DIR, pathname === "/" ? "index.html" : pathname);

  // Protección básica de path traversal.
  if (!filePath.startsWith(DIST_DIR)) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  if (!existsSync(filePath) || path.extname(filePath) === "") {
    // Fallback de SPA: cualquier ruta de cliente (react-router) sirve index.html.
    filePath = path.join(DIST_DIR, "index.html");
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "No encontrado" });
  }
}

// --- Rutas de la API ------------------------------------------------------

async function handleApi(req, res, pathname) {
  if (pathname === "/api/state" && req.method === "GET") {
    sendJson(res, 200, { revision, data: state });
    return;
  }

  if (pathname === "/api/dispatch" && req.method === "POST") {
    try {
      const raw = await readRequestBody(req);
      const action = JSON.parse(raw || "{}");

      if (!action || typeof action.type !== "string") {
        sendJson(res, 400, { error: "Acción inválida: falta 'type'." });
        return;
      }

      const newState = applyAction(action);
      sendJson(res, 200, { revision, data: newState });
    } catch (error) {
      console.error("[api/dispatch]", error);
      sendJson(res, 400, { error: "No se pudo procesar la acción." });
    }
    return;
  }

  if (pathname === "/api/print-ticket" && req.method === "POST") {
    try {
      const raw = await readRequestBody(req);
      const { kind, ...sale } = JSON.parse(raw || "{}");
      const buffer =
        kind === "kitchen"
          ? buildKitchenComandaTicket(sale)
          : buildCustomerReceiptTicket(sale);
      await printTicketBuffer(buffer);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error("[api/print-ticket]", error);
      sendJson(res, 500, { error: error.message || "No se pudo imprimir el ticket." });
    }
    return;
  }

  sendJson(res, 404, { error: "Ruta de API no encontrada" });
}

// --- Servidor ---------------------------------------------------------

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname).catch((error) => {
      console.error(error);
      sendJson(res, 500, { error: "Error interno del servidor" });
    });
    return;
  }

  serveStatic(req, res, pathname).catch((error) => {
    console.error(error);
    sendJson(res, 500, { error: "Error interno del servidor" });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`El Mesón de Los Laureles — servidor local`);
  console.log(`Escuchando en el puerto ${PORT}.`);
  console.log(
    `Desde este mismo computador: http://localhost:${PORT}`
  );
  console.log(
    `Desde la tablet o celular (misma red WiFi): http://<IP-de-este-computador>:${PORT}`
  );
});
