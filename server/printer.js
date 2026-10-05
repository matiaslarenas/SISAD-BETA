/**
 * Impresión de tickets en la impresora térmica USB conectada al desktop.
 *
 * El desktop ya tiene la impresora instalada en Windows con su driver
 * (imprime bien una página de prueba desde el propio SO). Para hablar el
 * protocolo ESC/POS (negrita, corte de papel, alineación) sin agregar una
 * dependencia externa de acceso a USB —regla no negociable del servidor,
 * ver AI_RULES / skill meson-backend— se envían los bytes crudos al driver
 * ya instalado a través del recurso compartido de Windows con
 * `copy /b`, que el spooler pasa tal cual al puerto sin reinterpretarlos.
 *
 * Configuración única por desktop (una vez):
 *   1. Panel de Control > Dispositivos e impresoras.
 *   2. Clic derecho en la impresora térmica > Propiedades de impresora.
 *   3. Pestaña "Compartir" > "Compartir esta impresora" > nombre corto,
 *      ej. "TICKETS".
 *   4. Si el nombre no es "TICKETS", configurar la variable de entorno
 *      PRINTER_SHARE, ej. PRINTER_SHARE=\\localhost\MiImpresora
 *
 * En Linux (servidor Ubuntu) hay dos modos, elegidos con PRINTER_MODE:
 *   - "device" (por defecto fuera de Windows): escribe los bytes directo
 *     en el dispositivo USB, PRINTER_DEVICE (por defecto /dev/usb/lp0).
 *     El usuario que corre el servidor debe estar en el grupo "lp".
 *   - "cups": envía los bytes a una cola raw de CUPS con
 *     `lp -d $PRINTER_QUEUE -o raw`.
 * En Windows el modo por defecto es "windows-share" (lo de arriba).
 */
import { exec, execFile } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ESC = "\x1b";
const GS = "\x1d";

const INIT = `${ESC}@`;
const ALIGN_CENTER = `${ESC}a\x01`;
const ALIGN_LEFT = `${ESC}a\x00`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const DOUBLE_ON = `${GS}!\x11`;
const DOUBLE_OFF = `${GS}!\x00`;
const CUT = `${GS}V\x00`;

// Impresora térmica de 58mm: 32 columnas en fuente normal.
const LINE_WIDTH = 32;
const NAME_WIDTH = 19;
const QTY_WIDTH = 3;
const PRICE_WIDTH = 8;

function padRight(text, width) {
  const value = String(text);
  return value.length >= width ? value.slice(0, width) : value + " ".repeat(width - value.length);
}

function padLeft(text, width) {
  const value = String(text);
  return value.length >= width ? value.slice(0, width) : " ".repeat(width - value.length) + value;
}

function formatMoney(amount) {
  return Math.round(amount || 0).toLocaleString("es-CL");
}

function formatItemLine(item) {
  const qty = padRight(`${item.quantity}x`, QTY_WIDTH);
  const name = padRight(item.name || "", NAME_WIDTH);
  const total = formatMoney(item.totalPrice ?? item.quantity * item.unitPrice);
  return `${qty}${name}${padLeft(total, PRICE_WIDTH)}\n`;
}

const TIP_RATE = 0.1;

// Comanda para cocina: qué se pide y cuánto, sin precios (la cocina no
// cobra). El ítem y la cantidad van en letra grande para que se lean
// desde lejos; la nota del pedido (si existe) y la hora ayudan a
// priorizar y a resolver dudas sobre modificaciones al plato.
export function buildKitchenComandaTicket(sale) {
  const parts = [];

  parts.push(INIT);
  parts.push(ALIGN_CENTER, BOLD_ON, DOUBLE_ON);
  parts.push("COMANDA COCINA\n");
  parts.push(DOUBLE_OFF, BOLD_OFF);
  parts.push(`${sale.tableOrCustomer || "Mostrador"}\n`);
  if (sale.id) parts.push(`${sale.id}\n`);
  parts.push(`Hora: ${sale.time || ""}\n`);
  parts.push(ALIGN_LEFT);
  parts.push("-".repeat(LINE_WIDTH) + "\n");

  parts.push(BOLD_ON, DOUBLE_ON);
  for (const item of sale.items || []) {
    parts.push(`${item.quantity}x ${item.name || ""}\n`);
  }
  parts.push(DOUBLE_OFF, BOLD_OFF);

  parts.push("-".repeat(LINE_WIDTH) + "\n");
  if (sale.notes) {
    parts.push(BOLD_ON, `Nota: ${sale.notes}\n`, BOLD_OFF);
  }
  parts.push("\n\n\n");
  parts.push(CUT);

  return Buffer.from(parts.join(""), "latin1");
}

