"use client";

import { useState, useCallback } from "react";
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

export default function MintMantleifyButton({
  groveUrl,
}: MintMantleifyButtonProps) {
  const { address, isConnected } = useAccount();
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMint = useCallback(async () => {
    if (!isConnected || !address || !groveUrl) {
      setError("Please connect your wallet first");
      return;
    }

    setError(null);
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

      // Wait for confirmation
      setTimeout(() => {
        setIsConfirming(false);
      }, 5000);

      console.log("NFT minting transaction sent", {
        hash,
        groveUrl,
        metadataUri,
      });
    } catch (err) {
      setIsMinting(false);
      setIsConfirming(false);
      setError(err instanceof Error ? err.message : "Failed to mint NFT");
      console.error("Error minting NFT", err);
    }
  }, [address, isConnected, groveUrl]);

  if (!isConnected) {
    return (
      <div className="mt-2 text-sm text-gray-500">
        Connect your wallet to mint this as an NFT on Mantle
      </div>
    );
  }

  return (
    <div className="mt-2">
      {!txHash ? (
        <button
          onClick={handleMint}
          disabled={isMinting || isConfirming}
          className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMinting
            ? "Initiating..."
            : isConfirming
            ? "Confirming..."
            : "Mint as NFT on Mantle"}
        </button>
      ) : (
        <div className="text-sm">
          <span className="text-green-500">NFT Minted Successfully!</span>
          <a
            href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 text-blue-500 hover:text-blue-600 underline"
          >
            View on Explorer
          </a>
        </div>
      )}

      {error && <div className="mt-1 text-sm text-red-500">{error}</div>}
    </div>
  );
}
