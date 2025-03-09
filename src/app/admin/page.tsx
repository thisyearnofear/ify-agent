"use client";

import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { Web3Provider } from "@/components/Web3Provider";
import WalletConnect from "@/components/WalletConnect";
import { ImageRecord } from "@/lib/metrics";
import MantleifyGallery from "@/components/MantleifyGallery";

function AdminContent() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Use useCallback to memoize the fetchImages function
  const fetchImages = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/history");
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();

      // Filter out images that don't have valid URLs and keep only Grove images
      const validImages = (data.history || [])
        .filter((img: ImageRecord) => img.groveUrl)
        .sort((a: ImageRecord, b: ImageRecord) => {
          // Sort by timestamp, newest first
          return (
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        })
        .slice(0, 8); // Keep only the latest 8 images

      setImages(validImages);
      setError("");
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error in fetchImages:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load images"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Get the best available image URL (Grove URL if available, otherwise temporary URL)
  const getBestImageUrl = (image: ImageRecord): string => {
    if (image.groveUrl) {
      // Check if it's an IPFS URL that needs proxying
      if (image.groveUrl.startsWith("https://ipfs.io/ipfs/")) {
        return `/api/proxy?url=${encodeURIComponent(image.groveUrl)}`;
      }
      return image.groveUrl;
    }
    return image.resultUrl;
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Navigation />

      <div className="flex justify-center mb-4">
        <WalletConnect />
      </div>

      <div className="flex justify-center mb-6">
        <Image
          src="/wowwowowify.png"
          alt="WOWOWIFY"
          width={200}
          height={200}
          className="w-32 h-auto"
          priority
        />
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold text-center mb-4">Latest</h2>

        {isInitialLoad || loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-center">
            <p>{error}</p>
            <button
              onClick={fetchImages}
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Retry
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">No Grove images found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-gray-100 rounded-lg overflow-hidden"
              >
                <div className="relative aspect-square">
                  <Image
                    src={getBestImageUrl(image)}
                    alt={`Generated image ${image.id}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="p-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {new Date(image.timestamp).toLocaleDateString()}
                  </span>
                  {image.groveUrl && (
                    <a
                      href={image.groveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-600 hover:text-purple-800"
                    >
                      Grove
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mantleify NFT Gallery */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-center mb-4">Mantle NFTs</h2>
        <MantleifyGallery />
      </div>

      {/* Refresh button at the bottom */}
      <div className="flex justify-center mt-6 mb-8">
        <button
          onClick={fetchImages}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm"
        >
          {loading ? "Loading..." : "Refresh Gallery"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Web3Provider>
      <style jsx global>{`
        /* Fix for disappearing cursor */
        * {
          cursor: auto !important;
        }
        a,
        button,
        [role="button"] {
          cursor: pointer !important;
        }
      `}</style>
      <AdminContent />
    </Web3Provider>
  );
}
