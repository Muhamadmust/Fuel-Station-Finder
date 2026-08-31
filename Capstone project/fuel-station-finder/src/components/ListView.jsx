import StationCard from "./StationCard";

export default function ListView({ stations, onStationSelect }) {
  return (
    <div className="list-view">
      {stations.length === 0 && (
        <p className="list-empty">No stations match your filters.</p>
      )}
      {stations.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          onSelect={onStationSelect}
        />
      ))}
    </div>
  );
}
