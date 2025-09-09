'use client';

import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

export default function Phone({ room }) {
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("init");

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SIGNAL_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join", room);

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { room, candidate: e.candidate });
    };

    socket.on("ice-candidate", async (candidate) => {
      try { await pc.addIceCandidate(candidate); } catch {}
    });

    socket.on("answer", async (sdp) => {
      await pc.setRemoteDescription(sdp);
      setStatus("connected");
    });

    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, frameRate: { ideal: 30 } },
          audio: false
        });
        setStream(s);
        if (localVideoRef.current) localVideoRef.current.srcObject = s;
        s.getTracks().forEach((t) => pc.addTrack(t, s));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { room, sdp: offer });
        setStatus("offered");
      } catch (err) {
        console.error(err);
        setStatus("error");
      }
    })();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      pc.close();
      socket.disconnect();
    };
  }, [room]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Phone — room <code>{room}</code></h2>
      <p>Status: {status}</p>
      <video
        ref={localVideoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", borderRadius: 12, background: "#000" }}
      />
    </div>
  );
}
