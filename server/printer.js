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
 */
import { exec } from "node:child_process";
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

// Genera los bytes ESC/POS del ticket a partir de un objeto venta/pedido
// con la misma forma que produce normalizeSale en src/state/appState.js
// (id, tableOrCustomer, date, time, items, totalAmount, paymentMethod, notes).
export function buildEscPosTicket(sale) {
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

  parts.push("-".repeat(LINE_WIDTH) + "\n");
  parts.push(BOLD_ON);
  parts.push(padRight("TOTAL", LINE_WIDTH - PRICE_WIDTH) + padLeft(`$${formatMoney(sale.totalAmount)}`, PRICE_WIDTH) + "\n");
  parts.push(BOLD_OFF);
  parts.push(`Pago: ${sale.paymentMethod || ""}\n`);
  if (sale.notes) {
    parts.push(`Notas: ${sale.notes}\n`);
  }
  parts.push("\n\n\n");
  parts.push(CUT);

  return Buffer.from(parts.join(""), "latin1");
}

const PRINTER_SHARE = process.env.PRINTER_SHARE || "\\\\localhost\\TICKETS";

export async function printTicketBuffer(buffer) {
  if (process.platform !== "win32") {
    throw new Error(
      "La impresión térmica solo está implementada para Windows (ver server/printer.js)."
    );
  }

  const tmpPath = path.join(
    tmpdir(),
    `ticket-${Date.now()}-${Math.random().toString(36).slice(2)}.prn`
  );
  await writeFile(tmpPath, buffer);

  try {
    await new Promise((resolve, reject) => {
      exec(`copy /b "${tmpPath}" "${PRINTER_SHARE}"`, (error, _stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `No se pudo enviar el ticket a la impresora (${PRINTER_SHARE}). ` +
                `Verifica que esté compartida en Windows con ese nombre (ver server/printer.js). Detalle: ${
                  stderr || error.message
                }`
            )
          );
          return;
        }
        resolve();
      });
    });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
