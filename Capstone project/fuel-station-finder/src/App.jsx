import { useState, useEffect, useCallback } from "react";
import MapView from "./components/MapView";
import ListView from "./components/ListView";
import FilterBar from "./components/FilterBar";
import StationDetail from "./components/StationDetail";
import { useWebSocket } from "./hooks/useWebSocket";
import { getDistanceKm } from "./utils/helpers";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "";
const WS_BASE = API_BASE
  ? API_BASE.replace(/^http/, "ws")
  : `ws://${window.location.hostname}:3001`;

export default function App() {
  const [view, setView] = useState("map"); // "map" | "list"
  const [userLocation, setUserLocation] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ fuelType: "all", status: "all" });

  // Fetch stations from API
  const fetchStations = useCallback(async (location, searchQuery) => {
    try {
      const params = new URLSearchParams();
      if (location) {
        params.set("lat", location[0]);
        params.set("lng", location[1]);
      }
      if (searchQuery) params.set("search", searchQuery);
      
      const res = await fetch(`${API_BASE}/api/stations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch stations");
      const data = await res.json();
      setStations(data.stations);
    } catch (err) {
      console.error("Error fetching stations:", err);
      setStations([]);
    }
  }, []);

  // Initialize with geolocation
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        fetchStations(loc);
      },
      () => {
        const fallback = [9.0579, 7.4951]; // Abuja center
        setUserLocation(fallback);
        fetchStations(fallback);
      }
    );
  }, [fetchStations]);

  // Search by address — geocode then fetch nearby stations
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      fetchStations(userLocation);
      return;
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const loc = [parseFloat(lat), parseFloat(lon)];
        setUserLocation(loc);
        fetchStations(loc, searchQuery);
      }
    } catch {
      // Fallback: search by text only
      fetchStations(userLocation, searchQuery);
    }
  }, [searchQuery, userLocation, fetchStations]);

  // Filter stations
  const filteredStations = stations.filter((s) => {
    if (filters.fuelType !== "all" && !s.fuelTypes.includes(filters.fuelType))
      return false;
    if (filters.status !== "all" && s.status !== filters.status) return false;
    return true;
  });

  // Sort by distance (closest first)
  const sortedStations = [...filteredStations].sort(
    (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
  );

  // Real-time WebSocket updates
  const { status: wsStatus, clientCount } = useWebSocket(WS_BASE, {
    onStationUpdate: useCallback((updatedStation) => {
      setStations((prev) =>
        prev.map((s) => (s.id === updatedStation.id ? updatedStation : s))
      );
      setSelectedStation((prev) =>
        prev && prev.id === updatedStation.id ? updatedStation : prev
      );
    }, []),
    onNewReport: useCallback((msg) => {
      // Could show a toast notification here in the future
      console.log(`📡 New report: Station ${msg.stationId} → ${msg.status}`);
    }, []),
  });

  // Report a station status via API
  async function handleReport(stationId, newStatus) {
    try {
      const res = await fetch(`${API_BASE}/api/stations/${stationId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to submit report");
      
      // No need to manually update state — WebSocket broadcast handles it
    } catch (err) {
      console.error("Error reporting status:", err);
    }
  }

  // Detail view
  if (selectedStation) {
    // Find the current version of the station (may have been updated)
    const current = stations.find((s) => s.id === selectedStation.id) || selectedStation;
    return (
      <div className="app">
        <StationDetail
          station={current}
          onBack={() => setSelectedStation(null)}
          onReport={handleReport}
        />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Top bar */}
      <header className="top-bar">
        <div className="logo-row">
          <h1 className="logo">⛽ FuelFinder</h1>
          <span className={`ws-indicator ${wsStatus}`} title={`WebSocket: ${wsStatus}`}>
            {wsStatus === "connected" ? "🟢 Live" : wsStatus === "reconnecting" ? "🟡 Reconnecting" : "🔴 Offline"}
          </span>
        </div>
        <div className="search-row">
          <input
            className="search-input"
            type="text"
            placeholder="Search address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch} type="button">
            🔍
          </button>
        </div>
      </header>

      {/* View toggle */}
      <div className="view-toggle">
        <button
          className={`toggle-btn ${view === "map" ? "active" : ""}`}
          onClick={() => setView("map")}
          type="button"
        >
          🗺 Map
        </button>
        <button
          className={`toggle-btn ${view === "list" ? "active" : ""}`}
          onClick={() => setView("list")}
          type="button"
        >
          📋 List
        </button>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Main content */}
      {view === "map" ? (
        <MapView
          stations={sortedStations}
          userLocation={userLocation}
          onStationSelect={setSelectedStation}
          clientCount={clientCount}
        />
      ) : (
        <ListView
          stations={sortedStations}
          onStationSelect={setSelectedStation}
        />
      )}
    </div>
  );
}
