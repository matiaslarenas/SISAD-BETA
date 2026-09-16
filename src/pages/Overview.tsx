import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Download,
  Package,
  Recycle,
  Truck,
  Upload,
  Settings,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import AlertsPanel from "../components/AlertsPanel";
import InventoryTable from "../components/InventoryTable";
import Modal from "../components/Modal";
import PendingOrders from "../components/PendingOrders";
import { useAppData } from "../context/AppDataContext";
import {
  buildBackupEnvelope,
  downloadCsvFile,
  downloadJsonFile,
} from "../utils/exportUtils";
import { formatCurrency } from "../utils/format";
import type {
  KpiData,
  OperationalAlert,
  Product,
  PurchaseOrder,
} from "../types/inventory";
import { validateBackupData } from "../utils/validation";

interface BackupContent {
  inventoryCatalog?: unknown[];
  inventory?: unknown[];
  inventoryMovements?: unknown[];
  suppliers?: unknown[];
  recipes?: unknown[];
  purchases?: unknown[];
  sales?: unknown[];
}

interface BackupEnvelope extends BackupContent {
  data?: BackupContent;
  schemaVersion?: string | number;
  backupVersion?: string;
  createdAt?: string;
}

const weeklyConsumption = [
  { day: "Lun", value: 220 },
  { day: "Mar", value: 310 },
  { day: "Mié", value: 280 },
  { day: "Jue", value: 390 },
  { day: "Vie", value: 460 },
  { day: "Sáb", value: 520 },
  { day: "Dom", value: 430 },
];

