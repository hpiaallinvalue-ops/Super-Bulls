import type { Metadata } from 'next';
import { Inter, Oswald } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/auth-context';
import { ErrorInitializer } from '@/components/error-initializer';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Super Bulls - Sports News',
  description: 'Your ultimate sports news destination. Watch the latest highlights, breaking news, and trending sports videos from around the world.',
  keywords: ['sports', 'news', 'highlights', 'football', 'basketball', 'MMA', 'cricket', 'tennis', 'baseball', 'NFL', 'NBA', 'UFC'],
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${oswald.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ErrorInitializer />
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
