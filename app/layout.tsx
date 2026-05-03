import type { Metadata } from 'next';
import { sans, display, mono } from './fonts';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'SocialBoost AI — Une idée. Une semaine de contenu. Ta voix.',
  description:
    "L'IA qui transforme un transcript, une URL ou une note en campagne LinkedIn, Instagram, X et TikTok qui sonne réellement comme toi. Pas du ChatGPT générique.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} ${mono.variable}`}
    >
      <body className="bg-bg font-sans text-fg antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
