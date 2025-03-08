"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import Link from "next/link";

// MantleifyNFT contract ABI (just the functions we need)
const CONTRACT_ABI = [
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "function getTokenIdByGroveUrl(string calldata groveUrl) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
];

// Deployed contract address on Mantle Sepolia
const CONTRACT_ADDRESS = "0xfbe99dcd3b2d93b1c8ffabc26427383daaba05d1";

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

        // Get total supply (if the contract has this function)
        try {
          await contract.totalSupply();
          // We don't actually use this value, just checking if the function exists
        } catch {
          console.log(
            "Contract may not have totalSupply function, using fallback method"
          );
          // Fallback: We'll try to fetch the latest few tokens
        }

        // Fetch the latest tokens (up to 10)
        // Since we don't know the exact token count, we'll try the latest few IDs
        const items: NFTItem[] = [];

        // Start from token ID 1 and try to fetch up to 20 tokens
        // We'll stop when we have 10 valid tokens or hit an error
        for (let i = 1; i <= 20 && items.length < 10; i++) {
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
        setError("Failed to load NFTs from the collection");
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Mantleify NFT Collection</h2>
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Mantleify NFT Collection</h2>
        <div className="text-red-400 text-center">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Mantleify NFT Collection</h2>
        <Link
          href="https://sepolia.mantlescan.xyz/address/0xfbe99dcd3b2d93b1c8ffabc26427383daaba05d1"
          target="_blank"
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          View on Mantle Explorer
        </Link>
      </div>

      {nfts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No NFTs have been minted yet.</p>
          <p className="mt-2 text-sm">
            Generate an image with the &ldquo;mantleify&rdquo; command and mint
            it!
          </p>
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-400 mb-4">
            Showing {nfts.length} NFTs from the collection
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                  <div className="text-sm font-medium">
                    Token #{nft.tokenId}
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    Owner: {nft.owner.substring(0, 6)}...
                    {nft.owner.substring(38)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
