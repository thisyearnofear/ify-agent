"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { ethers } from "ethers";

// HigherBaseNFT contract ABI (just the functions we need)
const CONTRACT_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256) external view returns (string)",
  "function creators(uint256) external view returns (address)",
  "function overlayTypes(uint256) external view returns (uint8)",
  "function groveUrlToTokenId(string) external view returns (uint256)",
  "function getTokensByOverlayType(uint8) external view returns (uint256[])",
];

// Deployed contract address on Base Sepolia
const CONTRACT_ADDRESS = "0x7bc9ff8519cf0ba2cc3ead8dc27ea3d9cb760e12";

// Overlay types enum (must match the contract)
enum OverlayType {
  HIGHER = 0,
  BASE = 1,
  HIGHERISE = 2,
  DICKBUTTIFY = 3,
}

// Get a friendly name for the overlay type
const getOverlayTypeName = (type: number): string => {
  switch (type) {
    case OverlayType.HIGHER:
      return "Higher";
    case OverlayType.BASE:
      return "Base";
    case OverlayType.HIGHERISE:
      return "Higherise";
    case OverlayType.DICKBUTTIFY:
      return "Dickbuttify";
    default:
      return "Unknown";
  }
};

interface NFTItem {
  tokenId: string;
  imageUrl: string;
  groveUrl: string;
  owner: string;
  tokenURI: string;
  overlayType: number;
}

