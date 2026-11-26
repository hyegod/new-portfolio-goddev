import type { Metadata, Viewport } from "next";
import {
  JetBrains_Mono,
  Permanent_Marker,
  Space_Grotesk,
  Syne,
} from "next/font/google";
import "./globals.css";
import { PageTransitionProvider } from "@/components/PageTransitionProvider";

const syne = Syne({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const permanentMarker = Permanent_Marker({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-permanent-marker",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Godlift Farrelio — Civil Engineering & Software Development",
    template: "%s",
  },
  description:
    "Personal portfolio of Godlift Farrelio — Civil Engineering student at Bosowa University & Full-Stack Software Developer uniting structures, code, 3D WebGL, bass music, and photography.",
  keywords: [
    "Godlift Farrelio",
    "Civil Engineering",
    "Software Developer",
    "Full-Stack Developer",
    "Bosowa University",
    "BIM Automation",
    "Three.js",
    "WebGL",
    "Next.js Portfolio",
  ],
  authors: [{ name: "Godlift Farrelio" }],
  openGraph: {
    type: "website",
    title: "Godlift Farrelio — Civil Engineering × Software Development",
    description:
      "Civil Engineering student at Bosowa University & Full-Stack Software Developer from Indonesia — uniting structures, code, music, and visual storytelling.",
    siteName: "GODLIFT // CIVIL × SWE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Godlift Farrelio — Civil Engineering × Software Development",
    description:
      "Civil Engineering, Full-Stack Software Development, 3D WebGL LiDAR, Bass Music & Photography — Indonesia.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#ECEEF0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${permanentMarker.variable}`}
    >
      <body className="concrete-surface antialiased selection:bg-[#0038FF] selection:text-white">
        <PageTransitionProvider>{children}</PageTransitionProvider>
      </body>
    </html>
  );
}
