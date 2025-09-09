// web/app/page.jsx
import ClientApp from './ClientApp';

export const dynamic = 'force-dynamic'; // evita tentativa de prerender estático

export default function Page({ searchParams }) {
  const role = typeof searchParams.role === 'string' ? searchParams.role : '';
  const room = typeof searchParams.room === 'string' ? searchParams.room : '';

  return <ClientApp role={role} room={room} />;
}
