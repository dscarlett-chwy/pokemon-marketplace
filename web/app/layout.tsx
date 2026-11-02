import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { currentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Circuit — Trade Pokémon cards",
  description: "A card-for-card marketplace for Pokémon collectors.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell nav-inner">
            <Link href="/" className="brand" aria-label="Card Circuit home">
              <span className="brand-mark">
                <Layers3 size={23} strokeWidth={2.4} />
              </span>
              <span>
                CARD<span className="brand-light">CIRCUIT</span>
                <small>THE COLLECTOR EXCHANGE</small>
              </span>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/#browse">Browse cards</Link>
              <Link href="/new">List a card</Link>
              <Link href="/trades">My trades</Link>
            </nav>
            <div className="nav-account">
              {user ? (
                <Link href="/trades" className="account-link">
                  Hi, {user.displayName.split(" ")[0]}{" "}
                  <ArrowUpRight size={17} />
                </Link>
              ) : (
                <Link href="/account" className="button nav-signin">
                  Sign in <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="shell footer-inner">
            <span>
              <strong>CARD CIRCUIT</strong> · A place for collectors to connect.
            </span>
            <span>
              Card images via{" "}
              <a href="https://tcgdex.dev" target="_blank" rel="noreferrer">
                TCGdex
              </a>
              . Not affiliated with Pokémon.
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
