import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fraunces',
  display: 'swap',
});

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
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
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${grotesk.variable} ${plexMono.variable}`}>
      <body className="font-body">
        <AmplifyProvider>
          <div className="flex w-full min-h-screen">
            <Sidebar />
            <div className="flex-1 w-full overflow-y-auto bg-bg">
              {children}
            </div>
          </div>
        </AmplifyProvider>
      </body>
    </html>
  );
}
