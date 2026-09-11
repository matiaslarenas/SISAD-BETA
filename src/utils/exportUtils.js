/**
 * Utilidades para exportación y respaldo de datos en formato JSON y CSV.
 */

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_VERSION = "1.0.0";

/**
 * Empaqueta el estado en un envoltorio de respaldo con metadatos de seguridad y esquema.
 */
export function buildBackupEnvelope(rawState) {
  return {
    backupVersion: BACKUP_APP_VERSION,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    system: "Sistema Restaurante Los Laureles",
    data: {
      inventoryCatalog: rawState.inventoryCatalog || [],
      inventoryMovements: rawState.inventoryMovements || [],
      suppliers: rawState.suppliers || [],
      recipes: rawState.recipes || [],
      purchases: rawState.purchases || [],
      sales: rawState.sales || [],
    },
  };
}

export function downloadJsonFile(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

export function downloadCsvFile(headers, rows, filename) {
  const csvContent = [
    headers.join(";"),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (cell == null) return "";
          const str = String(cell).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(";")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

function triggerDownload(blob, filename) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
