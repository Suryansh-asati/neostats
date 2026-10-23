import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "FlowForge | Project Workspace", template: "%s | FlowForge" },
  description: "A collaborative project workspace for teams.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
