"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { Web3Provider } from "@/components/Web3Provider";
import WalletConnect from "@/components/WalletConnect";
import { ImageRecord } from "@/lib/metrics";

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

      // Log the raw data for debugging
      console.log("Raw history data:", data);

      // Ensure history is an array
      const history = Array.isArray(data.history) ? data.history : [];
      console.log(`Found ${history.length} total images`);

      // Filter to only show images with Grove URLs - but log before filtering
      const withGrove = history.filter(
        (img: ImageRecord) => img.groveUri && img.groveUrl
      );
      console.log(`Found ${withGrove.length} images with Grove data`);

      // Don't filter - show all images for now to debug the issue
      setImages(history);
    } catch (error) {
      console.error("Error in fetchImages:", error);
      setError(
        error instanceof Error ? error.message : "Failed to load images"
      );
    } finally {
      setLoading(false);
    }
  };

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
          &ldquo;lensify&rdquo; stored permanently on Grove.
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
          <p className="mb-4">
            No images found. Try refreshing or create images with the
            &ldquo;lensify&rdquo; overlay to store them on Grove.
          </p>
          <div className="flex flex-col items-center">
            <button
              onClick={fetchImages}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
            >
              Refresh Images
            </button>
            <a
              href="/agent?cmd=lensify%20a%20simple%20dojo%20in%20japan%2C%20minimal%20illustration%20style.%20scale%20to%200.3.%20opacity%20to%200.3."
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Create Test Image
            </a>
          </div>
          <div className="mt-4 p-2 bg-gray-200 rounded text-xs text-left">
            <p className="font-bold">Debug Info:</p>
            <p>Images array length: {images.length}</p>
            <p>Loading state: {loading ? "true" : "false"}</p>
            <p>Error state: {error ? error : "none"}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {images.map((image) => (
          <div key={image.id} className="mb-8 p-4 border rounded-lg shadow-sm">
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
                  View on Grove
                </a>
              )}
            </div>
            {image.resultUrl && (
              <div className="relative aspect-square w-full">
                <Image
                  src={getBestImageUrl(image)}
                  alt={`Generated image ${image.id}`}
                  fill
                  className="object-contain"
                />
              </div>
            )}
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
