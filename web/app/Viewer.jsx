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

    //debug
    pc.onconnectionstatechange = () => console.log('[pc] connectionState:', pc.connectionState);
    pc.oniceconnectionstatechange = () => console.log('[pc] iceConnectionState:', pc.iceConnectionState);

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("ice-candidate", { room, candidate: e.candidate });
    };

    pc.ontrack = (ev) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0];
      setStatus("playing");
    };

    // ===== Perfect Negotiation (Viewer = polite) =====
    let makingOffer = false;
    const polite = true;
    let lastOfferSDP = "";


    pc.onnegotiationneeded = async () => {
      try {
        makingOffer = true;
        await pc.setLocalDescription();
        socket.emit("offer", { room, sdp: pc.localDescription });
      } catch (err) {
        console.warn('negotiationneeded error', err);
      } finally {
        makingOffer = false;
      }
    };

    socket.on("offer", async (sdp) => {
      try {
        if (typeof sdp?.sdp === 'string' && sdp.sdp === lastOfferSDP) {
          console.log('[socket] offer duplicado — ignorando');
          return;
        }

        const offer = new RTCSessionDescription(sdp);
        const readyForOffer =
          !makingOffer &&
          (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");

        const offerCollision = !readyForOffer;

        if (offerCollision) {
          if (!polite) {
            console.log('[negotiation] glare (impolite) — ignorando offer');
            return;
          }
          console.log('[negotiation] glare (polite) — rollback local e aplicar remote offer');
          await pc.setLocalDescription({ type: "rollback" });
        }

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { room, sdp: pc.localDescription });
        setStatus("answer-sent");
        lastOfferSDP = sdp.sdp || "";
      } catch (err) {
        console.error("[viewer] erro ao processar offer", err, {
          signalingState: pc.signalingState
        });
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
        muted
        controls
        style={{ width: "100%", borderRadius: 12, background: "#000" }}
      />
      {status === 'socket-error' && (
        <p style={{ color: '#b91c1c' }}>
          Erro de conexão ao servidor de sinalização. Verifique <code>NEXT_PUBLIC_SIGNAL_URL</code> e CORS.
        </p>
      )}
    </div>
  );
}
