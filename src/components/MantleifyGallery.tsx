"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";

// MantleifyNFT contract ABI (just the functions we need)
const CONTRACT_ABI = [
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function getTokenIdByGroveUrl(string calldata groveUrl) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
];

// Deployed contract address on Mantle Sepolia
const CONTRACT_ADDRESS = "0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37";

interface NFTItem {
  tokenId: string;
  imageUrl: string;
  groveUrl?: string;
  owner: string;
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

        // Start from token ID 1 and try to fetch up to 20 tokens
        // We'll stop when we have 8 valid tokens or hit an error
        for (let i = 1; i <= 20 && items.length < 8; i++) {
          try {
            const tokenId = i.toString();
            const owner = await contract.ownerOf(tokenId);

            // Try to get the token URI
            await contract.tokenURI(tokenId);

            // For now, we'll use a placeholder image since we don't have actual metadata
            // In a real implementation, you'd fetch the metadata from IPFS
            const imageUrl = `/previews/mantleify-${(i % 3) + 1}.png`;

            items.push({
              tokenId,
              imageUrl,
              owner,
            });
          } catch {
            // Token might not exist, just continue
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
                />
              </div>
              <div className="p-2">
                <div className="text-xs text-gray-400">
                  #{nft.tokenId} · {nft.owner.substring(0, 6)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
