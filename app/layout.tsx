import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SocialBoost AI — Publie moins, gagne plus.',
  description:
    "L'IA qui idée, rédige, planifie et publie ton contenu sur Instagram, TikTok, LinkedIn, X et Facebook. Pour créateurs et petits business.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
