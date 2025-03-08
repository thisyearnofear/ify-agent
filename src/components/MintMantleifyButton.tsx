"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { encodeAbiParameters, parseAbiParameters } from "viem";

// Deployed contract address on Mantle Sepolia
const CONTRACT_ADDRESS = "0xfbe99dcd3b2d93b1c8ffabc26427383daaba05d1";

// Contract ABI for the mint function
const MINT_FUNCTION_SELECTOR = "0x731133e9"; // selector for mintNFT(address,address,string,string)

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
      // Create a simple metadata URI (in a production app, you'd upload to IPFS)
      const metadataUri = `ipfs://placeholder/${Date.now()}`;

      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install a wallet.");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const walletAddress = accounts[0];

      // Encode function parameters according to Solidity ABI spec
      const encodedParams = encodeAbiParameters(
        parseAbiParameters("address, address, string, string"),
        [walletAddress, walletAddress, groveUrl, metadataUri]
      );

      // Create the transaction data
      const data = MINT_FUNCTION_SELECTOR + encodedParams.slice(2); // remove '0x' from encoded params

      // Prepare transaction
      const txParams = {
        from: walletAddress,
        to: CONTRACT_ADDRESS,
        data: "0x" + data,
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
