import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/sonner";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClaimFlow | AI-Native EHR & Practice Management",
  description:
    "End-to-end revenue cycle management with AI-powered charge capture and claims automation.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <TRPCProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TRPCProvider>
      </body>
    </html>
  );
}
