"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";

// MantleifyNFT contract ABI (just the functions we need)
const CONTRACT_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256) external view returns (string)",
  "function creators(uint256) external view returns (address)",
  "function totalSupply() external view returns (uint256)",
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
  tokenURI: string;
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

        // First, try to get the total supply
        let totalSupply = 0;
        try {
          const supply = await contract.totalSupply();
          totalSupply = Number(supply);
          console.log("Total supply:", totalSupply);
        } catch (error) {
          console.warn(
            "Could not get total supply, will try sequential IDs",
            error
          );
          totalSupply = 20; // Fallback to checking first 20 IDs
        }

        // Start from token ID 1 and try to fetch up to totalSupply tokens
        // We'll stop when we have 8 valid tokens or hit the end
        for (let i = 1; i <= totalSupply && items.length < 8; i++) {
          try {
            const tokenId = i.toString();

            // Check if this token exists by trying to get its owner
            const owner = await contract.ownerOf(tokenId);

            // Get the token URI
            const tokenURI = await contract.tokenURI(tokenId);
            console.log(`Token ${tokenId} URI:`, tokenURI);

            // Extract the Grove URL from the tokenURI if possible
            // The format we're using is: ipfs://mantleify/encodedGroveUrl
            let groveUrl = "";
            if (tokenURI && tokenURI.startsWith("ipfs://mantleify/")) {
              try {
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
            }

            // If we couldn't extract from tokenURI, try to find it from events
            if (!groveUrl) {
              try {
                // Look for recent MantleifyNFTMinted events for this token
                // Limit the block range to avoid the 10,000 block limit
                const currentBlock = await provider.getBlockNumber();
                const fromBlock = Math.max(0, currentBlock - 10000); // Last 10,000 blocks

                const filter = contract.filters.MantleifyNFTMinted(i);
                const events = await contract.queryFilter(filter, fromBlock);

                if (events.length > 0) {
                  // Extract the Grove URL from the event
                  const event = events[0] as MintEvent;
                  if (event.args?.groveUrl) {
                    groveUrl = event.args.groveUrl;
                    console.log(
                      `Found Grove URL from event for token ${tokenId}:`,
                      groveUrl
                    );
                  }
                }
              } catch (eventError) {
                console.warn(
                  `Could not fetch events for token ${tokenId}:`,
                  eventError
                );
              }
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
