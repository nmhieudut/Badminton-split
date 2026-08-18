import type { Metadata } from 'next';
import { Be_Vietnam_Pro, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

/*
 * Be Vietnam Pro is drawn for Vietnamese: the app is entirely in Vietnamese and
 * a default system sans renders the stacked diacritics poorly at the weights
 * used for headings. Plex Mono carries every amount, so columns of đồng line up.
 */
const beVietnam = Be_Vietnam_Pro({
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-be-vietnam',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex-mono',
});

export const metadata: Metadata = {
  title: 'Badminton Split — Chia Tiền Cầu Lông',
  description: 'Ghi chép buổi đánh, đếm trái cầu và chia tiền minh bạch',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${plexMono.variable}`}>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
