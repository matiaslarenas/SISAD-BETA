export function formatCurrency(value) {
  return new Intl.NumberFormat(
    "es-CL",
    {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }
  ).format(value);
}

export function parseCurrency(value) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const cleaned = String(value).replace(
    /[^\d.,-]/g,
    ""
  );

  const hasComma = cleaned.includes(",");

  const normalized = hasComma
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\./g, "");

  const num = Number.parseFloat(normalized);

  return Number.isNaN(num) ? 0 : num;
}

export function parsePercent(value) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  const cleaned = String(value).replace(
    /[^\d.,-]/g,
    ""
  );

  const num = Number.parseFloat(
    cleaned.replace(".", "").replace(",", ".")
  );

  return Number.isNaN(num) ? 0 : num;
}
