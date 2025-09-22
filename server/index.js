import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

const PORT = process.env.PORT || 5174;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const parseOrigins = (origins) =>
  origins === "*"
    ? true
    : origins.split(",").map((s) => s.trim()).filter(Boolean);

const app = express();
app.use(cors({ origin: parseOrigins(CORS_ORIGIN), credentials: true }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: parseOrigins(CORS_ORIGIN) } });

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`[io] connected ${socket.id}`);

  socket.on("join", (payload) => {
    const { room, role } =
      typeof payload === "string"
        ? { room: payload, role: "unknown" }
        : (payload || {});

    if (typeof room !== "string" || room.length > 128) return;

    socket.join(room);
    console.log(`[io] ${socket.id} joined room ${room} (role=${role})`);

    socket.to(room).emit("peer-joined", { id: socket.id, role });

    const state = rooms.get(room);
    if (role === "viewer" && state?.lastOffer) {
      console.log(`[io] replay lastOffer to late viewer in room ${room}`);
      socket.emit("offer", state.lastOffer);
    }
  });

  socket.on("offer", ({ room, sdp }) => {
    if (!room || !sdp) return;
    console.log(`[io] offer in room ${room}`);
    const prev = rooms.get(room) || {};
    rooms.set(room, { ...prev, lastOffer: sdp }); 
    socket.to(room).emit("offer", sdp);
  });

  socket.on("answer", ({ room, sdp }) => {
    if (!room || !sdp) return;
    console.log(`[io] answer in room ${room}`);
    socket.to(room).emit("answer", sdp);
  });

  socket.on("ice-candidate", ({ room, candidate }) => {
    if (!room || !candidate) return;
    socket.to(room).emit("ice-candidate", candidate);
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room === socket.id) continue;
      socket.to(room).emit("peer-left", { id: socket.id });
      // limpeza se a sala ficou com 0/1 membro
      const set = io.sockets.adapter.rooms.get(room);
      if (!set || set.size <= 1) rooms.delete(room);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[io] disconnected ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`[server] signaling on http://localhost:${PORT}`);
});
