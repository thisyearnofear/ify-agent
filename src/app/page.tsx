"use client";

import ImageOverlay from "@/components/ImageOverlay";
import CustomCursor from "@/components/CustomCursor";
import Image from "next/image";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <>
      <CustomCursor />
      <main className="min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Image
              src="/wowwowowify.png"
              alt="WOWOWIFY"
              width={200}
              height={200}
              className="w-32 h-auto"
              priority
            />
          </div>
          <ImageOverlay />
        </div>
      </main>
      <Footer />
    </>
  );
}
