// @ts-nocheck
import type { Metadata } from 'next';
import { Cinzel, Playfair_Display, Inter } from 'next/font/google';
import './globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '600', '700', '900'],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: '2nd Annual Baltimore Betrayal',
  description: 'A Traitors-style murder mystery weekend',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${playfair.variable} ${inter.variable}`}>
      <body className="bg-betrayal-black text-betrayal-text font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
