export default function StatsCard({ title, value, icon: Icon, color = 'blue' }) {
  return (
    <div className={`stats-card ${color}`}>
      <div className="stats-card-icon">
        <Icon size={30} color="white" />
      </div>
      <div className="stats-card-value">{value || 0}</div>
      <div className="stats-card-label">{title}</div>
    </div>
  );
}

