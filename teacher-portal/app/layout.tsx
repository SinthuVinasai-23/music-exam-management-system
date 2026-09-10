import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Teacher Portal | Music Examination',
  icons: { icon: '/favicon.svg' },
  description: 'Music Examination Management System - Teacher Portal frontend.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
