import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TradingCrew - Snap · Share · Swap | Trading Cards for Kids",
  description:
    "TradingCrew is the ultimate trading card community for kids. Upload photos of your sports, Pokémon, and collectible cards, share galleries with friends, and propose trades to complete in person. Safe, fun, and easy!",
  keywords: [
    "trading cards",
    "kids trading",
    "Pokémon cards",
    "sports cards",
    "card collection",
    "trade cards",
    "card gallery",
    "collectibles",
  ],
  authors: [{ name: "TradingCrew" }],
  creator: "TradingCrew",
  metadataBase: new URL("https://tradingcrew.ai"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://tradingcrew.ai",
    siteName: "TradingCrew",
    title: "TradingCrew - Snap · Share · Swap",
    description:
      "The ultimate trading card community for kids. Upload your cards, share with friends, and trade in person!",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradingCrew - Snap · Share · Swap",
    description:
      "The ultimate trading card community for kids. Upload your cards, share with friends, and trade in person!",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
