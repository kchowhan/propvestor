import type { Metadata } from 'next';
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
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

