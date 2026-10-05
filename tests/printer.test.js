import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildKitchenComandaTicket,
  buildCustomerReceiptTicket,
  printTicketBuffer,
  resolvePrinterTarget,
} from "../server/printer.js";

const SAMPLE_SALE = {
  id: "VTA-1001",
  tableOrCustomer: "Mesa 3",
  date: "2026-09-15",
  time: "20:30",
  paymentMethod: "Efectivo",
  notes: "Sin cebolla",
  items: [
    { name: "Pizza Napolitana", quantity: 2, unitPrice: 8000, totalPrice: 16000 },
    { name: "Bebida", quantity: 1, unitPrice: 1500, totalPrice: 1500 },
  ],
  totalAmount: 17500,
};

test("buildKitchenComandaTicket returns a Buffer that starts with the ESC/POS init command", () => {
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);
  assert.ok(Buffer.isBuffer(buffer));
  assert.equal(buffer[0], 0x1b); // ESC
  assert.equal(buffer[1], 0x40); // @
});

test("buildKitchenComandaTicket includes table, items with quantity, the order note and the time — no prices", () => {
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);
  const text = buffer.toString("latin1");

  assert.match(text, /Mesa 3/);
  assert.match(text, /2x Pizza Napolitana/);
  assert.match(text, /1x Bebida/);
  assert.match(text, /20:30/);
  assert.match(text, /Sin cebolla/);
  assert.doesNotMatch(text, /17.500/);
  assert.doesNotMatch(text, /8.000/);
});

test("buildKitchenComandaTicket omits the note line when there is none", () => {
  const buffer = buildKitchenComandaTicket({ ...SAMPLE_SALE, notes: "" });
  const text = buffer.toString("latin1");

  assert.doesNotMatch(text, /Nota:/);
});

test("buildKitchenComandaTicket ends with the paper cut command", () => {
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);
  const tail = buffer.subarray(buffer.length - 3);

  assert.equal(tail[0], 0x1d); // GS
  assert.equal(tail[1], 0x56); // V
  assert.equal(tail[2], 0x00); // corte total
});

test("buildKitchenComandaTicket handles a ticket with no items or notes", () => {
  const buffer = buildKitchenComandaTicket({
    id: "VTA-1002",
    tableOrCustomer: "Mostrador",
    items: [],
    totalAmount: 0,
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString("latin1"), /Mostrador/);
});

test("buildCustomerReceiptTicket includes table, items, total and payment method as readable text", () => {
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);
  const text = buffer.toString("latin1");

  assert.match(text, /Mesa 3/);
  assert.match(text, /Pizza Napolitana/);
  assert.match(text, /Bebida/);
  assert.match(text, /17.500/);
  assert.match(text, /Efectivo/);
  assert.match(text, /Sin cebolla/);
});

test("buildCustomerReceiptTicket suggests a 10% tip and includes the total with tip", () => {
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);
  const text = buffer.toString("latin1");

  // 17500 * 0.10 = 1750; 17500 + 1750 = 19250
  assert.match(text, /Sugerencia propina 10%/);
  assert.match(text, /1.750/);
  assert.match(text, /TOTAL \+ PROPINA/);
  assert.match(text, /19.250/);
});

test("buildCustomerReceiptTicket ends with the paper cut command", () => {
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);
  const tail = buffer.subarray(buffer.length - 3);

  assert.equal(tail[0], 0x1d); // GS
  assert.equal(tail[1], 0x56); // V
  assert.equal(tail[2], 0x00); // corte total
});

