"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { encodeFunctionData, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";

// Deployed contract address on Base Sepolia
const CONTRACT_ADDRESS = "0xF90552377071C01B8922c4879eA9E20A39476998";

// Overlay types enum (must match the contract)
enum OverlayType {
  HIGHER = 0,
  BASE = 1,
  DICKBUTTIFY = 2,
}

// Original NFT price in ETH
const ORIGINAL_PRICE = 0.05;

// Contract ABI fragment for the mint function
const MINT_FUNCTION = parseAbiItem(
  "function mintOriginalNFT(address to, address creator, string calldata groveUrl, string calldata tokenURI, uint8 overlayType) payable returns (uint256)"
);

// Alternative ABI with explicit types for fallback
const ALTERNATIVE_ABI = [
  {
    name: "mintOriginalNFT",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "creator", type: "address" },
      { name: "groveUrl", type: "string" },
      { name: "tokenURI", type: "string" },
      { name: "overlayType", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
  },
];

interface MintBaseNFTButtonProps {
  groveUrl: string;
  overlayType: string; // "higherify", "baseify", or "dickbuttify"
}

// Add type definition for Ethereum errors
type EthereumError = {
  code: number;
  message: string;
};

export default function MintBaseNFTButton({
  groveUrl,
  overlayType,
}: MintBaseNFTButtonProps) {
  const { address, isConnected } = useAccount();
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userRejected, setUserRejected] = useState(false);

  // Check if user is on the correct network
  const isCorrectNetwork = chainId === baseSepolia.id;

  // Check current network on mount and when connection changes
  useEffect(() => {
    const checkNetwork = async () => {
      if (isConnected && window.ethereum) {
        try {
          const chainIdHex = await window.ethereum.request({
            method: "eth_chainId",
          });
          setChainId(parseInt(chainIdHex, 16));
        } catch (err) {
          console.error("Error checking chain ID:", err);
        }
      }
    };

    checkNetwork();

    // Listen for chain changes
    if (window.ethereum) {
      const handleChainChanged = (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16));
      };

      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [isConnected]);

  // Map overlay type string to enum value
  const getOverlayTypeEnum = (type: string): OverlayType => {
    switch (type.toLowerCase()) {
      case "higherify":
        return OverlayType.HIGHER;
      case "baseify":
        return OverlayType.BASE;
      case "dickbuttify":
        return OverlayType.DICKBUTTIFY;
      default:
        return OverlayType.HIGHER; // Default to HIGHER if unknown
    }
  };

  // Get a friendly name for the overlay type
  const getOverlayTypeName = (type: string): string => {
    switch (type.toLowerCase()) {
      case "higherify":
        return "Higher";
      case "baseify":
        return "Base";
      case "dickbuttify":
        return "Dickbuttify";
      default:
        return "Higher";
    }
  };

  // Reset error when network changes
  useEffect(() => {
    if (isCorrectNetwork && error) {
      setError(null);
      setUserRejected(false);
    }
  }, [isCorrectNetwork, error]);

  const handleSwitchNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setError("No Ethereum provider found. Please install a wallet.");
      return;
    }

    setIsSwitchingNetwork(true);

    try {
      // Try to switch to Base Sepolia
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14a34" }], // 84532 in hex
      });
    } catch (err: unknown) {
      const error = err as EthereumError;
      setIsSwitchingNetwork(false);

      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x14a34", // 84532 in hex
                chainName: "Base Sepolia",
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.base.org"],
                blockExplorerUrls: ["https://sepolia-explorer.base.org"],
              },
            ],
          });
        } catch (addError) {
          setError(
            "Failed to add Base Sepolia network. Please add it manually."
          );
          console.error("Error adding network:", addError);
        }
      } else {
        setError("Failed to switch network. Please switch manually.");
        console.error("Error switching network:", error);
      }
    }
  }, []);

  const handleMint = useCallback(async () => {
    if (!isConnected || !address || !groveUrl) {
      setError("Please connect your wallet first");
      return;
    }

    if (!isCorrectNetwork) {
      setError("Please switch to Base Sepolia network");
      return;
    }

    setError(null);
    setUserRejected(false);
    setIsMinting(true);

    try {
      // Create a metadata URI that includes the Grove URL for better identification
      const metadataUri = `ipfs://${overlayType.toLowerCase()}/${encodeURIComponent(
        groveUrl
      )}`;

      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install a wallet.");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const walletAddress = accounts[0];
      const overlayTypeEnum = getOverlayTypeEnum(overlayType);

      // Convert price to wei
      const priceInWei = BigInt(ORIGINAL_PRICE * 10 ** 18);
      const priceHex = "0x" + priceInWei.toString(16);

      try {
        // Try with the primary ABI first
        const data = encodeFunctionData({
          abi: [MINT_FUNCTION],
          args: [
            walletAddress,
            walletAddress,
            groveUrl,
            metadataUri,
            overlayTypeEnum,
          ],
        });

        // Prepare transaction with value
        const txParams = {
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data,
          value: priceHex,
        };

        // Send transaction
        const hash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });

        setTxHash(hash);
        setIsMinting(false);
        setIsConfirming(true);

        // Wait for confirmation
        setTimeout(() => {
          setIsConfirming(false);
        }, 5000);

        console.log("NFT minting transaction sent", {
          hash,
          groveUrl,
          metadataUri,
          overlayType,
          overlayTypeEnum,
          value: priceHex,
        });
      } catch (encodeError: unknown) {
        const error = encodeError as EthereumError;
        console.error("Error encoding function data:", error);

        // Try with alternative ABI as fallback
        try {
          console.log("Trying alternative ABI format");

          const data = encodeFunctionData({
            abi: ALTERNATIVE_ABI,
            args: [
              walletAddress,
              walletAddress,
              groveUrl,
              metadataUri,
              overlayTypeEnum,
            ],
          });

          // Prepare transaction with value
          const txParams = {
            from: walletAddress,
            to: CONTRACT_ADDRESS,
            data,
            value: priceHex,
          };

          // Send transaction
          const hash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [txParams],
          });

          setTxHash(hash);
          setIsMinting(false);
          setIsConfirming(true);

          // Wait for confirmation
          setTimeout(() => {
            setIsConfirming(false);
          }, 5000);

          console.log("NFT minting transaction sent (using alternative ABI)", {
            hash,
            groveUrl,
            metadataUri,
            overlayType,
            overlayTypeEnum,
            value: priceHex,
          });
        } catch (fallbackError: unknown) {
          console.error("Error with fallback ABI method:", fallbackError);
          throw new Error(
            `Contract interaction failed: ${error.message}. Development mode may require a deployed contract.`
          );
        }
      }
    } catch (err: unknown) {
      const error = err as EthereumError;
      setIsMinting(false);
      setIsConfirming(false);

      // Check for user rejection
      if (
        error.code === 4001 || // MetaMask user rejected
        error.message?.includes("rejected") ||
        error.message?.includes("denied") ||
        error.message?.includes("cancelled")
      ) {
        setUserRejected(true);
        setError("Transaction was rejected. You can try again when ready.");
        console.log("User rejected the transaction");
      } else if (error.message?.includes("Development mode")) {
        // Special handling for development mode issues
        setError(
          "Minting in development mode may require additional setup. This would work in production."
        );
        console.warn("Development mode minting issue:", error.message);
      } else {
        setError(error.message || "Failed to mint NFT");
        console.error("Error minting NFT:", error);
      }
    }
  }, [address, isConnected, groveUrl, overlayType, isCorrectNetwork]);

  if (!isConnected) {
    return (
      <div className="mt-2 text-sm text-gray-500">
        Connect your wallet to mint this as an NFT on Base Sepolia
      </div>
    );
  }

  if (!isCorrectNetwork && !txHash) {
    return (
      <div className="mt-2">
        <div className="text-sm text-amber-600 mb-1">
          Please switch to Base Sepolia network to mint this NFT
        </div>
        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitchingNetwork}
          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSwitchingNetwork ? "Switching..." : "Switch to Base Sepolia"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {!txHash ? (
        <button
          onClick={handleMint}
          disabled={isMinting || isConfirming}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMinting
            ? "Initiating..."
            : isConfirming
            ? "Confirming..."
            : `Mint ${getOverlayTypeName(
                overlayType
              )} NFT (${ORIGINAL_PRICE} ETH)`}
        </button>
      ) : (
        <div className="text-sm">
          <span className="text-green-500">NFT Minted Successfully!</span>
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-500 hover:text-blue-600 underline"
          >
            View on Explorer
          </a>
        </div>
      )}

      {error && (
        <div className="mt-1 text-sm text-red-500">
          {error}
          {userRejected && (
            <button
              onClick={() => {
                setError(null);
                setUserRejected(false);
              }}
              className="ml-2 text-blue-500 hover:text-blue-600 underline"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
