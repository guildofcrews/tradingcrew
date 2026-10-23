import type { Metadata } from "next";
import { Manrope, DM_Serif_Display, Fredoka } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
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
    <html lang="en" className={`${manrope.variable} ${dmSerifDisplay.variable} ${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
