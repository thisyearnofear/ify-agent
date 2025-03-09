"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";

// MantleifyNFT contract ABI (just the functions we need)
const CONTRACT_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function groveUrlToTokenId(string) external view returns (uint256)",
  "event MantleifyNFTMinted(uint256 indexed tokenId, address indexed creator, string groveUrl, string tokenURI)",
];

// Deployed contract address on Mantle Sepolia
const CONTRACT_ADDRESS = "0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37";

interface NFTItem {
  tokenId: string;
  imageUrl: string;
  groveUrl: string;
  owner: string;
}

// Define a type for the event with args
interface MintEvent extends ethers.Log {
  args?: {
    tokenId: bigint;
    creator: string;
    groveUrl: string;
    tokenURI: string;
  };
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

            // Check if this token exists by trying to get its owner
            const owner = await contract.ownerOf(tokenId);

            // For now, we'll use a placeholder image
            let imageUrl = `/previews/mantleify-${(i % 3) + 1}.png`;
            let groveUrl = "";

            // Try to extract the actual Grove URL from transaction logs or events
            try {
              // Look for MantleifyNFTMinted events for this token
              const filter = contract.filters.MantleifyNFTMinted(i);
              const events = await contract.queryFilter(filter);

              if (events.length > 0) {
                // Extract the Grove URL from the event
                const event = events[0] as MintEvent;
                if (event.args?.groveUrl) {
                  groveUrl = event.args.groveUrl;
                  imageUrl = groveUrl;
                }
              }
            } catch (eventError) {
              console.warn(
                `Could not fetch events for token ${tokenId}:`,
                eventError
              );

              // If we can't get the event, try a different approach
              // For testing, we'll use the actual Grove URLs you've minted
              if (tokenId === "1") {
                groveUrl =
                  "https://api.grove.storage/eabcf4739fc252f54c7f83ed8851bce584f888e98c439abc63a2b7a4305ef643";
                imageUrl = groveUrl;
              } else if (tokenId === "2") {
                // Add other known Grove URLs for testing
                groveUrl = "https://api.grove.storage/ipfs/QmYourGroveHash2";
                imageUrl = groveUrl;
              } else if (tokenId === "3") {
                groveUrl =
                  "https://api.grove.storage/eabcf4739fc252f54c7f83ed8851bce584f888e98c439abc63a2b7a4305ef643";
                imageUrl = groveUrl;
              }
            }

            items.push({
              tokenId,
              imageUrl,
              groveUrl,
              owner,
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
