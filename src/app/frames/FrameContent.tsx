"use client";

import { useEffect, useState, useCallback } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { wagmiConfig } from "@/components/providers/WagmiConfig";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { encodeFunctionData, parseAbiItem } from "viem";

// Define types for Farcaster context
interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface FarcasterContext {
  user?: FarcasterUser;
  client?: {
    clientFid?: number;
    added?: boolean;
  };
  location?: {
    type: string;
    [key: string]: unknown;
  };
}

// Define type for mint result
interface MintResult {
  success: boolean;
  message?: string;
  tokenId?: string;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  alreadyMinted?: boolean;
}

// Deployed contract address on Mantle Sepolia
const CONTRACT_ADDRESS = "0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37";

// Contract ABI fragment for the mint function
const MINT_FUNCTION = parseAbiItem(
  "function mintNFT(address to, address creator, string groveUrl, string tokenURI) returns (uint256)"
);

export default function FrameContent() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [contextData, setContextData] = useState<FarcasterContext | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [groveUrl, setGroveUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMantleify, setIsMantleify] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    const init = async () => {
      try {
        const context = await FrameSDK.context;
        setContextData(context as unknown as FarcasterContext);

        // Hide splash screen after UI renders
        setTimeout(() => {
          FrameSDK.actions.ready();
          setIsSDKLoaded(true);
        }, 500);
      } catch (error) {
        console.error("Error initializing Farcaster Frame", error);
      }
    };

    init();
  }, []);

  const toggleContext = useCallback(() => {
    setIsContextOpen((prev) => !prev);
  }, []);

  const handleConnectWallet = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else {
      connect({ connector: wagmiConfig.connectors[0] });
    }
  }, [isConnected, connect, disconnect]);

  const handleGenerateImage = useCallback(async () => {
    if (!prompt || prompt.trim().length < 3) {
      setError("Please enter a prompt with at least 3 characters");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setMintResult(null);

    try {
      // Check if the prompt contains "mantleify" to enable NFT minting
      const isMantleifyPrompt = prompt.toLowerCase().includes("mantleify");
      setIsMantleify(isMantleifyPrompt);

      // Call the agent API to generate the image
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedImage(data.resultUrl);
      setGroveUrl(data.groveUrl || null);

      logger.info("Image generated successfully", {
        resultUrl: data.resultUrl,
        groveUrl: data.groveUrl,
        isMantleify: isMantleifyPrompt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
      logger.error("Error generating image", {
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt]);

  const handleMintNFT = useCallback(async () => {
    if (!isConnected || !address || !groveUrl || !generatedImage) {
      setError("Please connect your wallet and generate an image first");
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

      setIsMinting(false);
      setIsConfirming(true);

      // Wait for confirmation
      setTimeout(() => {
        setIsConfirming(false);
        setMintResult({
          success: true,
          message: "NFT minted successfully!",
          transactionHash: hash,
          explorerUrl: `https://sepolia.mantlescan.xyz/tx/${hash}`,
        });
      }, 5000);

      logger.info("NFT minting transaction sent", {
        hash,
        groveUrl,
        metadataUri,
      });
    } catch (err) {
      setIsMinting(false);
      setIsConfirming(false);
      setError(err instanceof Error ? err.message : "Failed to mint NFT");
      logger.error("Error minting NFT", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [address, isConnected, groveUrl, generatedImage]);

  const handleOpenApp = useCallback(() => {
    FrameSDK.actions.openUrl(window.location.origin);
  }, []);

  const handleOpenGroveUrl = useCallback(() => {
    if (groveUrl) {
      FrameSDK.actions.openUrl(groveUrl);
    }
  }, [groveUrl]);

  const handleOpenExplorerUrl = useCallback(() => {
    if (mintResult?.explorerUrl) {
      FrameSDK.actions.openUrl(mintResult.explorerUrl);
    }
  }, [mintResult]);

  if (!isSDKLoaded) {
    return <div className="p-4 text-center">Loading frame...</div>;
  }

  return (
    <div className="w-[300px] mx-auto py-4 px-2 bg-gray-900 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-4">WOWOWIFY</h1>

      {contextData?.user && (
        <div className="mb-4 text-center">
          <p className="text-sm text-gray-300">
            Welcome,{" "}
            {contextData.user.displayName ||
              contextData.user.username ||
              `FID: ${contextData.user.fid}`}
          </p>
        </div>
      )}

      {!generatedImage ? (
        <>
          <div className="mb-4">
            <textarea
              className="w-full p-2 border rounded-md bg-gray-800 text-white placeholder-gray-400 text-center"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate..."
              rows={3}
            />
          </div>

          {error && (
            <div className="mb-4 text-center text-red-400 text-sm">{error}</div>
          )}

          <div className="flex flex-col gap-2 mb-4">
            <button
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleGenerateImage}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? "Generating..." : "Generate Image"}
            </button>

            <button
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md"
              onClick={handleOpenApp}
            >
              Open Full App
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center">
          <div className="mb-4 relative w-full aspect-square">
            <Image
              src={generatedImage}
              alt="Generated image"
              fill
              className="object-contain rounded-md"
            />
          </div>

          <div className="flex flex-col gap-2 w-full">
            {groveUrl && (
              <button
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm"
                onClick={handleOpenGroveUrl}
              >
                Grove
              </button>
            )}

            {isMantleify && isConnected && !mintResult && (
              <button
                className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleMintNFT}
                disabled={isMinting || isConfirming}
              >
                {isMinting
                  ? "Initiating..."
                  : isConfirming
                  ? "Confirming..."
                  : "Mint as NFT on Mantle"}
              </button>
            )}

            {mintResult && (
              <div className="w-full p-2 bg-gray-800 rounded-md text-xs text-center">
                <p className="text-green-400 mb-1">
                  {mintResult.success
                    ? "NFT Minted Successfully!"
                    : mintResult.message}
                </p>
                {mintResult.explorerUrl && (
                  <button
                    className="text-blue-400 hover:text-blue-300 underline"
                    onClick={handleOpenExplorerUrl}
                  >
                    Explorer
                  </button>
                )}
              </div>
            )}

            <button
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              onClick={() => {
                setGeneratedImage(null);
                setGroveUrl(null);
                setPrompt("");
                setIsMantleify(false);
                setMintResult(null);
              }}
            >
              Generate Another
            </button>

            <button
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md"
              onClick={handleOpenApp}
            >
              Open Full App
            </button>
          </div>
        </div>
      )}

      {!isConnected && isMantleify && generatedImage && (
        <div className="mt-4 text-center">
          <button
            onClick={handleConnectWallet}
            className="text-blue-400 hover:text-blue-300 underline text-sm"
          >
            Connect Wallet to Mint NFT
          </button>
        </div>
      )}

      {isConnected && (
        <div className="mt-4 text-center text-xs text-gray-400">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
          <button
            onClick={handleConnectWallet}
            className="ml-2 text-blue-400 hover:text-blue-300"
          >
            Disconnect
          </button>
        </div>
      )}

      <div className="mt-4 text-center">
        <button
          onClick={toggleContext}
          className="text-xs text-gray-500 hover:text-gray-400"
        >
          Debug
        </button>

        {isContextOpen && contextData && (
          <div className="p-2 mt-2 bg-gray-800 rounded-lg">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px] overflow-x-auto text-gray-300">
              {JSON.stringify(contextData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
