import type { Metadata } from "next";
import { THEME_BOOT_SCRIPT } from "./theme-script";
import "@fontsource-variable/manrope";
import "@fontsource/sacramento/latin-400.css";
import "./globals.css";
import "./dreamy.css";
import "./dreamy-reference.css";
export const metadata: Metadata = {
  title: "SocietyHub",
  description:
    "The engineering society workspace for Texas A&M ESOs and the Student Engineers’ Council.",
  icons: {
    icon: "/societyhub-mark.svg",
    shortcut: "/societyhub-mark.svg",
    apple: "/societyhub-mark.svg",
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
