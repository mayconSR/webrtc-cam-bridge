export const metadata = { title: "webrtc-cam-bridge" };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
