import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata = {
  title: 'FocusFlow',
  description: 'Break the day into blocks you can actually finish.',
};

import AmplifyProvider from '@/components/AmplifyProvider';
import ClientLayout from '@/components/ClientLayout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${grotesk.variable} ${plexMono.variable}`}>
      <body className="font-body">
        <AmplifyProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </AmplifyProvider>
      </body>
    </html>
  );
}