export default function BaseNFTGallery() {
  const [nfts, setNfts] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Connect to Base Sepolia
        const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );

        // Fetch the latest tokens (up to 4 per overlay type)
        const items: NFTItem[] = [];

        // Determine how many tokens to check
        const maxTokenId = 20; // Default fallback
        try {
          // Try to get tokens for each overlay type
          for (let typeId = 0; typeId <= 3; typeId++) {
            try {
              const tokensOfType = await contract.getTokensByOverlayType(
                typeId
              );
              console.log(
                `Tokens of type ${getOverlayTypeName(typeId)}:`,
                tokensOfType
              );

              // Get the latest 4 tokens of this type
              const latestTokens = tokensOfType.slice(-4);
              console.log(
                `Latest tokens of type ${getOverlayTypeName(typeId)}:`,
                latestTokens
              );

              for (const tokenId of latestTokens) {
                try {
                  // Get the token URI
                  const tokenURI = await contract.tokenURI(tokenId);
                  console.log(`Token ${tokenId} URI:`, tokenURI);

                  // Get the owner
                  const owner = await contract.ownerOf(tokenId);

                  // Get the overlay type
                  const overlayType = await contract.overlayTypes(tokenId);
                  console.log(
                    `Token ${tokenId} overlay type:`,
                    overlayType,
                    getOverlayTypeName(Number(overlayType))
                  );

                  // Extract the Grove URL from the tokenURI if possible
                  let groveUrl = "";

                  // Handle different tokenURI formats
                  if (tokenURI) {
                    const overlayName = getOverlayTypeName(
                      Number(overlayType)
                    ).toLowerCase();
                    console.log(`Token ${tokenId} overlay name:`, overlayName);

                    // Try to extract the prefix from the tokenURI
                    const match = tokenURI.match(/^ipfs:\/\/([^\/]+)\//);
                    if (match && match[1]) {
                      const prefix = match[1];
                      console.log(`Token ${tokenId} has prefix:`, prefix);

                      try {
                        groveUrl = decodeURIComponent(
                          tokenURI.replace(`ipfs://${prefix}/`, "")
                        );
                        console.log(
                          `Extracted Grove URL for token ${tokenId} from ${prefix} format:`,
                          groveUrl
                        );
                      } catch (decodeError) {
                        console.warn(
                          `Could not decode URI for token ${tokenId}:`,
                          decodeError
                        );
                      }
                    } else {
                      console.warn(
                        `Token ${tokenId} has unrecognized tokenURI format:`,
                        tokenURI
                      );
                    }
                  }

                  // Use the Grove URL as the image URL, or fall back to a placeholder
                  const imageUrl =
                    groveUrl ||
                    `/previews/base-${(Number(tokenId) % 3) + 1}.png`;

                  items.push({
                    tokenId: tokenId.toString(),
                    imageUrl,
                    groveUrl,
                    owner,
                    tokenURI,
                    overlayType: Number(overlayType),
                  });
                } catch (tokenError) {
                  console.warn(
                    `Error processing token ${tokenId}:`,
                    tokenError
                  );
                }
              }
            } catch (typeError) {
              console.warn(
                `Error getting tokens of type ${typeId}:`,
                typeError
              );
            }
          }
        } catch (err) {
          console.error("Error fetching tokens by type:", err);

          // Fallback: try to get tokens by iterating through IDs
          console.log("Using fallback approach to get tokens");

          // Start from the highest token IDs and work backwards to get the latest mints
          const startId = Math.max(1, maxTokenId);
          const endId = Math.max(1, startId - 20); // Check up to 20 tokens backwards

          for (let i = startId; i >= endId && items.length < 16; i--) {
            try {
              const tokenId = i.toString();

              // Check if this token exists by trying to get its owner
              const owner = await contract.ownerOf(tokenId);

              // Get the token URI
              const tokenURI = await contract.tokenURI(tokenId);

              // Get the overlay type
              const overlayType = await contract.overlayTypes(tokenId);

              // Extract the Grove URL from the tokenURI if possible
              let groveUrl = "";

              // Handle different tokenURI formats
              if (tokenURI) {
                const overlayName = getOverlayTypeName(
                  Number(overlayType)
                ).toLowerCase();

                // Check for standard format with overlay name
                if (tokenURI.startsWith(`ipfs://${overlayName}/`)) {
                  try {
                    // Format: ipfs://overlayName/encodedGroveUrl
                    groveUrl = decodeURIComponent(
                      tokenURI.replace(`ipfs://${overlayName}/`, "")
                    );
                  } catch (decodeError) {
                    console.warn(
                      `Could not decode URI for token ${tokenId}:`,
                      decodeError
                    );
                  }
                }
                // Check for alternative format with "ify" suffix
                else if (
                  overlayName === "base" &&
                  tokenURI.startsWith("ipfs://baseify/")
                ) {
                  try {
                    groveUrl = decodeURIComponent(
                      tokenURI.replace("ipfs://baseify/", "")
                    );
                  } catch (decodeError) {
                    console.warn(
                      `Could not decode URI for token ${tokenId}:`,
                      decodeError
                    );
                  }
                }
                // Check for alternative format with "ify" suffix for higher
                else if (
                  overlayName === "higher" &&
                  tokenURI.startsWith("ipfs://higherify/")
                ) {
                  try {
                    groveUrl = decodeURIComponent(
                      tokenURI.replace("ipfs://higherify/", "")
                    );
                  } catch (decodeError) {
                    console.warn(
                      `Could not decode URI for token ${tokenId}:`,
                      decodeError
                    );
                  }
                }
                // Check if the tokenURI might be using "baseify" when the overlay type is "base"
                else if (tokenURI.startsWith("ipfs://")) {
                  // Try to extract the prefix from the tokenURI
                  const match = tokenURI.match(/^ipfs:\/\/([^\/]+)\//);
                  if (match && match[1]) {
                    const prefix = match[1];
                    console.log(`Token ${tokenId} has prefix:`, prefix);

                    try {
                      groveUrl = decodeURIComponent(
                        tokenURI.replace(`ipfs://${prefix}/`, "")
                      );
                      console.log(
                        `Extracted Grove URL for token ${tokenId} from ${prefix} format:`,
                        groveUrl
                      );
                    } catch (decodeError) {
                      console.warn(
                        `Could not decode URI for token ${tokenId}:`,
                        decodeError
                      );
                    }
                  }
                }
              }

              // Use the Grove URL as the image URL, or fall back to a placeholder
              const imageUrl = groveUrl || `/previews/base-${(i % 3) + 1}.png`;

              items.push({
                tokenId,
                imageUrl,
                groveUrl,
                owner,
                tokenURI,
                overlayType: Number(overlayType),
              });
            } catch (tokenError) {
              // Token might not exist, just continue
              console.warn(`Token ${i} might not exist:`, tokenError);
              continue;
            }
          }
        }

        // Sort by token ID (newest first)
        items.sort((a, b) => Number(b.tokenId) - Number(a.tokenId));

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

  // Filter NFTs based on active filter
  const filteredNfts =
    activeFilter !== null
      ? nfts.filter((nft) => nft.overlayType === activeFilter)
      : nfts;

  // Limit to 4 NFTs when no filter is active (instead of 16)
  const displayNfts =
    activeFilter !== null ? filteredNfts : filteredNfts.slice(0, 4);

  if (loading) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg">
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
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
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        <button
          className={`px-3 py-1 text-xs rounded-full ${
            activeFilter === null
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          onClick={() => setActiveFilter(null)}
        >
          All
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-full ${
            activeFilter === OverlayType.HIGHER
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          onClick={() => setActiveFilter(OverlayType.HIGHER)}
        >
          Higher
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-full ${
            activeFilter === OverlayType.BASE
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          onClick={() => setActiveFilter(OverlayType.BASE)}
        >
          Base
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-full ${
            activeFilter === OverlayType.HIGHERISE
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          onClick={() => setActiveFilter(OverlayType.HIGHERISE)}
        >
          Higherise
        </button>
        <button
          className={`px-3 py-1 text-xs rounded-full ${
            activeFilter === OverlayType.DICKBUTTIFY
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
          onClick={() => setActiveFilter(OverlayType.DICKBUTTIFY)}
        >
          Dickbuttify
        </button>
      </div>

      {displayNfts.length === 0 ? (
        <div className="text-center py-4 text-gray-400">
          <p>No NFTs found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {displayNfts.map((nft) => (
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
                  <span className="text-xs px-1.5 py-0.5 bg-gray-800 rounded-full">
                    {getOverlayTypeName(nft.overlayType)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {nft.owner.substring(0, 6)}...
                </div>
                {nft.groveUrl && (
                  <a
                    href={nft.groveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:text-blue-400 mt-1 block truncate"
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