function Overview() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [backupPendingRestore, setBackupPendingRestore] =
    useState<BackupEnvelope | null>(null);

  const [isDataMenuOpen, setIsDataMenuOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);

  const appData = useAppData();
  const inventory = appData.inventory as Product[];
  const purchases = appData.purchases as PurchaseOrder[];
  const alerts = (appData.alerts || []) as OperationalAlert[];
  const { rawState, restoreBackupState } = appData;

  const handleExportBackup = () => {
    const today = new Date().toISOString().slice(0, 10);
    downloadJsonFile(
      buildBackupEnvelope(rawState),
      `respaldo-los-laureles-${today}.json`
    );
    toast.success("Respaldo descargado exitosamente");
    setIsDataMenuOpen(false); // Cierra el menú al accionar
  };

  const handleExportInventoryCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      "ID",
      "Producto",
      "Tipo",
      "Categoría",
      "Ubicación",
      "Stock Actual",
      "Unidad",
      "Costo Unitario ($)",
      "Stock Mínimo",
      "Valor Total ($)",
    ];
    const rows = inventory.map((product) => [
      product.id,
      product.item,
      product.type,
      product.category,
      product.location,
      product.onHand,
      product.purchaseUnit,
      product.costPerUnit,
      product.minStock,
      product.inventoryValue,
    ]);

    downloadCsvFile(headers, rows, `inventario-los-laureles-${today}.csv`);
    toast.success("Inventario exportado a CSV");
    setIsDataMenuOpen(false); // Cierra el menú al accionar
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        if (typeof loadEvent.target?.result !== "string") {
          toast.error("No se pudo leer el archivo seleccionado");
          return;
        }

        const parsed = JSON.parse(loadEvent.target.result) as BackupEnvelope;
        const validation = validateBackupData(parsed);

        if (!validation.isValid) {
          toast.error(validation.error || "Formato de archivo inválido");
          return;
        }

        setBackupPendingRestore(parsed);
        setIsRestoreModalOpen(true);
      } catch {
        toast.error("Error al leer el archivo JSON: formato corrupto");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const closeRestoreModal = () => {
    setIsRestoreModalOpen(false);
    setBackupPendingRestore(null);
  };

  const handleConfirmRestore = () => {
    if (!backupPendingRestore) return;
    restoreBackupState(backupPendingRestore);
    closeRestoreModal();
    toast.success("Sistema restaurado exitosamente desde el respaldo");
  };

  const criticalProducts = inventory.filter(
    (item) => item.onHand <= item.minStock
  );
  const activePurchases = purchases.filter(
    (purchase) => purchase.status !== "received"
  ).length;
  const inventoryHealth = inventory.length
    ? Math.round(((inventory.length - criticalProducts.length) / inventory.length) * 100)
    : 100;
  const inventoryValue = inventory.reduce(
    (sum, item) => sum + item.inventoryValue,
    0
  );
  const criticalInventoryValue = criticalProducts.reduce(
    (sum, item) => sum + item.inventoryValue,
    0
  );
  const criticalRatio = inventory.length
    ? (criticalProducts.length / inventory.length) * 100
    : 0;

  const metrics: KpiData[] = [
    {
      label: "Productos",
      value: inventory.length,
      trend: "Activos",
      icon: Package,
      status: "default",
    },
    {
      label: "Stock Crítico",
      value: criticalProducts.length,
      trend: "Reposición",
      icon: Recycle,
      status: criticalRatio >= 15 ? "danger" : criticalProducts.length ? "warning" : "success",
    },
    {
      label: "Valor Inventario",
      value: formatCurrency(inventoryValue),
      trend: "Capital",
      icon: DollarSign,
      status: "default",
    },
    {
      label: "Salud Inventario",
      value: `${inventoryHealth}%`,
      trend: `${activePurchases} OC abiertas`,
      icon: Truck,
      status: inventoryHealth < 15 ? "danger" : inventoryHealth < 70 ? "warning" : "success",
    },
  ];

  const backupContent = backupPendingRestore?.data || backupPendingRestore;
  const backupMeta = backupPendingRestore?.schemaVersion
    ? `Esquema v${backupPendingRestore.schemaVersion} (${backupPendingRestore.backupVersion || "1.0"})`
    : "Formato Directo / Legado";
  const backupCreatedLabel = backupPendingRestore?.createdAt
    ? new Date(backupPendingRestore.createdAt).toLocaleString("es-CL")
    : "Fecha no especificada";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Panel de Inventario</p>
          <h2>Resumen Operacional</h2>
        </div>

        <div className="topbar-actions">
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            hidden
            onChange={handleFileChange}
          />

          <div className="data-menu">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
            >
              <Settings size={16} /> Gestión de Datos <ChevronDown size={14} />
            </button>

            {isDataMenuOpen && (
              <div className="data-menu-dropdown">
                <button type="button" onClick={handleExportInventoryCsv} className="data-menu-item">
                  <Download size={16} /> Exportar CSV
                </button>
                <button type="button" onClick={handleExportBackup} className="data-menu-item">
                  <Download size={16} /> Respaldar JSON
                </button>
                <button type="button" onClick={() => { fileInputRef.current?.click(); setIsDataMenuOpen(false); }} className="data-menu-item">
                  <Upload size={16} /> Restaurar JSON
                </button>
              </div>
            )}
          </div>

          <button type="button" className="primary-btn" onClick={() => navigate("/purchases")}>
            Nueva Orden de Compra
          </button>
        </div>
      </header>

      {/* Tarjetas compactas de métricas operacionales */}
      <section className="metrics-grid">
        {metrics.map((metric) => {
          const statusClass = metric.status !== "default" ? metric.status : "";
          return (
            <div key={metric.label} className="panel metric-card-compact">
              <div className="metric-card-compact-body">
                <p className="metric-card-compact-label">{metric.label}</p>
                <div className="metric-card-compact-value-row">
                  <span className="metric-card-compact-value">{metric.value}</span>
                  <span className={`metric-card-compact-trend ${statusClass}`}>
                    {metric.trend}
                  </span>
                </div>
              </div>

              <div className={`metric-card-compact-icon ${statusClass}`}>
                <metric.icon size={24} />
              </div>
            </div>
          );
        })}
      </section>

      {/* Centro de Alertas Colapsable */}
      <button
        type="button"
        className="panel collapsible-trigger"
        onClick={() => setIsAlertsOpen(!isAlertsOpen)}
      >
        <div className="collapsible-trigger-left">
          <h3>Centro de Alertas Operacionales</h3>
          {alerts.length > 0 && !isAlertsOpen && (
            <span className="collapsible-badge">{alerts.length}</span>
          )}
        </div>
        {isAlertsOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isAlertsOpen && (
        <div className="nested-panel">
          <AlertsPanel alerts={alerts} onNavigate={navigate} />
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <h3>Consumo Semanal</h3>
        </div>
        <div className="overview-chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyConsumption}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#1d6951" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Inventario Colapsable */}
      <section className="panel">
        <div
          className="panel-header clickable"
          onClick={() => setIsInventoryOpen(!isInventoryOpen)}
        >
          <h3>Estado de Inventario</h3>
          {isInventoryOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>

        {isInventoryOpen && (
          <div className="nested-panel">
            <InventoryTable
              inventory={inventory}
              showActions={false}
              searchable
              paginated
              pageSize={20}
              onRestock={(product) =>
                navigate(`/purchases?product=${encodeURIComponent(product.id)}`)
              }
            />
          </div>
        )}
      </section>

      <div className="panel-grid-2">
        <section className="panel">
          <h3>Resumen Financiero</h3>
          <div className="alert-item success financial-summary-item">
            <strong>Valor Total Inventario</strong>
            <span>{formatCurrency(inventoryValue)}</span>
          </div>
          <div className="alert-item warning">
            <strong>Valor Stock Crítico</strong>
            <span>{formatCurrency(criticalInventoryValue)}</span>
          </div>
        </section>

        <PendingOrders purchases={purchases} onViewAll={() => navigate("/purchases")} />
      </div>

      <Modal
        isOpen={isRestoreModalOpen}
        onClose={closeRestoreModal}
        title="Restaurar Respaldo del Sistema"
        description="Esta acción reemplazará los datos actuales por los contenidos en el archivo seleccionado."
      >
        {backupPendingRestore && (
          <div className="restore-summary">
            <div className="summary-bar">
              <div>
                <strong>Metadatos del Respaldo:</strong>
                <p className="restore-metadata">
                  {backupMeta} • Generado: {backupCreatedLabel}
                </p>
                <strong>Contenido:</strong>
                <ul className="restore-content-list">
                  <li>Productos: {backupContent.inventoryCatalog?.length || backupContent.inventory?.length || 0}</li>
                  <li>Movimientos: {backupContent.inventoryMovements?.length || 0}</li>
                  <li>Proveedores: {backupContent.suppliers?.length || 0}</li>
                  <li>Recetas: {backupContent.recipes?.length || 0}</li>
                  <li>Órdenes de Compra: {backupContent.purchases?.length || 0}</li>
                  <li>Ventas: {backupContent.sales?.length || 0}</li>
                </ul>
              </div>
            </div>

            <div className="form-alert restore-warning">
              Advertencia: todos los cambios no respaldados en este dispositivo se sobrescribirán con la información de este archivo.
            </div>

            <div className="modal-actions restore-actions">
              <button type="button" className="secondary-btn" onClick={closeRestoreModal}>
                Cancelar
              </button>
              <button type="button" className="danger-btn" onClick={handleConfirmRestore}>
                Confirmar y Restaurar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

export default Overview;
