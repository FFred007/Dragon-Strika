import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tirage Strika",
  description: "Jets de d20 en direct : Admin vs PJ, PJ vs PJ.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#f8f6f1" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            Tirage Strika
          </Link>
          <nav>
            <Link href="/nouveau">Nouveau tirage</Link>
            <Link href="/pj">Ajouter PJ</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
