import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "NeoStats",
  description: "Collaborative project management",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui",
          maxWidth: 960,
          margin: "40px auto",
          padding: 20,
          background: "#f6f7fb",
          color: "#182230",
        }}
      >
        {children}
      </body>
    </html>
  );
}
