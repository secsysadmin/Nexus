import type { Metadata } from "next";
import { THEME_BOOT_SCRIPT } from "./theme-script";
import "@fontsource-variable/raleway";
import "@fontsource/sacramento/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";
import "./dreamy.css";
import "./dreamy-reference.css";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_BOOT_SCRIPT,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