// Cuenta final para el cliente: detalle de productos con precio, total
// de la cuenta, sugerencia de propina del 10% y el total incluyéndola.
// Recibe un objeto venta/pedido con la misma forma que produce
// normalizeSale en src/state/appState.js (id, tableOrCustomer, date,
// time, items, totalAmount, paymentMethod, notes).
export function buildCustomerReceiptTicket(sale) {
  const parts = [];

  parts.push(INIT);
  parts.push(ALIGN_CENTER, BOLD_ON, DOUBLE_ON);
  parts.push("El Meson de Los Laureles\n");
  parts.push(DOUBLE_OFF, BOLD_OFF);
  parts.push(`${sale.tableOrCustomer || "Mostrador"}\n`);
  if (sale.id) parts.push(`${sale.id}\n`);
  parts.push(`${sale.date || ""} ${sale.time || ""}\n`);
  parts.push(ALIGN_LEFT);
  parts.push("-".repeat(LINE_WIDTH) + "\n");

  for (const item of sale.items || []) {
    parts.push(formatItemLine(item));
  }

  const subtotal = sale.totalAmount || 0;
  const tip = Math.round(subtotal * TIP_RATE);
  const totalWithTip = subtotal + tip;

  parts.push("-".repeat(LINE_WIDTH) + "\n");
  parts.push(BOLD_ON);
  parts.push(padRight("TOTAL", LINE_WIDTH - PRICE_WIDTH) + padLeft(`$${formatMoney(subtotal)}`, PRICE_WIDTH) + "\n");
  parts.push(BOLD_OFF);
  parts.push(padRight("Sugerencia propina 10%", LINE_WIDTH - PRICE_WIDTH) + padLeft(`$${formatMoney(tip)}`, PRICE_WIDTH) + "\n");
  parts.push(BOLD_ON);
  parts.push(padRight("TOTAL + PROPINA", LINE_WIDTH - PRICE_WIDTH) + padLeft(`$${formatMoney(totalWithTip)}`, PRICE_WIDTH) + "\n");
  parts.push(BOLD_OFF);
  parts.push(`Pago: ${sale.paymentMethod || ""}\n`);
  if (sale.notes) {
    parts.push(`Notas: ${sale.notes}\n`);
  }
  parts.push("\n\n\n");
  parts.push(CUT);

  return Buffer.from(parts.join(""), "latin1");
}

const DEFAULT_SHARE = "\\\\localhost\\TICKETS";
const DEFAULT_DEVICE = "/dev/usb/lp0";

// Decide cómo y a dónde enviar el ticket según las variables de entorno.
// Sin PRINTER_MODE, Windows usa el recurso compartido (como hasta ahora)
// y cualquier otro sistema escribe directo al dispositivo USB.
export function resolvePrinterTarget(env = process.env, platform = process.platform) {
  const mode = env.PRINTER_MODE || (platform === "win32" ? "windows-share" : "device");

  if (mode === "windows-share") {
    if (platform !== "win32") {
      throw new Error(
        'PRINTER_MODE "windows-share" solo funciona en Windows. En Linux usa "device" o "cups" (ver server/printer.js).'
      );
    }
    return { mode, share: env.PRINTER_SHARE || DEFAULT_SHARE };
  }

  if (mode === "device") {
    return { mode, device: env.PRINTER_DEVICE || DEFAULT_DEVICE };
  }

  if (mode === "cups") {
    if (!env.PRINTER_QUEUE) {
      throw new Error(
        'PRINTER_MODE "cups" requiere PRINTER_QUEUE con el nombre de la cola raw de CUPS.'
      );
    }
    return { mode, queue: env.PRINTER_QUEUE };
  }

  throw new Error(
    `PRINTER_MODE desconocido: "${mode}". Valores válidos: windows-share, device, cups.`
  );
}

const defaultIo = { writeFile, unlink, exec, execFile };

function buildTmpPath() {
  return path.join(
    tmpdir(),
    `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}.prn`
  );
}

async function sendThroughTmpFile(buffer, io, send) {
  const tmpPath = buildTmpPath();
  await io.writeFile(tmpPath, buffer);
  try {
    await send(tmpPath);
  } finally {
    await io.unlink(tmpPath).catch(() => {});
  }
}

function sendToWindowsShare(buffer, share, io) {
  return sendThroughTmpFile(buffer, io, (tmpPath) =>
    new Promise((resolve, reject) => {
      io.exec(`copy /b "${tmpPath}" "${share}"`, (error, _stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `No se pudo enviar el ticket a la impresora (${share}). ` +
                `Verifica que esté compartida en Windows con ese nombre (ver server/printer.js). Detalle: ${
                  stderr || error.message
                }`
            )
          );
          return;
        }
        resolve();
      });
    })
  );
}

async function sendToDevice(buffer, device, io) {
  try {
    // "r+" no crea el archivo: si la impresora no está conectada se
    // obtiene ENOENT en vez de escribir el ticket en un archivo normal.
    await io.writeFile(device, buffer, { flag: "r+" });
  } catch (error) {
    let hint = "Verifica que la impresora esté conectada y encendida.";
    if (error.code === "ENOENT") {
      hint = "No existe ese dispositivo: revisa la conexión USB y PRINTER_DEVICE.";
    } else if (error.code === "EACCES" || error.code === "EPERM") {
      hint = 'Sin permisos: el usuario que corre el servidor debe estar en el grupo "lp".';
    }
    throw new Error(
      `No se pudo enviar el ticket a la impresora (${device}). ${hint} Detalle: ${error.message}`
    );
  }
}

function sendToCups(buffer, queue, io) {
  return sendThroughTmpFile(buffer, io, (tmpPath) =>
    new Promise((resolve, reject) => {
      io.execFile("lp", ["-d", queue, "-o", "raw", tmpPath], (error, _stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `No se pudo enviar el ticket a la cola de CUPS "${queue}". ` +
                `Verifica que exista (lpstat -p) y sea raw. Detalle: ${stderr || error.message}`
            )
          );
          return;
        }
        resolve();
      });
    })
  );
}

// Los tickets se envían de a uno: la comanda y la cuenta pueden pedirse
// casi al mismo tiempo y no deben mezclarse en el dispositivo.
let printQueue = Promise.resolve();

export function printTicketBuffer(
  buffer,
  { env = process.env, platform = process.platform, io = defaultIo } = {}
) {
  const job = printQueue.then(() => {
    const target = resolvePrinterTarget(env, platform);
    if (target.mode === "windows-share") return sendToWindowsShare(buffer, target.share, io);
    if (target.mode === "device") return sendToDevice(buffer, target.device, io);
    return sendToCups(buffer, target.queue, io);
  });
  printQueue = job.catch(() => {});
  return job;
}
