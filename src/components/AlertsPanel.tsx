import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  TrendingDown,
} from "lucide-react";
import type {
  AlertCategory,
  AlertSeverity,
  OperationalAlert,
} from "../types/inventory";

interface AlertsPanelProps {
  alerts?: OperationalAlert[];
  onNavigate: (route: string) => void;
}

interface AlertIconProps {
  severity: AlertSeverity;
}

type AlertFilter = "all" | AlertCategory;

const FILTERS: Array<{ value: AlertFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "stock", label: "Stock" },
  { value: "waste", label: "Mermas" },
  { value: "purchases", label: "Compras" },
  { value: "inactive", label: "Sin Rotación" },
];

function AlertIcon({ severity }: AlertIconProps) {
  if (severity === "danger") {
    return <AlertTriangle size={18} color="var(--danger)" />;
  }

  if (severity === "warning") {
    return <TrendingDown size={18} color="var(--warning)" />;
  }

  return <Clock size={18} color="#1e5c8a" />;
}

function AlertsPanel({ alerts = [], onNavigate }: AlertsPanelProps) {
  const [activeFilter, setActiveFilter] = useState<AlertFilter>("all");

  const counts = useMemo<Record<AlertFilter, number>>(() => {
    const initialCounts: Record<AlertFilter, number> = {
      all: alerts.length,
      stock: 0,
      waste: 0,
      purchases: 0,
      inactive: 0,
    };

    return alerts.reduce((result, alert) => {
      result[alert.category] += 1;
      return result;
    }, initialCounts);
  }, [alerts]);

  const filteredAlerts = useMemo(
    () =>
      activeFilter === "all"
        ? alerts
        : alerts.filter((alert) => alert.category === activeFilter),
    [activeFilter, alerts]
  );

  return (
    <section className="panel alerts-panel">
      <div className="alerts-sticky-header">
        <div className="panel-title-with-icon">
          <Bell size={20} color="var(--primary)" />
          <h3>Centro de Alertas Operacionales</h3>
        </div>

        <div className="pill-filter-group" aria-label="Filtrar alertas">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`pill-filter-btn ${activeFilter === filter.value ? "active" : ""}`}
              onClick={() => setActiveFilter(filter.value)}
              aria-pressed={activeFilter === filter.value}
            >
              {filter.label} ({counts[filter.value]})
            </button>
          ))}
        </div>
      </div>

      <div className="alerts-scroll-container">
        {filteredAlerts.length > 0 ? (
          <div className="alert-card-grid alerts-panel-grid">
            {filteredAlerts.map((alert) => (
              <article key={alert.id} className={`alert-card ${alert.severity}`}>
                <div className="alert-card-header">
                  <div className="panel-title-with-icon">
                    <AlertIcon severity={alert.severity} />
                    <h4 className="alert-card-title">{alert.title}</h4>
                  </div>
                  <span
                    className={`status-badge ${
                      alert.severity === "danger"
                        ? "out-of-stock"
                        : alert.severity === "warning"
                          ? "low-stock"
                          : "neutral"
                    }`}
                  >
                    {alert.category.toUpperCase()}
                  </span>
                </div>

                <p className="alert-card-msg">{alert.message}</p>

                <div className="alert-card-footer">
                  <button
                    type="button"
                    className="mini-btn alert-action-btn"
                    onClick={() => onNavigate(alert.actionRoute)}
                  >
                    {alert.actionLabel} →
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="alert-item success alerts-empty-state">
            <div className="panel-title-with-icon">
              <CheckCircle2 size={18} color="var(--success)" />
              <strong>Todo en orden</strong>
            </div>
            <span>No hay alertas operacionales activas en esta categoría.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default AlertsPanel;
