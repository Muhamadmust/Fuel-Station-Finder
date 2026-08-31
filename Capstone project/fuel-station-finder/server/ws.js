const { WebSocketServer } = require("ws");
const url = require("url");

let wss = null;

function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log(`🔌 WebSocket client connected from ${clientIp}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connected",
      message: "Connected to FuelFinder live updates",
      timestamp: new Date().toISOString(),
    }));

    // Broadcast updated user count to everyone
    broadcastClientCount();

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data);
        handleClientMessage(ws, msg);
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      }
    });

    ws.on("close", () => {
      console.log(`🔌 WebSocket client disconnected`);
      // Broadcast updated user count after disconnect
      broadcastClientCount();
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err.message);
    });
  });

  console.log("🔌 WebSocket server initialized");
  return wss;
}

function handleClientMessage(ws, msg) {
  switch (msg.type) {
    case "ping":
      ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
      break;
    case "subscribe":
      // Future: per-station subscriptions
      ws.send(JSON.stringify({ type: "subscribed", stationId: msg.stationId }));
      break;
    default:
      ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${msg.type}` }));
  }
}

// Broadcast a station update to all connected clients
function broadcastStationUpdate(station) {
  if (!wss) return;

  const message = JSON.stringify({
    type: "station_update",
    station,
    timestamp: new Date().toISOString(),
  });

  let sent = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
      sent++;
    }
  });

  if (sent > 0) {
    console.log(`📡 Broadcast station update to ${sent} client(s): ${station.name}`);
  }
}

// Broadcast a new report notification
function broadcastNewReport(stationId, status, reporterCount) {
  if (!wss) return;

  const message = JSON.stringify({
    type: "new_report",
    stationId,
    status,
    reporterCount,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function getClientCount() {
  if (!wss) return 0;
  let count = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) count++;
  });
  return count;
}

// Broadcast current client count to all connected clients
function broadcastClientCount() {
  if (!wss) return;

  const count = getClientCount();
  const message = JSON.stringify({
    type: "client_count",
    count,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });

  console.log(`👥 Client count broadcast: ${count}`);
}

module.exports = { initWebSocket, broadcastStationUpdate, broadcastNewReport, broadcastClientCount, getClientCount };
