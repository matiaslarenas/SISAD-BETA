import { useMemo, useState } from "react";

import {
  DollarSign,
  Package,
  Recycle,
  TrendingUp,
  AlertOctagon,
  Calendar,
  History,
} from "lucide-react";

import MetricCard from "../components/MetricCard";
import ReportsTable from "../components/ReportsTable";
import ReportsChart from "../components/ReportsCharts";
import SearchBar from "../components/SearchBar";
import { useAppData } from "../context/AppDataContext";
import { formatCurrency, parsePercent } from "../utils/format";
import { downloadCsvFile } from "../utils/exportUtils";
import { toast } from "sonner";
import { reports } from "../data/reportsData";

function Reports() {
  const { sales, inventoryMovements, inventory, purchases, dailySnapshots = [] } = useAppData();
  const [search, setSearch] = useState("");

  // Solo las ventas cerradas (pagadas) cuentan como ingresos: los pedidos
  // pendientes (mesas activas aún no cobradas) no deben contabilizarse.
  const activeSales = useMemo(
    () => sales.filter((s) => s.status === "completed"),
    [sales]
  );

  const totalSalesRevenue = useMemo(
    () => activeSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    [activeSales]
  );

  const totalSalesCost = useMemo(
    () => activeSales.reduce((sum, s) => sum + (s.totalCost || 0), 0),
    [activeSales]
  );

  const totalProfit = totalSalesRevenue - totalSalesCost;
  const overallMargin =
    totalSalesRevenue > 0 ? (totalProfit / totalSalesRevenue) * 100 : 0;

  // Waste metrics calculation
  const wasteMovements = useMemo(
    () => inventoryMovements.filter((m) => m.type === "waste"),
    [inventoryMovements]
  );

  const totalWasteCost = useMemo(
    () =>
      wasteMovements.reduce((sum, m) => {
        const cost = m.totalCost != null
          ? m.totalCost
          : Math.abs(m.quantity) * (m.unitCost || 0);
        return sum + cost;
      }, 0),
    [wasteMovements]
  );

  const productMap = useMemo(
    () => new Map(inventory.map((p) => [p.id, p])),
    [inventory]
  );

  // Top products with waste
  const topWasteProducts = useMemo(() => {
    const productWasteMap = new Map();

    wasteMovements.forEach((m) => {
      const prod = productMap.get(m.productId);
      const name = prod?.item || m.productId;
      const unit = prod?.purchaseUnit || "un";
      const cost = m.totalCost != null
        ? m.totalCost
        : Math.abs(m.quantity) * (m.unitCost || 0);
      const qty = Math.abs(m.quantity);

      const existing = productWasteMap.get(m.productId) || {
        name,
        unit,
        totalQty: 0,
        totalCost: 0,
      };

      productWasteMap.set(m.productId, {
        ...existing,
        totalQty: existing.totalQty + qty,
        totalCost: existing.totalCost + cost,
      });
    });

    return Array.from(productWasteMap.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);
  }, [wasteMovements, productMap]);

  // Top waste reasons
  const topWasteReasons = useMemo(() => {
    const reasonMap = new Map();

    wasteMovements.forEach((m) => {
      const reason = m.reason || m.notes || "Otro";
      const cost = m.totalCost != null
        ? m.totalCost
        : Math.abs(m.quantity) * (m.unitCost || 0);

      const existing = reasonMap.get(reason) || { count: 0, totalCost: 0 };
      reasonMap.set(reason, {
        count: existing.count + 1,
        totalCost: existing.totalCost + cost,
      });
    });

    return Array.from(reasonMap.entries())
      .map(([reason, stats]) => ({ reason, ...stats }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [wasteMovements]);

  const totalOrdersCount = purchases.length;

  const reportMetrics = [
    {
      title: "Ingresos por Ventas",
      value: formatCurrency(totalSalesRevenue),
      trend: `${activeSales.length} ventas`,
      icon: DollarSign,
    },
    {
      title: "Margen Global POS",
      value: `${overallMargin.toFixed(1)}%`,
      trend: formatCurrency(totalProfit),
      icon: TrendingUp,
    },
    {
      title: "Pérdida por Mermas",
      value: formatCurrency(totalWasteCost),
      trend: `${wasteMovements.length} eventos`,
      icon: Recycle,
    },
    {
      title: "Órdenes de Compra",
      value: totalOrdersCount,
      trend: "Total acumulado",
      icon: Package,
    },
  ];

  // Dynamic monthly aggregation based on real sales and historic records
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map();

    reports.forEach((r) => {
      monthlyMap.set(r.month, {
        month: r.month,
        orders: r.orders,
        wasteValue: parsePercent(r.waste),
        inventoryCost: r.inventoryCost,
        status: r.status,
      });
    });

    const currentMonthLabel = "Septiembre";
    const currentMonthSalesRevenue = formatCurrency(totalSalesRevenue);
    monthlyMap.set(currentMonthLabel, {
      month: currentMonthLabel,
      orders: activeSales.length + purchases.length,
      wasteValue: wasteMovements.length,
      inventoryCost: currentMonthSalesRevenue,
      status: "success",
    });

    return Array.from(monthlyMap.values());
  }, [reports, totalSalesRevenue, activeSales, purchases, wasteMovements]);

  const filteredReports = monthlyData.filter((report) =>
    report.month.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportSalesCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      "ID Venta",
      "Fecha",
      "Hora",
      "Mesa / Cliente",
      "Método de Pago",
      "Total Venta ($)",
      "Costo Insumos ($)",
      "Margen ($)",
      "Estado",
      "Notas",
    ];

    const rows = sales.map((s) => [
      s.id,
      s.date,
      s.time,
      s.tableOrCustomer,
      s.paymentMethod,
      s.totalAmount,
      s.totalCost,
      (s.totalAmount || 0) - (s.totalCost || 0),
      s.status,
      s.notes,
    ]);

    downloadCsvFile(headers, rows, `reporte-ventas-los-laureles-${today}.csv`);
    toast.success("Reporte de ventas exportado a CSV");
  };

  const handleExportMovementsCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      "ID Movimiento",
      "ID Producto",
      "Tipo",
      "Cantidad",
      "Costo Unitario ($)",
      "Fecha",
      "Timestamp",
      "Origen",
      "Referencia",
      "Notas",
    ];

    const rows = inventoryMovements.map((m) => [
      m.id,
      m.productId,
      m.type,
      m.quantity,
      m.unitCost != null ? m.unitCost : "",
      m.movementDate,
      m.timestamp || "",
      m.source || "",
      m.reference || "",
      m.notes || "",
    ]);

    downloadCsvFile(headers, rows, `auditoria-movimientos-los-laureles-${today}.csv`);
    toast.success("Auditoría de movimientos exportada a CSV");
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">
            Analítica
          </p>

          <h2>
            Reportes y Auditoría
          </h2>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={handleExportSalesCsv}
            aria-label="Exportar ventas a CSV"
          >
            Exportar Ventas CSV
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={handleExportMovementsCsv}
            aria-label="Exportar auditoría de movimientos a CSV"
          >
            Auditoría Movimientos CSV
          </button>
        </div>
      </header>

      <section className="metrics-grid">
        {reportMetrics.map((metric) => (
          <MetricCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            trend={metric.trend}
            icon={metric.icon}
          />
        ))}
      </section>

      <div className="panel-grid-2">
        <section className="panel">
          <div className="panel-header">
            <h3>Top Productos con Merma</h3>
            <span className="pill warning">Mayor Costo</span>
          </div>
          {topWasteProducts.length > 0 ? (
            <div className="table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad Perdida</th>
                    <th>Costo Total ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {topWasteProducts.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        {item.totalQty} {item.unit}
                      </td>
                      <td>
                        <span className="status danger">
                          {formatCurrency(item.totalCost)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert-item success">
              <strong>Sin mermas registradas</strong>
              <span>No hay registros de merma valorizados.</span>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Motivos Principales de Merma</h3>
            <span className="pill neutral">Causas</span>
          </div>
          {topWasteReasons.length > 0 ? (
            <div className="alert-list">
              {topWasteReasons.map((item, idx) => (
                <div key={idx} className="alert-item warning">
                  <div>
                    <strong>{item.reason}</strong>
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
                      {item.count} {item.count === 1 ? "evento" : "eventos"}
                    </p>
                  </div>
                  <span>{formatCurrency(item.totalCost)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert-item success">
              <strong>Sin incidencias</strong>
            </div>
          )}
        </section>
      </div>

      {/* Snapshots Diarios de Operación */}
      {dailySnapshots.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <History size={20} color="var(--primary)" />
              <div>
                <h3 style={{ margin: 0 }}>Cierre y Snapshots Diarios</h3>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  Consolidación diaria automática de valorización, ventas, compras y mermas
                </span>
              </div>
            </div>
          </div>

          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Valor Inventario</th>
                  <th>Ventas del Día</th>
                  <th>Margen Bruto</th>
                  <th>Mermas ($)</th>
                  <th>Compras Recibidas</th>
                  <th>Alertas Stock</th>
                </tr>
              </thead>
              <tbody>
                {[...dailySnapshots].reverse().map((snap) => (
                  <tr key={snap.date}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={14} color="var(--muted)" />
                        <strong>{snap.dateLabel}</strong>
                      </div>
                    </td>
                    <td>{formatCurrency(snap.inventoryValue)}</td>
                    <td>
                      <strong style={{ color: snap.dailySales > 0 ? "var(--primary)" : "inherit" }}>
                        {formatCurrency(snap.dailySales)}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge ${snap.grossMargin >= 50 ? "in-stock" : snap.grossMargin > 0 ? "low-stock" : "neutral"}`}>
                        {snap.grossMargin}%
                      </span>
                    </td>
                    <td>
                      {snap.dailyWaste > 0 ? (
                        <span className="status danger">
                          {formatCurrency(snap.dailyWaste)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {snap.dailyPurchases > 0 ? formatCurrency(snap.dailyPurchases) : "—"}
                    </td>
                    <td>
                      {snap.outOfStockCount > 0 ? (
                        <span className="status danger" style={{ marginRight: 4 }}>
                          {snap.outOfStockCount} quiebres
                        </span>
                      ) : null}
                      {snap.criticalStockCount > 0 ? (
                        <span className="status warning">
                          {snap.criticalStockCount} críticos
                        </span>
                      ) : null}
                      {snap.outOfStockCount === 0 && snap.criticalStockCount === 0 ? (
                        <span className="status success">Óptimo</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <h3>
            Tendencia Operacional
          </h3>
        </div>

        <ReportsChart data={monthlyData} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>
            Historial de Periodos
          </h3>
        </div>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar mes..."
          label="Buscar reportes"
          id="reports-search"
        />

        <ReportsTable
          reports={filteredReports}
        />
      </section>
    </>
  );
}

export default Reports;
