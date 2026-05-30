import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoneyPrinterTurbo Studio",
  description: "Studio SaaS pour generer des videos courtes avec MoneyPrinterTurbo"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
