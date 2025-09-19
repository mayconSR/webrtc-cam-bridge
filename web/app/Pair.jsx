'use client';

import { useEffect, useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function genRoom() {
  // room curtinha e legível
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function Pair() {
  const [room, setRoom] = useState('');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => setRoom(genRoom()), []);

  const phoneUrl = useMemo(() => `${origin}/?role=phone&room=${room}`, [origin, room]);
  const viewerUrl = useMemo(() => `${origin}/?role=viewer&room=${room}`, [origin, room]);

  const copy = (text) => navigator.clipboard?.writeText(text);

  if (!room) return <div style={{ padding: 24 }}>Gerando sala…</div>;

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Cam2PC — Pair</h1>
      <p style={{ marginTop: 0, color: '#555' }}>
        1) Abra este link no <b>PC</b> como Viewer • 2) Escaneie o QR no <b>celular</b> como Phone • 3) Pronto!
      </p>

      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr', marginTop: 16 }}>
        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>1) Viewer no PC</h3>
          <code style={{ display: 'block', wordBreak: 'break-all', marginBottom: 8 }}>{viewerUrl}</code>
          <button onClick={() => copy(viewerUrl)}>Copiar link do Viewer</button>
        </div>

        <div style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 12 }}>
          <h3 style={{ marginTop: 0 }}>2) Phone no Celular (QR)</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <QRCodeCanvas value={phoneUrl} size={160} includeMargin />
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Ou abra manualmente:</div>
              <code style={{ display: 'block', wordBreak: 'break-all', marginBottom: 8 }}>{phoneUrl}</code>
              <button onClick={() => copy(phoneUrl)}>Copiar link do Phone</button>
            </div>
          </div>
        </div>

        <div style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fafafa' }}>
          <b>Sala:</b> <code>{room}</code> • <button onClick={() => setRoom(genRoom())}>Gerar outra</button>
          <p style={{ marginTop: 8, color: '#555' }}>
            Dica: Em produção, use HTTPS/WSS. Em algumas redes móveis, pode precisar de TURN.
          </p>
        </div>
      </div>
    </div>
  );
}
