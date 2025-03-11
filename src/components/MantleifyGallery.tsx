"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";

// MantleifyNFT contract ABI (just the functions we need)
const CONTRACT_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256) external view returns (string)",
  "function creators(uint256) external view returns (address)",
  "function _tokenIds() external view returns (uint256)",
  "function groveUrlToTokenId(string) external view returns (uint256)",
];

// Deployed contract address on Mantle Sepolia
const CONTRACT_ADDRESS = "0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37";

interface NFTItem {
  tokenId: string;
  imageUrl: string;
  groveUrl: string;
  owner: string;
  tokenURI: string;
}

export default function MantleifyGallery() {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Connect to Mantle Sepolia
        const provider = new ethers.JsonRpcProvider(
          "https://rpc.sepolia.mantle.xyz"
        );
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );

        // Fetch the latest tokens (up to 8)
        const items: NFTItem[] = [];

        // Determine how many tokens to check
        let maxTokenId = 20; // Default fallback
        try {
          // Try to get the current token counter from the contract
          // Note: This might not be exposed in the contract, so we have a fallback
          const tokenCounter = await contract._tokenIds();
          if (tokenCounter) {
            maxTokenId = Number(tokenCounter);
            console.log("Current token counter:", maxTokenId);
          }
        } catch (error) {
          console.warn(
            "Could not get token counter, using fallback approach",
            error
          );
        }

        // Start from the highest token IDs and work backwards to get the latest mints
        // This is more efficient than starting from 1 and going up
        const startId = Math.max(1, maxTokenId);
        const endId = Math.max(1, startId - 20); // Check up to 20 tokens backwards

        for (let i = startId; i >= endId && items.length < 4; i--) {
          try {
            const tokenId = i.toString();

            // Check if this token exists by trying to get its owner
            const owner = await contract.ownerOf(tokenId);

            // Get the token URI
            const tokenURI = await contract.tokenURI(tokenId);
            console.log(`Token ${tokenId} URI:`, tokenURI);

            // Extract the Grove URL from the tokenURI if possible
            let groveUrl = "";

            // Handle different tokenURI formats
            if (tokenURI && tokenURI.startsWith("ipfs://mantleify/")) {
              try {
                // New format: ipfs://mantleify/encodedGroveUrl
                groveUrl = decodeURIComponent(
                  tokenURI.replace("ipfs://mantleify/", "")
                );
                console.log(
                  `Extracted Grove URL for token ${tokenId}:`,
                  groveUrl
                );
              } catch (decodeError) {
                console.warn(
                  `Could not decode URI for token ${tokenId}:`,
                  decodeError
                );
              }
            } else if (tokenURI && tokenURI.startsWith("ipfs://placeholder/")) {
              // Old format: We don't have the Grove URL in the tokenURI
              // We'll need to use a placeholder image
              console.log(
                `Token ${tokenId} uses old format without Grove URL in tokenURI`
              );
            }

            // Use the Grove URL as the image URL, or fall back to a placeholder
            const imageUrl =
              groveUrl || `/previews/mantleify-${(i % 3) + 1}.png`;

            items.push({
              tokenId,
              imageUrl,
              groveUrl,
              owner,
              tokenURI,
            });
          } catch (tokenError) {
            // Token might not exist, just continue
            console.warn(`Token ${i} might not exist:`, tokenError);
            continue;
          }
        }

        setNfts(items);
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        setError("Failed to load NFTs");
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="text-red-400 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      {nfts.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          <p>No NFTs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {nfts.map((nft) => (
            <div
              key={nft.tokenId}
              className="bg-gray-900 rounded-lg overflow-hidden"
            >
              <div className="relative aspect-square">
                <Image
                  src={nft.imageUrl}
                  alt={`NFT #${nft.tokenId}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="p-2">
                <div className="text-xs text-gray-400 flex justify-between">
                  <span>#{nft.tokenId}</span>
                  <span>{nft.owner.substring(0, 6)}...</span>
                </div>
                {nft.groveUrl && (
                  <a
                    href={nft.groveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:text-purple-800 mt-1 block truncate"
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
  );
}
