function MetricCard({
  title,
  value,
  trend,
  icon: Icon,
}) {
  const isNegative =
    trend && trend.startsWith("-");

  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon
          size={30}
          strokeWidth={2}
        />
      </div>

      <p>{title}</p>

      <h3>{value}</h3>

      <span
        className={
          isNegative
            ? "trend-negative"
            : "trend-positive"
        }
      >
        {trend}
      </span>
    </article>
  );
}

export default MetricCard;