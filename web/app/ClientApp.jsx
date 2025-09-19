'use client';

import Pair from './Pair';
import Phone from './Phone';
import Viewer from './Viewer';

export default function ClientApp({ role, room }) {
  if (!role || !room) return <Pair />;

  if (role === 'phone') return <Phone room={room} />;
  if (role === 'viewer') return <Viewer room={room} />;

  return <div style={{ padding: 24 }}>Role inválido. Use <code>phone</code> ou <code>viewer</code>.</div>;
}
