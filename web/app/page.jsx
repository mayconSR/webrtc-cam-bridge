'use client';

import { useSearchParams } from 'next/navigation';
import Phone from './Phone';
import Viewer from './Viewer';

export default function Page() {
  const sp = useSearchParams();
  const role = sp.get('role');
  const room = sp.get('room');

  if (!role || !room) {
    return (
      <div style={{ padding: 24 }}>
        <h1>webrtc-cam-bridge</h1>
        <p>Abra com query string:</p>
        <ul>
          <li><code>?role=phone&room=teste</code> (no <b>celular</b>)</li>
          <li><code>?role=viewer&room=teste</code> (no <b>PC</b>)</li>
        </ul>
        <p style={{ maxWidth: 640 }}>
          Garanta que o servidor de sinalização está rodando e que <code>NEXT_PUBLIC_SIGNAL_URL</code> aponta para ele.
        </p>
      </div>
    );
  }

  if (role === 'phone') return <Phone room={room} />;
  if (role === 'viewer') return <Viewer room={room} />;

  return <div style={{ padding: 24 }}>Role inválido. Use <code>phone</code> ou <code>viewer</code>.</div>;
}
