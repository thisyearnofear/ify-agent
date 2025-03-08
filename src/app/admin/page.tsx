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
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  // Use useCallback to memoize the fetchImages function
  const fetchImages = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    } else {
      setIsBackgroundLoading(true);
    }

    try {
      const response = await fetch("/api/history");
      if (!response.ok) {
        if (response.status === 504) {
          // Server is cold starting
          setError("Warming up the server, please wait a moment...");
          // Try again in 10 seconds
          setTimeout(() => fetchImages(true), 10000);
          return;
        }
        throw new Error(`Error fetching images: ${response.statusText}`);
      }
      const data = await response.json();

      // Filter out images that don't have valid URLs
      const validImages = (data.history || []).filter((img: ImageRecord) => {
        // Keep Grove images
        if (img.groveUrl) return true;
        // Keep temporary images that are still available
        if (
          img.resultUrl &&
          img.resultUrl.startsWith("https://wowowify.vercel.app/")
        ) {
          // Check if the image was created in the last hour (temporary images expire)
          const imageAge = Date.now() - new Date(img.timestamp).getTime();
          const oneHour = 60 * 60 * 1000;
          return imageAge < oneHour;
        }
        return false;
      });

      setImages(validImages);
      setError("");
      setIsInitialLoad(false);
    } catch (error) {
      console.error("Error in fetchImages:", error);
      if (!isBackground) {
        setError(
          error instanceof Error ? error.message : "Failed to load images"
        );
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      } else {
        setIsBackgroundLoading(false);
      }
    }
  }, []); // Empty dependency array since it doesn't depend on any props or state

  useEffect(() => {
    fetchImages();
  }, [fetchImages]); // Add fetchImages to the dependency array

  // Get the best available image URL (Grove URL if available, otherwise temporary URL)
  const getBestImageUrl = (image: ImageRecord): string => {
    console.log("Processing image:", image.id, {
      hasGroveUrl: !!image.groveUrl,
      hasResultUrl: !!image.resultUrl,
    });

    // If Grove URL is available, use it through our proxy if it's an IPFS URL
    if (image.groveUrl) {
      // Check if it's an IPFS URL that needs proxying
      if (image.groveUrl.startsWith("https://ipfs.io/ipfs/")) {
        const proxiedUrl = `/api/proxy?url=${encodeURIComponent(
          image.groveUrl
        )}`;
        console.log(`Proxying IPFS URL for ${image.id}:`, proxiedUrl);
        return proxiedUrl;
      }
      console.log(`Using Grove URL for ${image.id}:`, image.groveUrl);
      return image.groveUrl;
    }

    // Otherwise use the temporary URL
    console.log(`Using result URL for ${image.id}:`, image.resultUrl);
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

      <div className="flex flex-col items-center gap-4 mb-6">
        <button
          onClick={() => fetchImages(false)}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Refresh Images"}
        </button>

        {isBackgroundLoading && (
          <p className="text-sm text-gray-500 animate-pulse">
            Checking for new images...
          </p>
        )}
      </div>

      {isInitialLoad ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading your gallery...</p>
          <p className="text-sm text-gray-500 mt-2">
            This might take a moment if the server is warming up.
          </p>
        </div>
      ) : loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg text-center">
          <p>{error}</p>
          <button
            onClick={() => fetchImages(false)}
            className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Try Again
          </button>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border">
          <p className="text-gray-600 mb-4">
            No images found. Create some using the &ldquo;lensify&rdquo;
            overlay!
          </p>
          <a
            href="/agent?cmd=lensify%20a%20simple%20dojo%20in%20japan%2C%20minimal%20illustration%20style.%20scale%20to%200.3.%20opacity%20to%200.3."
            className="inline-block px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Create
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {images.map((image) => (
            <div
              key={image.id}
              className="mb-8 p-4 border rounded-lg shadow-sm"
            >
              <div className="mb-2 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {new Date(image.timestamp).toLocaleString()}
                </span>
                {image.groveUrl && (
                  <a
                    href={image.groveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-purple-600 hover:text-purple-800"
                  >
                    Grove
                  </a>
                )}
              </div>
              <div className="relative aspect-square w-full">
                <Image
                  src={getBestImageUrl(image)}
                  alt={`Generated image ${image.id}`}
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mantleify NFT Gallery */}
      <div className="mt-12 mb-6">
        <h2 className="text-2xl font-bold text-center mb-6">
          Mantleify NFT Collection
        </h2>
        <MantleifyGallery />
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
