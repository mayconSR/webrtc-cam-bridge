'use client';

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

export default function Viewer({ room }) {
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const [status, setStatus] = useState("init");

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SIGNAL_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => setStatus("socket-connected"));
    socket.on("connect_error", (e) => { console.error(e); setStatus("socket-error"); });

    socket.emit("join", { room, role: "viewer" });

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { room, candidate: e.candidate });
    };

    pc.ontrack = (ev) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0];
      setStatus("playing");
    };

    socket.on("offer", async (sdp) => {
      try {
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { room, sdp: answer });
        setStatus("answer-sent");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    });

    socket.on("ice-candidate", async (candidate) => {
      try { await pc.addIceCandidate(candidate); } catch {}
    });

    return () => {
      pc.close();
      socket.disconnect();
    };
  }, [room]);

  const goFullscreen = async () => {
    try { await remoteVideoRef.current?.requestFullscreen?.(); } catch {}
  };

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2>Viewer — room <code>{room}</code></h2>
      <p>Status: {status}</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={goFullscreen}>Tela cheia</button>
      </div>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        controls
        style={{ width: "100%", borderRadius: 12, background: "#000" }}
      />
      {status === 'socket-error' && (
        <p style={{ color: '#b91c1c' }}>
          Erro de conexão ao servidor de sinalização. Verifique <code>NEXT_PUBLIC_SIGNAL_URL</code> (HTTPS/WSS) e CORS.
        </p>
      )}
    </div>
  );
}
