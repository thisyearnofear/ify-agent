"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { encodeFunctionData, parseAbiItem } from "viem";

// Deployed contract address on Mantle Sepolia
const CONTRACT_ADDRESS = "0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37";

// Contract ABI fragment for the mint function
const MINT_FUNCTION = parseAbiItem(
  "function mintNFT(address to, address creator, string groveUrl, string tokenURI) returns (uint256)"
);

interface MintMantleifyButtonProps {
  groveUrl: string;
}

// Add type definition for Ethereum errors
type EthereumError = {
  code: number;
  message: string;
};

// Mantle Sepolia chain ID
const MANTLE_SEPOLIA_CHAIN_ID = 5003;

export default function MintMantleifyButton({
  groveUrl,
}: MintMantleifyButtonProps) {
  const { address, isConnected } = useAccount();
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userRejected, setUserRejected] = useState(false);

  // Check if user is on the correct network
  const isCorrectNetwork = chainId === MANTLE_SEPOLIA_CHAIN_ID;

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
      // Try to switch to Mantle Sepolia
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1393" }], // 5003 in hex
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
                chainId: "0x1393", // 5003 in hex
                chainName: "Mantle Sepolia",
                nativeCurrency: {
                  name: "MNT",
                  symbol: "MNT",
                  decimals: 18,
                },
                rpcUrls: ["https://rpc.sepolia.mantle.xyz"],
                blockExplorerUrls: ["https://sepolia.mantlescan.xyz"],
              },
            ],
          });
        } catch (addError) {
          setError(
            "Failed to add Mantle Sepolia network. Please add it manually."
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
      setError("Please switch to Mantle Sepolia network");
      return;
    }

    setError(null);
    setUserRejected(false);
    setIsMinting(true);

    try {
      // Create a metadata URI that includes the Grove URL for better identification
      const metadataUri = `ipfs://mantleify/${encodeURIComponent(groveUrl)}`;

      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install a wallet.");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const walletAddress = accounts[0];

      // Encode the function call
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
  let buttonText = "Mint Mantleify NFT";
  if (!isConnected) {
    buttonText = "Connect Wallet to Mint";
  } else if (!isCorrectNetwork) {
    buttonText = "Switch to Mantle Sepolia";
  } else if (isMinting) {
    buttonText = "Minting...";
  } else if (isConfirming) {
    buttonText = "Transaction Sent!";
  } else if (userRejected) {
    buttonText = "Try Again";
  }

  return (
    <div>
      {!isCorrectNetwork && isConnected ? (
        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitchingNetwork}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-yellow-400 w-full"
        >
          {isSwitchingNetwork ? "Switching..." : "Switch to Mantle Sepolia"}
        </button>
      ) : (
        <button
          onClick={handleMint}
          disabled={isMinting || isConfirming || !isConnected}
          className={`px-4 py-2 rounded w-full ${
            isConfirming
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          } disabled:bg-gray-400`}
        >
          {buttonText}
        </button>
      )}

      {txHash && (
        <div className="mt-2 text-center">
          <a
            href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            View on Explorer
          </a>
        </div>
      )}

      {error && (
        <div className="mt-2 text-red-500 text-sm text-center">{error}</div>
      )}
    </div>
  );
}
