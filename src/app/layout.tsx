import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import { BRAND } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND,
  description: "Buy, sell and swap with verified students at your university.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="container">{children}</main>
        <footer className="footer">
          {BRAND} · Prototype for the CM32027 coursework · Demo only, not a live service
        </footer>
      </body>
    </html>
  );
}