test("buildCustomerReceiptTicket handles a ticket with no items or notes", () => {
  const buffer = buildCustomerReceiptTicket({
    id: "VTA-1002",
    tableOrCustomer: "Mostrador",
    items: [],
    totalAmount: 0,
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.match(buffer.toString("latin1"), /Mostrador/);
});

// --- Envío a la impresora (sin hardware: se inyectan fs/child_process) ---

// Registra las llamadas que haría el envío real, sin tocar disco ni USB.
function createFakeIo({ writeError = null, execError = null } = {}) {
  const calls = [];
  return {
    calls,
    io: {
      writeFile: async (target, data, options) => {
        calls.push({ fn: "writeFile", target, data, options });
        if (writeError && !String(target).endsWith(".prn")) throw writeError;
      },
      unlink: async (target) => {
        calls.push({ fn: "unlink", target });
      },
      exec: (command, callback) => {
        calls.push({ fn: "exec", command });
        callback(execError, "", execError ? "fallo" : "");
      },
      execFile: (file, args, callback) => {
        calls.push({ fn: "execFile", file, args });
        callback(execError, "", execError ? "fallo" : "");
      },
    },
  };
}

function errorWithCode(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

test("resolvePrinterTarget keeps the Windows share as the default on Windows", () => {
  assert.deepEqual(resolvePrinterTarget({}, "win32"), {
    mode: "windows-share",
    share: "\\\\localhost\\TICKETS",
  });
  assert.deepEqual(resolvePrinterTarget({ PRINTER_SHARE: "\\\\localhost\\CAJA" }, "win32"), {
    mode: "windows-share",
    share: "\\\\localhost\\CAJA",
  });
});

test("resolvePrinterTarget defaults to the USB device on Linux", () => {
  assert.deepEqual(resolvePrinterTarget({}, "linux"), {
    mode: "device",
    device: "/dev/usb/lp0",
  });
  assert.deepEqual(resolvePrinterTarget({ PRINTER_DEVICE: "/dev/usb/lp1" }, "linux"), {
    mode: "device",
    device: "/dev/usb/lp1",
  });
});

test("resolvePrinterTarget uses CUPS only with a queue name", () => {
  assert.deepEqual(
    resolvePrinterTarget({ PRINTER_MODE: "cups", PRINTER_QUEUE: "xprinter" }, "linux"),
    { mode: "cups", queue: "xprinter" }
  );
  assert.throws(() => resolvePrinterTarget({ PRINTER_MODE: "cups" }, "linux"), /PRINTER_QUEUE/);
});

test("resolvePrinterTarget rejects unknown modes and the Windows share outside Windows", () => {
  assert.throws(() => resolvePrinterTarget({ PRINTER_MODE: "bluetooth" }, "linux"), /desconocido/);
  assert.throws(
    () => resolvePrinterTarget({ PRINTER_MODE: "windows-share" }, "linux"),
    /solo funciona en Windows/
  );
});

test("printTicketBuffer on Windows copies a temp file to the share and removes it", async () => {
  const fake = createFakeIo();
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);

  await printTicketBuffer(buffer, { env: {}, platform: "win32", io: fake.io });

  const [write, exec, unlink] = fake.calls;
  assert.equal(write.fn, "writeFile");
  assert.equal(write.data, buffer);
  assert.equal(exec.fn, "exec");
  assert.equal(exec.command, `copy /b "${write.target}" "\\\\localhost\\TICKETS"`);
  assert.equal(unlink.fn, "unlink");
  assert.equal(unlink.target, write.target);
});

test("printTicketBuffer in device mode writes the raw bytes to the device", async () => {
  const fake = createFakeIo();
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);

  await printTicketBuffer(buffer, { env: {}, platform: "linux", io: fake.io });

  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].target, "/dev/usb/lp0");
  assert.equal(fake.calls[0].data, buffer);
  // Sin crear el archivo si el dispositivo no existe.
  assert.deepEqual(fake.calls[0].options, { flag: "r+" });
});

test("printTicketBuffer in device mode explains missing device and missing permissions", async () => {
  const buffer = buildCustomerReceiptTicket(SAMPLE_SALE);

  await assert.rejects(
    printTicketBuffer(buffer, {
      env: {},
      platform: "linux",
      io: createFakeIo({ writeError: errorWithCode("ENOENT") }).io,
    }),
    /No existe ese dispositivo/
  );
  await assert.rejects(
    printTicketBuffer(buffer, {
      env: {},
      platform: "linux",
      io: createFakeIo({ writeError: errorWithCode("EACCES") }).io,
    }),
    /grupo "lp"/
  );
});

test("printTicketBuffer in device mode does not create a file when the printer is disconnected", async () => {
  // Usa el fs real: con la impresora desconectada el dispositivo no existe,
  // y escribir no debe crear un archivo normal en su lugar.
  const dir = mkdtempSync(path.join(tmpdir(), "printer-test-"));
  const device = path.join(dir, "lp0");
  try {
    await assert.rejects(
      printTicketBuffer(buildCustomerReceiptTicket(SAMPLE_SALE), {
        env: { PRINTER_DEVICE: device },
        platform: "linux",
      }),
      /No existe ese dispositivo/
    );
    assert.equal(existsSync(device), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("printTicketBuffer in CUPS mode sends a raw job with lp and removes the temp file", async () => {
  const fake = createFakeIo();
  const buffer = buildKitchenComandaTicket(SAMPLE_SALE);

  await printTicketBuffer(buffer, {
    env: { PRINTER_MODE: "cups", PRINTER_QUEUE: "xprinter" },
    platform: "linux",
    io: fake.io,
  });

  const [write, lp, unlink] = fake.calls;
  assert.equal(lp.fn, "execFile");
  assert.equal(lp.file, "lp");
  assert.deepEqual(lp.args, ["-d", "xprinter", "-o", "raw", write.target]);
  assert.equal(unlink.target, write.target);
});

test("printTicketBuffer removes the temp file even when CUPS fails", async () => {
  const fake = createFakeIo({ execError: new Error("lp falló") });

  await assert.rejects(
    printTicketBuffer(buildKitchenComandaTicket(SAMPLE_SALE), {
      env: { PRINTER_MODE: "cups", PRINTER_QUEUE: "xprinter" },
      platform: "linux",
      io: fake.io,
    }),
    /cola de CUPS "xprinter"/
  );
  assert.equal(fake.calls.at(-1).fn, "unlink");
});

test("printTicketBuffer sends tickets one at a time and keeps going after a failure", async () => {
  const order = [];
  let releaseFirst;
  const io = {
    writeFile: (target, data) => {
      order.push(`start:${data}`);
      if (data === "uno") {
        return new Promise((resolve, reject) => {
          releaseFirst = () => {
            order.push("end:uno");
            reject(new Error("falla la primera"));
          };
        });
      }
      order.push(`end:${data}`);
      return Promise.resolve();
    },
  };
  const options = { env: {}, platform: "linux", io };

  const first = printTicketBuffer("uno", options);
  const second = printTicketBuffer("dos", options);
  await new Promise((resolve) => setImmediate(resolve));
  releaseFirst();

  await assert.rejects(first, /falla la primera/);
  await second;
  assert.deepEqual(order, ["start:uno", "end:uno", "start:dos", "end:dos"]);
});
