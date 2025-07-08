// -------------------------
// Backend: server.js (Node.js + ws)
// -------------------------

const WebSocket = require("ws");
const wss = new WebSocket.Server({
  port: 8080,
  verifyClient: (info, done) => {
    // Always accept connection
    done(true);
  }
});  

const sessions = new Map();

wss.on("connection", (ws, req) => {
  const params = new URLSearchParams(req.url.slice(1));
  const id = params.get("id");
  const role = params.get("role");

  if (!id || !role) return ws.close();

  if (!sessions.has(id)) sessions.set(id, { sender: null, receiver: null });

  const session = sessions.get(id);
  session[role] = ws;

  console.log(`[${role}] connected to session ${id}`);

  // Notify sender when receiver connects
  if (role === "receiver" && session.sender && session.sender.readyState === WebSocket.OPEN) {
    session.sender.send(JSON.stringify({ type: "receiver_connected" }));
  }

  ws.on("message", (data, isBinary) => {
    console.log(`[${role}] received message in session ${id}:`, data);
    let peer = session[role === "sender" ? "receiver" : "sender"];  
    if (peer && peer.readyState === WebSocket.OPEN) {
      console.log(`[${role}] forwarding message to peer in session ${id}`);
      peer.send(data, { binary: isBinary });
      console.log(`[${role}] message forwarded to peer in session ${id}`);
    }
  });
 
  ws.on("close", () => {
    console.log(`[${role}] disconnected from session ${id}`);
    session[role] = null;

    // Clean up empty sessions
    if (!session.sender && !session.receiver) {
      sessions.delete(id);
    }
  });
});

console.log("WebSocket server running on ws://localhost:8080");