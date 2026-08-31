const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { getPool, initDatabase, seedDatabase } = require("./db");
const { initWebSocket, broadcastStationUpdate, broadcastNewReport, getClientCount } = require("./ws");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Serve static frontend files ──────────────────────────────────
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

// ─── Startup ──────────────────────────────────────────────────────
async function start() {
  try {
    await initDatabase();
    await seedDatabase();

    const server = http.createServer(app);
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`⛽ FuelFinder API running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket available on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// ─── GET /api/stations ────────────────────────────────────────────
app.get("/api/stations", async (req, res) => {
  try {
    const { fuel_type, status, lat, lng, radius, search } = req.query;
    const db = getPool();

    let query = "SELECT * FROM stations WHERE 1=1";
    const params = [];
    let paramIndex = 1;

    if (fuel_type === "petrol") {
      query += ` AND fuel_petrol = TRUE`;
    } else if (fuel_type === "diesel") {
      query += ` AND fuel_diesel = TRUE`;
    }

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR brand ILIKE $${paramIndex} OR address ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const { rows } = await db.query(query, params);

    const hasLocation = lat && lng;
    const userLat = parseFloat(lat) || 0;
    const userLng = parseFloat(lng) || 0;

    let stations = rows.map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      address: row.address,
      lat: row.lat,
      lng: row.lng,
      fuelTypes: [
        ...(row.fuel_petrol ? ["petrol"] : []),
        ...(row.fuel_diesel ? ["diesel"] : []),
      ],
      prices: {
        ...(row.fuel_petrol ? { petrol: Number(row.price_petrol) } : {}),
        ...(row.fuel_diesel ? { diesel: Number(row.price_diesel) } : {}),
      },
      status: row.status,
      lastReported: row.updated_at,
      ...(hasLocation ? { distance: haversineKm(userLat, userLng, row.lat, row.lng) } : {}),
    }));

    if (hasLocation) {
      stations.sort((a, b) => a.distance - b.distance);
    }

    if (hasLocation && radius) {
      const maxKm = parseFloat(radius);
      stations = stations.filter((s) => s.distance <= maxKm);
    }

    res.json({ stations, count: stations.length });
  } catch (err) {
    console.error("Error fetching stations:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/stations/:id ────────────────────────────────────────
app.get("/api/stations/:id", async (req, res) => {
  try {
    const db = getPool();
    const { rows } = await db.query("SELECT * FROM stations WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Station not found" });
    res.json(formatStation(rows[0]));
  } catch (err) {
    console.error("Error fetching station:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/stations/:id/report ────────────────────────────────
app.post("/api/stations/:id/report", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["has_fuel", "out_of_stock", "long_queue"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const db = getPool();

    const { rows: existing } = await db.query("SELECT * FROM stations WHERE id = $1", [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: "Station not found" });

    // Update station status
    await db.query(
      "UPDATE stations SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, req.params.id]
    );

    // Log the report
    await db.query(
      "INSERT INTO status_reports (station_id, status) VALUES ($1, $2)",
      [req.params.id, status]
    );

    // Fetch updated station
    const { rows } = await db.query("SELECT * FROM stations WHERE id = $1", [req.params.id]);
    const updatedStation = formatStation(rows[0]);

    // Broadcast real-time update to all connected WebSocket clients
    broadcastStationUpdate(updatedStation);
    broadcastNewReport(req.params.id, status, getClientCount());

    res.json({
      message: "Status report submitted",
      station: updatedStation,
    });
  } catch (err) {
    console.error("Error reporting status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/stations/:id/reports ────────────────────────────────
app.get("/api/stations/:id/reports", async (req, res) => {
  try {
    const db = getPool();
    const { rows } = await db.query(
      "SELECT * FROM status_reports WHERE station_id = $1 ORDER BY reported_at DESC LIMIT 20",
      [req.params.id]
    );
    res.json({ reports: rows });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/stations ───────────────────────────────────────────
app.post("/api/stations", async (req, res) => {
  try {
    const { name, brand, address, lat, lng, fuelTypes, prices } = req.body;

    if (!name || !brand || !address || lat == null || lng == null) {
      return res.status(400).json({ error: "Missing required fields: name, brand, address, lat, lng" });
    }

    const db = getPool();
    const fuel_petrol = fuelTypes?.includes("petrol") ?? true;
    const fuel_diesel = fuelTypes?.includes("diesel") ?? true;

    const { rows } = await db.query(
      `INSERT INTO stations (name, brand, address, lat, lng, fuel_petrol, fuel_diesel, price_petrol, price_diesel)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, brand, address, lat, lng, fuel_petrol, fuel_diesel, prices?.petrol || 0, prices?.diesel || 0]
    );

    res.status(201).json(formatStation(rows[0]));
  } catch (err) {
    console.error("Error creating station:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Health check ─────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const db = getPool();
    await db.query("SELECT 1");
    res.json({
      status: "ok",
      database: "connected",
      websocket: "enabled",
      connectedClients: getClientCount(),
    });
  } catch {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

// ─── Catch-all: serve frontend for client-side routing ────────────
app.get("{*splat}", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ─── Helpers ──────────────────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function formatStation(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    fuelTypes: [
      ...(row.fuel_petrol ? ["petrol"] : []),
      ...(row.fuel_diesel ? ["diesel"] : []),
    ],
    prices: {
      ...(row.fuel_petrol ? { petrol: Number(row.price_petrol) } : {}),
      ...(row.fuel_diesel ? { diesel: Number(row.price_diesel) } : {}),
    },
    status: row.status,
    lastReported: row.updated_at,
  };
}

start();
