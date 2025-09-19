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
  const [facing, setFacing] = useState("environment");
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  // cria/atualiza a midia e envia p/ peer
  async function startOrReplaceTrack(kind = 'video') {
    const oldStream = stream;
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1280 }, frameRate: { ideal: 30 } },
      audio: false
    });
    setStream(s);
    if (localVideoRef.current) localVideoRef.current.srcObject = s;

    const track = s.getVideoTracks()[0];

    const caps = track.getCapabilities?.() || {};
    setTorchSupported(Boolean(caps.torch));

    // substitui track no sender se existir
    const pc = pcRef.current;
    const sender = pc?.getSenders?.().find((sd) => sd.track?.kind === kind);
    if (sender) {
      await sender.replaceTrack(track);
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      socketRef.current.emit("offer", { room, sdp: offer });
    } else if (pc) {
      s.getTracks().forEach((t) => pc.addTrack(t, s));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("offer", { room, sdp: offer });
    }

    // limpa stream antigo
    oldStream?.getTracks().forEach((t) => t.stop());
  }

  async function setTorch(on) {
    try {
      const v = stream?.getVideoTracks?.()[0];
      if (!v) return;
      await v.applyConstraints({ advanced: [{ torch: on }] });
      setTorchOn(on);
    } catch (e) {
      console.warn("Torch não suportado/aplicável:", e);
      setTorchOn(false);
    }
  }

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SIGNAL_URL, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("join", { room, role: "phone" });

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { room, candidate: e.candidate });
    };

    socket.on("ice-candidate", async (c) => { try { await pc.addIceCandidate(c); } catch {} });
    socket.on("answer", async (sdp) => { await pc.setRemoteDescription(sdp); setStatus("connected"); });

    // se alguém entrou, re-oferece
    socket.on("peer-joined", async ({ role }) => {
      if (role !== "viewer") return;
      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        socket.emit("offer", { room, sdp: offer });
      } catch {}
    });

    (async () => {
      try {
        await startOrReplaceTrack('video');
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

  // ao trocar facing, reinicia track
  useEffect(() => {
    if (!pcRef.current) return;
    (async () => {
      try {
        await startOrReplaceTrack('video');
      } catch (e) { console.error(e); }
    })();
  }, [facing]);

  return (
    <div style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2>Phone — room <code>{room}</code></h2>
      <p>Status: {status}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>
          Trocar câmera ({facing === 'user' ? 'frontal' : 'traseira'})
        </button>
        <button
          onClick={() => setTorch(!torchOn)}
          disabled={!torchSupported}
          title={torchSupported ? '' : 'Torch não suportado neste dispositivo'}
        >
          {torchOn ? 'Desligar' : 'Ligar'} torch
        </button>
        <button onClick={() => startOrReplaceTrack('video')}>Reiniciar vídeo</button>
      </div>

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
