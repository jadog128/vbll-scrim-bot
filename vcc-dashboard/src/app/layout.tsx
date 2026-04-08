import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'VCC Admin Dashboard',
  description: 'Control panel for VCC custom requests',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
