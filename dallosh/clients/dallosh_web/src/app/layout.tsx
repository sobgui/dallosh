import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/app-providers';
import '@/lib/polyfills'; // Import polyfills for browser compatibility

export const metadata: Metadata = {
  title: 'Sodular CMS',
  description: 'The Next-Gen Engineering CMS',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
