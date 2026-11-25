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
    default: "Kairo Pratama, S.T. — Civil Engineer & Software Engineer",
    template: "%s",
  },
  description:
    "Personal portfolio of Kairo Pratama — Civil Engineer & Software Engineer uniting structural infrastructure, BIM automation, full-stack systems, and 3D WebGL LiDAR point clouds.",
  keywords: [
    "Civil Engineer",
    "Software Engineer",
    "Structural Engineering",
    "BIM Automation",
    "Three.js",
    "WebGL",
    "LiDAR Point Cloud",
    "Next.js Portfolio",
  ],
  authors: [{ name: "Kairo Pratama, S.T." }],
  openGraph: {
    type: "website",
    title: "Kairo Pratama, S.T. — Civil Engineer & Software Engineer",
    description:
      "Bridging structural engineering, BIM automation, full-stack software, and interactive 3D WebGL LiDAR point clouds.",
    siteName: "KAIRO // CIVIL × SWE",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kairo Pratama, S.T. — Civil Engineer & Software Engineer",
    description:
      "Structural infrastructure, BIM automation, full-stack systems, and interactive 3D WebGL LiDAR point clouds.",
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
