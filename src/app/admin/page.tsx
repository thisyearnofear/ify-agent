"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { Web3Provider } from "@/components/Web3Provider";
import WalletConnect from "@/components/WalletConnect";

interface ImageRecord {
  id: string;
  resultUrl: string;
  groveUri?: string;
  groveUrl?: string;
  timestamp: string;
}

function AdminContent() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/history");
      if (!response.ok) {
        throw new Error(`Error fetching images: ${response.statusText}`);
      }
      const data = await response.json();
      setImages(data.history || []);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load images"
      );
    } finally {
      setLoading(false);
    }
  };

  // Get the best available image URL (Grove URL if available, otherwise temporary URL)
  const getBestImageUrl = (image: ImageRecord): string => {
    // If Grove URL is available, use it
    if (image.groveUrl) {
      return image.groveUrl;
    }
    // Otherwise use the temporary URL
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

      <div className="flex justify-center mb-6">
        <button
          onClick={fetchImages}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Images
        </button>
      </div>

      <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-purple-700 text-center">
          Images created with the &ldquo;lensify&rdquo; overlay are stored
          permanently on Grove.
          <br />
          Connect your wallet to manage your stored images.
        </p>
      </div>

      {loading && (
        <div className="p-4 bg-white rounded border text-center">
          <p>Loading images...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded text-center">
          {error}
        </div>
      )}

      {!loading && images.length === 0 && (
        <div className="p-4 bg-gray-100 rounded border text-center">
          <p>No images found.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {images.map((image) => (
          <div key={image.id} className="p-4 bg-white rounded border shadow-sm">
            <div className="relative w-full h-48 mb-3">
              {/* Use Grove URL if available, otherwise try the temporary URL */}
              <Image
                src={getBestImageUrl(image)}
                alt="Generated image"
                fill
                className="object-contain rounded border"
                unoptimized // Skip Next.js image optimization for external URLs
              />
            </div>

            {image.groveUri && image.groveUrl ? (
              <div className="mt-3 text-center">
                <a
                  href={image.groveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-800 underline"
                >
                  View on Grove
                </a>
                <p className="text-xs text-green-600 mt-1">
                  ✓ Permanently stored
                </p>
              </div>
            ) : (
              <div className="mt-3 text-center text-gray-500 text-sm">
                <span>Temporary storage only</span>
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠ May no longer be available
                </p>
              </div>
            )}

            <div className="mt-3 flex justify-center">
              <a
                href={getBestImageUrl(image)}
                download
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Web3Provider>
      <AdminContent />
    </Web3Provider>
  );
}
