import { useState } from "react";
import { getStatusInfo, formatPrice, timeAgo } from "../utils/helpers";

const STATUS_OPTIONS = [
  { value: "has_fuel", label: "✅ Has Fuel", icon: "⛽" },
  { value: "out_of_stock", label: "❌ Out of Stock", icon: "🚫" },
  { value: "long_queue", label: "⏳ Long Queue", icon: "🚗" },
];

export default function StationDetail({ station, onBack, onReport }) {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [reported, setReported] = useState(false);
  const statusInfo = getStatusInfo(station.status);

  function handleReport() {
    if (!selectedStatus) return;
    onReport(station.id, selectedStatus);
    setReported(true);
  }

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  return (
    <div className="detail-panel">
      <button className="back-btn" onClick={onBack} type="button">
        ← Back
      </button>

      <div className="detail-header">
        <span className="detail-brand">{station.brand}</span>
        <span
          className="detail-status"
          style={{ color: statusInfo.color, background: statusInfo.bg }}
        >
          {statusInfo.label}
        </span>
      </div>

      <h2 className="detail-name">{station.name}</h2>
      <p className="detail-address">{station.address}</p>

      {station.distance != null && (
        <p className="detail-distance">{station.distance.toFixed(1)} km away</p>
      )}

      <div className="detail-fuels">
        <h4>Fuel Types & Prices</h4>
        {station.fuelTypes.map((type) => (
          <div key={type} className="detail-fuel-row">
            <span className="detail-fuel-type">{type}</span>
            <span className="detail-fuel-price">{formatPrice(station.prices[type])}/L</span>
          </div>
        ))}
      </div>

      <p className="detail-reported">
        Last reported {timeAgo(station.lastReported)}
      </p>

      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="directions-btn"
      >
        📍 Get Directions
      </a>

      <div className="report-section">
        <h4>Report Status</h4>
        {reported ? (
          <p className="report-thanks">Thanks for your report!</p>
        ) : (
          <>
            <div className="report-options">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`report-option ${selectedStatus === opt.value ? "selected" : ""}`}
                  onClick={() => setSelectedStatus(opt.value)}
                  type="button"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              className="report-submit"
              onClick={handleReport}
              disabled={!selectedStatus}
              type="button"
            >
              Submit Report
            </button>
          </>
        )}
      </div>
    </div>
  );
}
