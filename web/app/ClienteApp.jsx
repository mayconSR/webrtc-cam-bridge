'use client';

import Phone from './Phone';
import Viewer from './Viewer';

export default function ClientApp({ role, room }) {
  if (!role || !room) {
    return (
      <div style={{ padding: 24 }}>
        <h1>cam2pc-webrtc</h1>
        <p>Use via query string:</p>
        <ul>
          <li><code>?role=phone&room=teste</code> (no <b>celular</b>)</li>
          <li><code>?role=viewer&room=teste</code> (no <b>PC</b>)</li>
        </ul>
        <p style={{ maxWidth: 640 }}>
          Garanta que o servidor de sinalização está ativo e que <code>NEXT_PUBLIC_SIGNAL_URL</code> aponta pra ele.
        </p>
      </div>
    );
  }

  if (role === 'phone') return <Phone room={room} />;
  if (role === 'viewer') return <Viewer room={room} />;

  return <div style={{ padding: 24 }}>Role inválido. Use <code>phone</code> ou <code>viewer</code>.</div>;
}
