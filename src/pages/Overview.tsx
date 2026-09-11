import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  Download,
  Package,
  Recycle,
  Truck,
  Upload,
  Settings,      // === MODIFICADO: Iconos nuevos para la UI ===
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
// import KpiCard from "../components/KpiCard"; // === MODIFICADO: Lo quitamos para usar un diseño inline más compacto ===
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

  // === MODIFICADO: Estados para manejar menús y collapsables ===
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

          {/* === MODIFICADO: Dropdown de Gestión de Datos === */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setIsDataMenuOpen(!isDataMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Settings size={16} /> Gestión de Datos <ChevronDown size={14} />
            </button>

            {isDataMenuOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                zIndex: 50,
                minWidth: '200px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <button type="button" onClick={handleExportInventoryCsv} style={dropdownItemStyle}>
                  <Download size={16} /> Exportar CSV
                </button>
                <button type="button" onClick={handleExportBackup} style={dropdownItemStyle}>
                  <Download size={16} /> Respaldar JSON
                </button>
                <button type="button" onClick={() => { fileInputRef.current?.click(); setIsDataMenuOpen(false); }} style={dropdownItemStyle}>
                  <Upload size={16} /> Restaurar JSON
                </button>
              </div>
            )}
          </div>

          {/* === MODIFICADO: Texto cambiado a "Nueva Orden de Compra" === */}
          <button type="button" className="primary-btn" onClick={() => navigate("/purchases")}>
            Nueva Orden de Compra
          </button>
        </div>
      </header>

      {/* === MODIFICADO: Tarjetas compactas en línea === */}
      {/* === MODIFICADO: Tarjetas compactas en línea con Flexbox ajustado === */}
      <section className="metrics-grid">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem',
              marginBottom: 0,
              gap: '12px' // Añadimos gap general por si acaso
            }}
          >
            {/* Contenedor izquierdo: Textos (con minWidth: 0 para evitar desbordes) */}
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#64748b' }}>
                {metric.label}
              </p>
              {/* Aquí agregamos flexWrap: 'wrap' por si el número es muy grande */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                  {metric.value}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: metric.status === 'danger' ? '#fee2e2' : metric.status === 'warning' ? '#fef3c7' : '#f1f5f9',
                  color: metric.status === 'danger' ? '#991b1b' : metric.status === 'warning' ? '#92400e' : '#475569',
                  fontWeight: '500',
                  whiteSpace: 'nowrap' // Evita que el texto del badge se parta
                }}>
                  {metric.trend}
                </span>
              </div>
            </div>

            {/* Contenedor derecho: Ícono (con flexShrink: 0 para que no sea empujado) */}
            <div style={{
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: metric.status === 'danger' ? '#fef2f2' : metric.status === 'warning' ? '#fffbeb' : '#f8fafc',
              color: metric.status === 'danger' ? '#ef4444' : metric.status === 'warning' ? '#f59e0b' : '#64748b',
              flexShrink: 0  /* <--- ESTA ES LA MAGIA QUE EVITA QUE SE SALGA */
            }}>
              <metric.icon size={24} />
            </div>
          </div>
        ))}
      </section>

      {/* === MODIFICADO: Centro de Alertas Colapsable === */}
      <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <button
          onClick={() => setIsAlertsOpen(!isAlertsOpen)}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0 }}>Centro de Alertas Operacionales</h3>
            {alerts.length > 0 && !isAlertsOpen && (
              <span style={{ background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                {alerts.length}
              </span>
            )}
          </div>
          {isAlertsOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
        </button>

        {isAlertsOpen && (
          <div style={{ borderTop: '1px solid #e2e8f0' }}>
            <AlertsPanel alerts={alerts} onNavigate={navigate} />
          </div>
        )}
      </section>

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

      {/* === MODIFICADO: Inventario Colapsable === */}
      <section className="panel">
        <div
          className="panel-header"
          onClick={() => setIsInventoryOpen(!isInventoryOpen)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        >
          <h3>Estado de Inventario</h3>
          {isInventoryOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
        </div>

        {isInventoryOpen && (
          <div style={{ marginTop: '1rem' }}>
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

// Estilos de ayuda para los items del Dropdown
const dropdownItemStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  border: 'none',
  borderBottom: '1px solid #f1f5f9',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '14px',
  color: '#334155'
};

export default Overview;
