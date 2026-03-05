import "@/styles/globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Restaurant AI Revenue & Voice Copilot",
  description: "Enterprise revenue intelligence and AI voice ordering for restaurants",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-bg font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
