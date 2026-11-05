import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import "./dreamy.css";
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
            __html: `(function(){var t;try{t=localStorage.getItem('societyhub-theme')}catch(e){}var m=window.matchMedia('(prefers-color-scheme: dark)');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:m.matches?'dark':'light';m.addEventListener('change',function(e){var saved;try{saved=localStorage.getItem('societyhub-theme')}catch(x){}if(saved!=='light'&&saved!=='dark')document.documentElement.dataset.theme=e.matches?'dark':'light'});window.addEventListener('storage',function(e){if(e.key==='societyhub-theme')document.documentElement.dataset.theme=e.newValue==='dark'||e.newValue==='light'?e.newValue:m.matches?'dark':'light'})})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
