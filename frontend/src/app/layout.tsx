import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "NoteMind AI — Smart Study Assistant",
  description: "Transform handwritten notes into intelligent, searchable digital documents with AI",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
  openGraph: {
    title: "NoteMind AI — Smart Study Assistant",
    description: "Transform handwritten notes into intelligent, searchable digital documents with AI",
    images: [{ url: "/og-image.svg", width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </Providers>
      </body>
    </html>
  );
}
