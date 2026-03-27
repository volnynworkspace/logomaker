import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LogoAIpro - AI Logo Generator | Design Your Dream Logo in Seconds",
  description: "Transform your brand identity with AI-powered logo design. Create unique, professional logos in seconds using advanced AI models. No design skills needed - just describe your vision and watch it come to life.",
  keywords: [
    "AI logo generator",
    "logo maker",
    "professional logo design",
    "artificial intelligence logo creator",
    "brand identity",
    "custom logo maker",
    "business logo generator",
    "instant logo design",
    "free logo creator",
    "LogoAIpro",
    "AI design tool",
    "brand logo creator",
    "quick logo generator"
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "LogoAIpro - Design Your Dream Logo in Seconds with AI",
    description: "Transform your brand identity with AI-powered logo design. Create professional logos instantly with multiple styles, custom colors, and high-quality downloads.",
    siteName: "LogoAIpro",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "LogoAIpro - AI Logo Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LogoAIpro - Design Your Dream Logo in Seconds",
    description: "Transform your brand identity with AI-powered logo design. Create professional logos instantly.",
    creator: "@Webbuddy_1729",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${manrope.variable} font-primary antialiased`}>
          {children}
          <Toaster />
        </body>
        <Script
        async
        src="https://cloud.umami.is/script.js"
        data-website-id="314e7cd3-1a01-43c1-947f-c855c077906f"
      />
      </html>
    </ClerkProvider>
  );
}
