export default function FilterBar({ filters, onFilterChange }) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label className="filter-label">Fuel Type</label>
        <div className="filter-chips">
          {["all", "petrol", "diesel"].map((type) => (
            <button
              key={type}
              className={`filter-chip ${filters.fuelType === type ? "active" : ""}`}
              onClick={() => onFilterChange({ ...filters, fuelType: type })}
              type="button"
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">Status</label>
        <div className="filter-chips">
          {[
            { value: "all", label: "All" },
            { value: "has_fuel", label: "Has Fuel" },
            { value: "long_queue", label: "Long Queue" },
            { value: "out_of_stock", label: "Out of Stock" },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`filter-chip ${filters.status === opt.value ? "active" : ""}`}
              onClick={() => onFilterChange({ ...filters, status: opt.value })}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
