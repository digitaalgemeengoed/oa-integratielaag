export const metadata = { title: "Office Assistent — prototype" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f6f4", color: "#1d1d1b" }}>{children}</body>
    </html>
  );
}
