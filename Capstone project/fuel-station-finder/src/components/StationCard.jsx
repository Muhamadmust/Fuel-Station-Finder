import { getStatusInfo, formatPrice, timeAgo } from "../utils/helpers";

export default function StationCard({ station, onSelect }) {
  const statusInfo = getStatusInfo(station.status);

  return (
    <button
      className="station-card"
      onClick={() => onSelect(station)}
      type="button"
    >
      <div className="card-header">
        <div className="card-brand">{station.brand}</div>
        <span
          className="card-status"
          style={{ color: statusInfo.color, background: statusInfo.bg }}
        >
          {statusInfo.label}
        </span>
      </div>

      <h3 className="card-name">{station.name}</h3>
      <p className="card-address">{station.address}</p>

      {station.distance != null && (
        <p className="card-distance">{station.distance.toFixed(1)} km away</p>
      )}

      <div className="card-fuels">
        {station.fuelTypes.map((type) => (
          <span key={type} className="fuel-tag">
            {type} · {formatPrice(station.prices[type])}/L
          </span>
        ))}
      </div>

      <div className="card-reported">
        Reported {timeAgo(station.lastReported)}
      </div>
    </button>
  );
}
