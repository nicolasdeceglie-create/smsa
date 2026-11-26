import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-grotesk" });

export const metadata: Metadata = {
    title: "SMSA · Il tuo calendario, gestito da Claude",
    description: "Calendario settimanale con utilità, effort e impact dei meeting.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="it" className={`${inter.variable} ${grotesk.variable}`}>
            <body>{children}</body>
        </html>
    );
}
