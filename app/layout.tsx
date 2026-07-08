import type {Metadata} from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css'; // Global styles

const vazirmatn = Vazirmatn({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ثبت نام کاربر',
  description: 'صفحه ثبت نام ساده و زیبا',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fa" dir="rtl">
      <body className={vazirmatn.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

