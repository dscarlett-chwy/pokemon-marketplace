import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Toaster } from "@/components/Toaster";
import { StoreHydrator } from "@/store/hydration";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trade Binder",
  description: "Buy and trade Pokemon cards with other collectors.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bricolage.variable} ${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <StoreHydrator />
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6">{children}</main>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
