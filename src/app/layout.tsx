import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Common Table | Maple Street House",
  description: "A shared grocery list and price book for your household.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
