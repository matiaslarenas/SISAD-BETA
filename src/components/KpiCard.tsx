import type { KpiData } from "../types/inventory";

interface KpiCardProps extends Omit<KpiData, "label"> {
  title: KpiData["label"];
}

function KpiCard({
  title,
  value,
  trend,
  icon: Icon,
  status = "default",
}: KpiCardProps) {
  const isNegative = trend.startsWith("-");

  return (
    <article className={`metric-card kpi-card kpi-card-${status}`}>
      <div className="metric-icon">
        <Icon size={30} strokeWidth={2} />
      </div>
      <p>{title}</p>
      <h3>{value}</h3>
      <span
        className={`kpi-badge ${isNegative ? "trend-negative" : "trend-positive"}`}
      >
        {trend}
      </span>
    </article>
  );
}

export default KpiCard;
