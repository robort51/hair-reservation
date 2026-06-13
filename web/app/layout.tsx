import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YJMF 预约',
  description: 'YJMF 单门店美发预约系统',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
