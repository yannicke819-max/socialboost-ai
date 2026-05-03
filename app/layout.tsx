import type { Metadata } from 'next';
import { sans, display, mono } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'SocialBoost AI — Transforme ton expertise en revenus.',
  description:
    "Editorial Revenue System pour solo creators et TPE. Donne ton offre, on construit la campagne qui la vend.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      data-theme="dark"
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
    >
      <body className="bg-bg font-sans text-fg antialiased">{children}</body>
    </html>
  );
}
