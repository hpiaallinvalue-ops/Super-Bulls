import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { ErrorInitializer } from '@/components/error-initializer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Super Bulls - Sports News',
  description: 'Your ultimate sports news destination. Watch the latest highlights, breaking news, and trending sports videos from around the world.',
  keywords: ['sports', 'news', 'highlights', 'football', 'basketball', 'MMA', 'cricket', 'tennis', 'baseball', 'NFL', 'NBA', 'UFC'],
  icons: {
    icon: '/logo.svg',
  },
};

/**
 * Root Layout — minimal server component.
 *
 * No Firebase, no next/font/google, no heavy SDK imports.
 * Fonts are loaded via CSS @import in globals.css (client-side only).
 * This guarantees the module evaluation will never crash on Cloudflare Workers.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <ErrorInitializer />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
