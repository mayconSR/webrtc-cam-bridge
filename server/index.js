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

// Healthcheck
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: parseOrigins(CORS_ORIGIN) }
});

io.on("connection", (socket) => {
  console.log(`[io] connected ${socket.id}`);

  socket.on("join", (room) => {
    if (typeof room !== "string" || room.length > 128) return;
    socket.join(room);
    console.log(`[io] ${socket.id} joined room ${room}`);
    socket.to(room).emit("peer-joined", { id: socket.id });
  });

  socket.on("offer", ({ room, sdp }) => {
    if (room) socket.to(room).emit("offer", sdp);
  });

  socket.on("answer", ({ room, sdp }) => {
    if (room) socket.to(room).emit("answer", sdp);
  });

  socket.on("ice-candidate", ({ room, candidate }) => {
    if (room && candidate) socket.to(room).emit("ice-candidate", candidate);
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit("peer-left", { id: socket.id });
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[io] disconnected ${socket.id} (${reason})`);
  });
});

server.listen(PORT, () => {
  console.log(`[server] signaling on http://localhost:${PORT}`);
  console.log(`[server] healthcheck: http://localhost:${PORT}/health`);
});
