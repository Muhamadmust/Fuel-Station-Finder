import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook to manage WebSocket connection with auto-reconnect.
 * Returns connection status and a send function.
 *
 * @param {string} url - WebSocket server URL
 * @param {object} handlers - { onStationUpdate, onNewReport, onConnected, onDisconnected }
 * @returns {{ status, send }}
 */
export function useWebSocket(url, handlers = {}) {
  const [status, setStatus] = useState("disconnected"); // "connected" | "disconnected" | "reconnecting"
  const [clientCount, setClientCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectAttempts = useRef(0);
  const handlersRef = useRef(handlers);

  // Keep handlers ref current without causing reconnections
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🔌 WebSocket connected");
        setStatus("connected");
        reconnectAttempts.current = 0;
        handlersRef.current.onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "station_update":
              handlersRef.current.onStationUpdate?.(msg.station);
              break;
            case "new_report":
              handlersRef.current.onNewReport?.(msg);
              break;
            case "client_count":
              setClientCount(msg.count);
              break;
            case "connected":
              console.log("🔌", msg.message);
              break;
            case "pong":
              break;
            default:
              console.log("Unknown WS message:", msg);
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        setStatus("disconnected");
        handlersRef.current.onDisconnected?.();
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error("🔌 WebSocket error:", err);
        ws.close();
      };
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      scheduleReconnect();
    }
  }, [url]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;

    const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000); // exponential backoff, max 30s
    setStatus("reconnecting");

    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      reconnectAttempts.current++;
      connect();
    }, delay);
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Heartbeat ping every 30s
  useEffect(() => {
    if (status !== "connected") return;
    const interval = setInterval(() => send({ type: "ping" }), 30000);
    return () => clearInterval(interval);
  }, [status, send]);

  return { status, clientCount, send };
}
