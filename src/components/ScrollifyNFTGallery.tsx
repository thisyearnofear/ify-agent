"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";

// ScrollifyNFT contract ABI (just the functions we need)
const CONTRACT_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256) external view returns (string)",
  "function creators(uint256) external view returns (address)",
  "function groveUrlToTokenId(string) external view returns (uint256)",
  "function getTokenIdByGroveUrl(string) external view returns (uint256)",
  "function isGroveUrlMinted(string) external view returns (bool)",
  "function totalSupply() external view returns (uint256)",
];

// Deployed contract address on Scroll Sepolia
const CONTRACT_ADDRESS = "0x653d41fba630381aa44d8598a4b35ce257924d65";

interface NFTItem {
  tokenId: string;
  imageUrl: string;
  groveUrl: string;
  owner: string;
  tokenURI: string;
}

export default function ScrollifyNFTGallery() {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Connect to Scroll Sepolia
        const provider = new ethers.JsonRpcProvider(
          "https://sepolia-rpc.scroll.io"
        );
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );

        // Fetch the latest tokens (up to 4)
        const items: NFTItem[] = [];

        // Try to get the latest 4 tokens
        // Start with token ID 4 and work backwards
        // This assumes tokens are minted sequentially starting from 1
        const startId = 4;

        for (let i = startId; i >= 1 && items.length < 4; i--) {
          try {
            const tokenId = i.toString();

            // Check if this token exists by trying to get its owner
            const owner = await contract.ownerOf(tokenId);

            // Get the token URI
            const tokenURI = await contract.tokenURI(tokenId);

            // Extract the Grove URL from the tokenURI if possible
            let groveUrl = "";

            // Handle tokenURI format
            if (tokenURI) {
              // Check for standard format
              if (tokenURI.startsWith("ipfs://scrollify/")) {
                try {
                  // Format: ipfs://scrollify/encodedGroveUrl
                  groveUrl = decodeURIComponent(
                    tokenURI.replace("ipfs://scrollify/", "")
                  );
                } catch (decodeError) {
                  console.warn(
                    `Could not decode URI for token ${tokenId}:`,
                    decodeError
                  );
                }
              }
            }

            // Use the Grove URL as the image URL, or fall back to a placeholder
            const imageUrl =
              groveUrl ||
              `/previews/scrollify-${(Number(tokenId) % 3) + 1}.png`;

            items.push({
              tokenId: tokenId.toString(),
              imageUrl,
              groveUrl,
              owner,
              tokenURI,
            });
          } catch (tokenError) {
            // Token doesn't exist or other error, continue to next ID
            console.warn(`Error processing token ${i}:`, tokenError);
          }
        }

        setNfts(items);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to load NFTs. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>{error}</p>
        <button
          className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center p-4">
        <p>No Scrollify NFTs found.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold mb-4">Scrollify NFTs</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {nfts.map((nft) => (
          <div
            key={nft.tokenId}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="relative aspect-square">
              <Image
                src={nft.imageUrl}
                alt={`Scrollify NFT #${nft.tokenId}`}
                fill
                className="object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = "/previews/scrollify-placeholder.png";
                }}
              />
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm">
                Scrollify #{nft.tokenId}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                Owner: {nft.owner.substring(0, 6)}...
                {nft.owner.substring(nft.owner.length - 4)}
              </p>
              {nft.groveUrl && (
                <a
                  href={nft.groveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:underline mt-1 block"
                >
                  View on Grove
                </a>
              )}
              <a
                href={`https://sepolia.scrollscan.com/token/${CONTRACT_ADDRESS}?a=${nft.tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline mt-1 block"
              >
                View on Scrollscan
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
