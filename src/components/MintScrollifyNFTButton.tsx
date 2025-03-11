"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { encodeFunctionData, parseAbiItem } from "viem";

// Deployed contract address on Scroll Sepolia
const CONTRACT_ADDRESS = "0x653d41fba630381aa44d8598a4b35ce257924d65";

// Contract ABI fragment for the mint function
const MINT_FUNCTION = parseAbiItem(
  "function mintNFT(address to, address creator, string calldata groveUrl, string calldata tokenURI) returns (uint256)"
);

// Alternative ABI with explicit types for fallback
const ALTERNATIVE_ABI = [
  {
    name: "mintNFT",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "creator", type: "address" },
      { name: "groveUrl", type: "string" },
      { name: "tokenURI", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
  },
];

interface MintScrollifyNFTButtonProps {
  groveUrl: string;
}

// Add type definition for Ethereum errors
type EthereumError = {
  code: number;
  message: string;
};

// Scroll Sepolia chain ID
const SCROLL_SEPOLIA_CHAIN_ID = 534351;

export default function MintScrollifyNFTButton({
  groveUrl,
}: MintScrollifyNFTButtonProps) {
  const { address, isConnected } = useAccount();
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userRejected, setUserRejected] = useState(false);

  // Check if user is on the correct network
  const isCorrectNetwork = chainId === SCROLL_SEPOLIA_CHAIN_ID;

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
      // Try to switch to Scroll Sepolia
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x8274f" }], // 534351 in hex
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
                chainId: "0x8274f", // 534351 in hex
                chainName: "Scroll Sepolia",
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia-rpc.scroll.io"],
                blockExplorerUrls: ["https://sepolia.scrollscan.com"],
              },
            ],
          });
        } catch (addError) {
          setError(
            "Failed to add Scroll Sepolia network. Please add it manually."
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
      setError("Please switch to Scroll Sepolia network");
      return;
    }

    setError(null);
    setUserRejected(false);
    setIsMinting(true);

    try {
      // Create a metadata URI that includes the Grove URL for better identification
      const metadataUri = `ipfs://scrollify/${encodeURIComponent(groveUrl)}`;

      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install a wallet.");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const walletAddress = accounts[0];

      try {
        // Try with the primary ABI first
        const data = encodeFunctionData({
          abi: [MINT_FUNCTION],
          args: [walletAddress, walletAddress, groveUrl, metadataUri],
        });

        // Prepare transaction
        const txParams = {
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data,
          value: "0x0",
        };

        // Send transaction
        const hash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });

        setTxHash(hash);
        setIsMinting(false);
        setIsConfirming(true);
      } catch (encodeError) {
        console.error("Error encoding function data:", encodeError);

        // Fallback to alternative ABI
        const data = encodeFunctionData({
          abi: ALTERNATIVE_ABI,
          args: [walletAddress, walletAddress, groveUrl, metadataUri],
        });

        // Prepare transaction
        const txParams = {
          from: walletAddress,
          to: CONTRACT_ADDRESS,
          data,
          value: "0x0",
        };

        // Send transaction
        const hash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });

        setTxHash(hash);
        setIsMinting(false);
        setIsConfirming(true);
      }
    } catch (err: unknown) {
      setIsMinting(false);
      const error = err as EthereumError;

      // Check if user rejected the transaction
      if (error.code === 4001) {
        setUserRejected(true);
        setError("Transaction rejected. Please try again.");
      } else {
        console.error("Error minting NFT:", error);
        setError(
          `Error minting NFT: ${
            error.message || "Unknown error. Please try again."
          }`
        );
      }
    }
  }, [isConnected, address, groveUrl, isCorrectNetwork]);

  // Button text based on state
  let buttonText = "Mint on Scroll Sepolia";
  if (!isConnected) {
    buttonText = "Connect Wallet to Mint";
  } else if (!isCorrectNetwork) {
    buttonText = "Switch to Scroll Sepolia";
  } else if (isMinting) {
    buttonText = "Minting...";
  } else if (isConfirming) {
    buttonText = "Transaction Confirming...";
  }

  // If transaction is confirmed, show success message
  if (txHash) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-green-600 font-semibold">NFT minted successfully!</p>
        <a
          href={`https://sepolia.scrollscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline text-sm"
        >
          View transaction on Scrollscan
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {error && (
        <p className="text-red-500 text-sm mb-2">
          {error}
          {userRejected && (
            <button
              className="text-blue-500 hover:underline ml-2"
              onClick={() => {
                setError(null);
                setUserRejected(false);
              }}
            >
              Try again
            </button>
          )}
        </p>
      )}

      <button
        className={`w-full py-2 px-4 rounded-md text-white ${
          !isConnected || isMinting || isConfirming || isSwitchingNetwork
            ? "bg-gray-400 cursor-not-allowed"
            : !isCorrectNetwork
            ? "bg-yellow-600 hover:bg-yellow-700"
            : "bg-purple-600 hover:bg-purple-700"
        }`}
        onClick={!isCorrectNetwork ? handleSwitchNetwork : handleMint}
        disabled={isMinting || isConfirming || isSwitchingNetwork}
      >
        {isSwitchingNetwork ? "Switching Network..." : buttonText}
      </button>
    </div>
  );
}
