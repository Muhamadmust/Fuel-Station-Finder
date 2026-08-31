const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected database error:", err);
    });
  }
  return pool;
}

// Schema creation
async function initDatabase() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS stations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      address TEXT NOT NULL,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      fuel_petrol BOOLEAN DEFAULT TRUE,
      fuel_diesel BOOLEAN DEFAULT TRUE,
      price_petrol NUMERIC(10,2) DEFAULT 617,
      price_diesel NUMERIC(10,2) DEFAULT 750,
      status VARCHAR(20) DEFAULT 'has_fuel',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS status_reports (
      id SERIAL PRIMARY KEY,
      station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL,
      reported_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stations_lat_lng ON stations(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);
    CREATE INDEX IF NOT EXISTS idx_reports_station ON status_reports(station_id, reported_at DESC);
  `);

  console.log("✅ Database schema initialized");
}

// Seed data
async function seedDatabase() {
  const db = getPool();
  const { rows } = await db.query("SELECT COUNT(*)::int as count FROM stations");
  if (rows[0].count > 0) {
    console.log(`📦 Database already has ${rows[0].count} stations, skipping seed`);
    return;
  }

  const stations = [
    { name: "TotalEnergies Wuse", brand: "TotalEnergies", address: "12 Wuse Zone 5, Abuja, Nigeria", lat: 9.0627, lng: 7.4891, fuel_petrol: true, fuel_diesel: true, price_petrol: 617, price_diesel: 750, status: "has_fuel" },
    { name: "NNPC Gwarinpa", brand: "NNPC", address: "32 3rd Avenue Gwarinpa, Abuja, Nigeria", lat: 9.0865, lng: 7.4583, fuel_petrol: true, fuel_diesel: true, price_petrol: 617, price_diesel: 745, status: "long_queue" },
    { name: "Oando Maitama", brand: "Oando", address: "7 Aguiyi-Ironsi Street, Maitama, Abuja", lat: 9.0795, lng: 7.4856, fuel_petrol: true, fuel_diesel: false, price_petrol: 620, price_diesel: 0, status: "out_of_stock" },
    { name: "Mobil Kubwa", brand: "Mobil", address: "Phase 4 Kubwa Extension, Abuja", lat: 9.1176, lng: 7.4200, fuel_petrol: true, fuel_diesel: true, price_petrol: 617, price_diesel: 748, status: "has_fuel" },
    { name: "Ardova Lugbe", brand: "Ardova", address: "Airport Road Lugbe, Abuja", lat: 9.0390, lng: 7.4310, fuel_petrol: true, fuel_diesel: true, price_petrol: 617, price_diesel: 750, status: "has_fuel" },
    { name: "NNPC Central Area", brand: "NNPC", address: "14 Shehu Shagari Way, Central Area, Abuja", lat: 9.0588, lng: 7.4890, fuel_petrol: true, fuel_diesel: true, price_petrol: 617, price_diesel: 745, status: "long_queue" },
    { name: "TotalEnergies Garki", brand: "TotalEnergies", address: "40 Square Road Garki, Abuja", lat: 9.0640, lng: 7.4923, fuel_petrol: true, fuel_diesel: false, price_petrol: 617, price_diesel: 0, status: "has_fuel" },
    { name: "Oando Dutse", brand: "Oando", address: "Dutse Alhaji, Bwari Area Council, Abuja", lat: 9.1300, lng: 7.4620, fuel_petrol: true, fuel_diesel: true, price_petrol: 620, price_diesel: 755, status: "out_of_stock" },
    { name: "Ardova Jabi", brand: "Ardova", address: "Jabi District, Abuja", lat: 9.0670, lng: 7.4620, fuel_petrol: true, fuel_diesel: true, price_petrol: 617, price_diesel: 748, status: "has_fuel" },
    { name: "Mobil Asokoro", brand: "Mobil", address: "Asokoro District, Abuja", lat: 9.0370, lng: 7.5040, fuel_petrol: true, fuel_diesel: true, price_petrol: 617, price_diesel: 750, status: "has_fuel" },
  ];

  for (const s of stations) {
    await db.query(
      `INSERT INTO stations (name, brand, address, lat, lng, fuel_petrol, fuel_diesel, price_petrol, price_diesel, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [s.name, s.brand, s.address, s.lat, s.lng, s.fuel_petrol, s.fuel_diesel, s.price_petrol, s.price_diesel, s.status]
    );
  }

  console.log(`🌱 Seeded ${stations.length} stations`);
}

module.exports = { getPool, initDatabase, seedDatabase };
