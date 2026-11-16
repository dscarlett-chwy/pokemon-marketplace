import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/Toaster";
import { StoreHydrator } from "@/store/hydration";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trade Binder",
  description: "Buy and trade Pokemon cards with other collectors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <StoreHydrator />
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6">{children}</main>
          <SiteFooter />
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
