import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
export const metadata: Metadata = {
  title: "SocietyHub",
  description:
    "The engineering society workspace for Texas A&M ESOs and the Student Engineers’ Council.",
  icons: {
    icon: "/sec-logo.png",
    shortcut: "/sec-logo.png",
    apple: "/sec-logo.png",
  },
  robots: { index: false, follow: false },
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
