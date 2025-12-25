import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/tasa-explorer';
import '../styles/index.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'PropVestor - Property & Investment Management Platform',
  description: 'Property & Investment Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

