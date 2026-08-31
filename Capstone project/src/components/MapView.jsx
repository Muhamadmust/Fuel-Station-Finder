import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getStatusInfo, formatPrice } from "../utils/helpers";

function createIcon(color) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function LocationUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13);
  }, [center, map]);
  return null;
}

// Leaflet control that displays the live user count
function UserCountControl({ count }) {
  const map = useMap();

  useEffect(() => {
    const control = L.control({ position: "bottomright" });

    control.onAdd = function () {
      const div = L.DomUtil.create("div", "user-count-control");
      div.innerHTML = `👥 <span class="user-count-num">${count}</span> online`;
      return div;
    };

    control.update = function (newCount) {
      const el = control.getContainer();
      if (el) {
        el.innerHTML = `👥 <span class="user-count-num">${newCount}</span> online`;
      }
    };

    control.addTo(map);
    return () => control.remove();
  }, [map]);

  // Update when count changes
  useEffect(() => {
    // Re-render the control content
    const el = document.querySelector('.user-count-control');
    if (el) {
      el.innerHTML = `👥 <span class="user-count-num">${count}</span> online`;
    }
  }, [count]);

  return null;
}

export default function MapView({ stations, userLocation, onStationSelect, clientCount = 0 }) {
  const defaultCenter = userLocation || [9.0579, 7.4951]; // Abuja default

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      className="map-container"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LocationUpdater center={userLocation} />
      <UserCountControl count={clientCount} />

      {userLocation && (
        <Marker
          position={userLocation}
          icon={L.divIcon({
            className: "user-marker",
            html: `<div style="
              width: 16px; height: 16px;
              background: #3b82f6;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 0 3px rgba(59,130,246,0.3);
            "></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })}
        >
          <Popup>You are here</Popup>
        </Marker>
      )}

      {stations.map((station) => {
        const statusInfo = getStatusInfo(station.status);
        return (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={createIcon(statusInfo.color)}
            eventHandlers={{ click: () => onStationSelect(station) }}
          >
            <Popup>
              <div className="popup-content">
                <strong>{station.name}</strong>
                <br />
                <span>{station.brand}</span>
                <br />
                {station.fuelTypes.map((type) => (
                  <span key={type}>
                    {type}: {formatPrice(station.prices[type])}/L
                    <br />
                  </span>
                ))}
                <button
                  className="popup-btn"
                  onClick={() => onStationSelect(station)}
                  type="button"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
