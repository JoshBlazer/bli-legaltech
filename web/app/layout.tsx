import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "./components/Nav";

export const metadata: Metadata = {
  title: "Attestry — on-chain compliance attestations",
  description:
    "Privacy-preserving, independently-verifiable, court-fileable on-chain compliance evidence.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
