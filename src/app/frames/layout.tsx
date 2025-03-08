import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WOWOWIFY",
  description: "wowowifys with cool overlays directly in Farcaster",
  openGraph: {
    title: "WOWOWIFY",
    description: "wowowifys with cool overlays directly in Farcaster",
    images: [
      {
        url: "/previews/frame-preview.png",
        width: 1200,
        height: 630,
        alt: "WOWOWIFY Frame Preview",
      },
    ],
  },
  other: {
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/previews/frame-preview.png`
        : "https://wowowifyer.vercel.app/previews/frame-preview.png",
      button: {
        title: "wowowify",
        action: {
          type: "launch_frame",
          name: "WOWOWIFY",
          url: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/frames`
            : "https://wowowifyer.vercel.app/frames",
          splashImageUrl: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/wowwowowify.png`
            : "https://wowowifyer.vercel.app/wowwowowify.png",
          splashBackgroundColor: "#131313",
        },
      },
    }),
  },
};

export default function FrameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="bg-gray-900 min-h-screen">{children}</div>;
}
