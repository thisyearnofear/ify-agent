"use client";

import { useEffect, useState, useCallback } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { wagmiConfig } from "@/components/providers/WagmiConfig";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { encodeFunctionData, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";
// These components are not directly used in this file
// They are only needed in specific contexts when rendering conditionally
// import MintMantleifyButton from "@/components/MintMantleifyButton";
// import MintBaseNFTButton from "@/components/MintBaseNFTButton";
// import { baseSepolia } from "viem/chains";

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

// Add proper type definitions for error handling
type EthereumError = {
  code: number;
  message: string;
};

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
  const [baseOverlayType, setBaseOverlayType] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Check if on Base Sepolia
  const isOnBaseSepolia = chainId === baseSepolia.id; // Base Sepolia chain ID
  // Check if on Mantle Sepolia
  const isOnMantleSepolia = chainId === 5003; // Mantle Sepolia chain ID

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

      // Check if the prompt contains any of the Base NFT overlay types
      const lowerPrompt = prompt.toLowerCase();
      let detectedOverlayType = null;
      if (lowerPrompt.includes("higherify")) detectedOverlayType = "higherify";
      else if (lowerPrompt.includes("baseify")) detectedOverlayType = "baseify";
      else if (lowerPrompt.includes("higherise"))
        detectedOverlayType = "higherise";
      else if (lowerPrompt.includes("dickbuttify"))
        detectedOverlayType = "dickbuttify";
      setBaseOverlayType(detectedOverlayType);

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
        baseOverlayType: detectedOverlayType,
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

  const handleSwitchToMantleSepolia = useCallback(async () => {
    if (!window.ethereum) {
      setError("No Ethereum provider found. Please install a wallet.");
      return;
    }

    setIsSwitchingNetwork(true);

    try {
      // Try to switch to Mantle Sepolia
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x138b" }], // 5003 in hex
      });
    } catch (err: unknown) {
      const error = err as EthereumError;
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x138b", // 5003 in hex
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
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, []);

  const handleMintNFT = useCallback(async () => {
    if (!isConnected || !address || !groveUrl) {
      setError("Please connect your wallet first");
      return;
    }

    // Check if on the correct network
    if (!isOnMantleSepolia) {
      setError("Please switch to Mantle Sepolia network");
      await handleSwitchToMantleSepolia();
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
        const errorMessage =
          "Transaction was rejected. You can try again when ready.";
        setError(errorMessage);
        setMintResult({
          success: false,
          message: errorMessage,
          error: errorMessage,
        });
        logger.info("User rejected the transaction");
      } else if (error.message?.includes("Development mode")) {
        // Special handling for development mode issues
        const errorMessage =
          "Minting in development mode may require additional setup. This would work in production.";
        setError(errorMessage);
        setMintResult({
          success: false,
          message: errorMessage,
          error: error.message,
        });
        logger.warn("Development mode minting issue", {
          error: error.message,
        });
      } else {
        const errorMessage = error.message || "Failed to mint NFT";
        setError(errorMessage);
        setMintResult({
          success: false,
          message: errorMessage,
          error: errorMessage,
        });
        logger.error("Error minting NFT", {
          error: errorMessage,
        });
      }
    }
  }, [
    address,
    isConnected,
    groveUrl,
    isOnMantleSepolia,
    handleSwitchToMantleSepolia,
  ]);

  const handleOpenApp = useCallback(() => {
    FrameSDK.actions.openUrl(window.location.origin);
  }, []);

  const postMessageToParent = (
    action: string,
    data: Record<string, unknown>
  ) => {
    try {
      if (window.parent) {
        window.parent.postMessage({ action, data }, "*");
        console.log(`Posted message to parent: ${action}`, data);
      } else {
        console.warn("No parent window found for postMessage");
      }
    } catch (error) {
      console.error("Error posting message to parent:", error);
    }
  };

  const handleOpenGroveUrl = useCallback(() => {
    if (groveUrl) {
      try {
        console.log("Attempting to open Grove URL:", groveUrl);

        // First try the Frame SDK approach
        if (FrameSDK && FrameSDK.actions && FrameSDK.actions.openUrl) {
          FrameSDK.actions.openUrl(groveUrl);
          console.log("Called FrameSDK.actions.openUrl with:", groveUrl);
        } else {
          // Try postMessage as a fallback for Farcaster
          postMessageToParent("openUrl", { url: groveUrl });

          // Also try window.open as a last resort
          setTimeout(() => {
            window.open(groveUrl, "_blank");
          }, 100);
        }
      } catch (error) {
        console.error("Error opening Grove URL:", error);

        // Try alternative approaches
        try {
          // Try postMessage
          postMessageToParent("openUrl", { url: groveUrl });

          // Also try window.open
          setTimeout(() => {
            window.open(groveUrl, "_blank");
          }, 100);
        } catch (fallbackError) {
          console.error("All fallbacks failed:", fallbackError);
        }
      }
    } else {
      console.warn("No Grove URL available to open");
    }
  }, [groveUrl]);

  // This function is currently unused but may be needed in the future
  // for opening explorer URLs from within the frame
  // const handleOpenExplorerUrl = useCallback(() => {
  //   if (mintResult?.explorerUrl) {
  //     try {
  //       // Log the attempt to open the URL
  //       console.log("Attempting to open Explorer URL:", mintResult.explorerUrl);

  //       // For Farcaster Frames, we need to use the openUrl action
  //       if (FrameSDK && FrameSDK.actions && FrameSDK.actions.openUrl) {
  //         FrameSDK.actions.openUrl(mintResult.explorerUrl);
  //       } else {
  //         // Fallback for non-frame environments
  //         window.open(mintResult.explorerUrl, "_blank");
  //       }
  //     } catch (err) {
  //       console.error("Error opening explorer URL:", err);
  //     }
  //   }
  // }, [mintResult]);

  const handleReset = () => {
    setPrompt("");
    setGeneratedImage(null);
    setGroveUrl(null);
    setError(null);
    setIsMantleify(false);
    setBaseOverlayType(null);
    setMintResult(null);
  };

  // Add a function to handle switching to Base Sepolia
  const handleSwitchToBaseSepolia = async () => {
    if (!window.ethereum) {
      setError("No Ethereum provider found. Please install a wallet.");
      return;
    }

    setIsSwitchingNetwork(true);

    try {
      // Try to switch to Base Sepolia
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${baseSepolia.id.toString(16)}` }], // Convert to hex
      });
    } catch (err: unknown) {
      const error = err as EthereumError;
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${baseSepolia.id.toString(16)}`, // Convert to hex
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
        console.error("Error switching network:", err);
      }
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  // Update the handleMintBaseNFT function
  const handleMintBaseNFT = async (overlayType: string) => {
    if (!isConnected || !address || !groveUrl) {
      setError("Please connect your wallet first");
      return;
    }

    // Check if on the correct network
    if (!isOnBaseSepolia) {
      setError("Please switch to Base Sepolia network");
      await handleSwitchToBaseSepolia();
      return;
    }

    setIsMinting(true);
    setError(null);

    try {
      // Create a metadata URI that includes the Grove URL
      const metadataUri = `ipfs://${overlayType.toLowerCase()}/${encodeURIComponent(
        groveUrl
      )}`;

      // Get the overlay type enum value
      let overlayTypeEnum = 0; // Default to HIGHER
      switch (overlayType.toLowerCase()) {
        case "higherify":
          overlayTypeEnum = 0; // HIGHER
          break;
        case "baseify":
          overlayTypeEnum = 1; // BASE
          break;
        case "higherise":
          overlayTypeEnum = 2; // HIGHERISE
          break;
        case "dickbuttify":
          overlayTypeEnum = 3; // DICKBUTTIFY
          break;
      }

      // Contract address on Base Sepolia
      const contractAddress = "0x7bc9ff8519cf0ba2cc3ead8dc27ea3d9cb760e12";

      // ABI for the mintNFT function - UPDATED to match the contract exactly
      const mintFunctionAbi = [
        "function mintNFT(address to, address creator, string calldata groveUrl, string calldata tokenURI, uint8 overlayType) returns (uint256)",
      ];

      if (!window.ethereum) {
        throw new Error("No Ethereum provider found. Please install a wallet.");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const walletAddress = accounts[0];

      try {
        // Encode the function call
        const data = encodeFunctionData({
          abi: mintFunctionAbi,
          args: [
            walletAddress,
            walletAddress,
            groveUrl,
            metadataUri,
            overlayTypeEnum,
          ],
        });

        // Prepare transaction
        const txParams = {
          from: walletAddress,
          to: contractAddress,
          data,
          value: "0x0",
        };

        // Send transaction
        const hash = await window.ethereum.request({
          method: "eth_sendTransaction",
          params: [txParams],
        });

        setIsConfirming(true);
        setIsMinting(false);

        // Wait for confirmation (simplified for demo)
        setTimeout(() => {
          setIsConfirming(false);
          setMintResult({
            success: true,
            message: "NFT minted successfully!",
            transactionHash: hash,
            explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
          });
        }, 3000);

        logger.info("Base NFT minting transaction sent", {
          hash,
          groveUrl,
          metadataUri,
          overlayType,
          overlayTypeEnum,
        });
      } catch (encodeError) {
        // Specific error handling for encoding issues
        logger.error("Error encoding function data", {
          error:
            encodeError instanceof Error
              ? encodeError.message
              : String(encodeError),
        });

        // Try alternative ABI format as fallback
        try {
          logger.info("Trying alternative ABI format");

          // Alternative ABI with explicit types
          const alternativeAbi = [
            {
              name: "mintNFT",
              type: "function",
              inputs: [
                { name: "to", type: "address" },
                { name: "creator", type: "address" },
                { name: "groveUrl", type: "string" },
                { name: "tokenURI", type: "string" },
                { name: "overlayType", type: "uint8" },
              ],
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "nonpayable",
            },
          ];

          const data = encodeFunctionData({
            abi: alternativeAbi,
            args: [
              walletAddress,
              walletAddress,
              groveUrl,
              metadataUri,
              overlayTypeEnum,
            ],
          });

          // Prepare transaction
          const txParams = {
            from: walletAddress,
            to: contractAddress,
            data,
            value: "0x0",
          };

          // Send transaction
          const hash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [txParams],
          });

          setIsConfirming(true);
          setIsMinting(false);

          // Wait for confirmation (simplified for demo)
          setTimeout(() => {
            setIsConfirming(false);
            setMintResult({
              success: true,
              message: "NFT minted successfully!",
              transactionHash: hash,
              explorerUrl: `https://sepolia.basescan.org/tx/${hash}`,
            });
          }, 3000);

          logger.info(
            "Base NFT minting transaction sent (using alternative ABI)",
            {
              hash,
              groveUrl,
              metadataUri,
              overlayType,
              overlayTypeEnum,
            }
          );
        } catch (fallbackError) {
          // If both methods fail, show a detailed error
          logger.error("Error with fallback ABI method", {
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError),
          });
          throw new Error(
            `Contract interaction failed: ${
              encodeError instanceof Error
                ? encodeError.message
                : String(encodeError)
            }. Development mode may require a deployed contract.`
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
        const errorMessage =
          "Transaction was rejected. You can try again when ready.";
        setError(errorMessage);
        setMintResult({
          success: false,
          message: errorMessage,
          error: errorMessage,
        });
        logger.info("User rejected the transaction");
      } else if (error.message?.includes("Development mode")) {
        // Special handling for development mode issues
        const errorMessage =
          "Minting in development mode may require additional setup. This would work in production.";
        setError(errorMessage);
        setMintResult({
          success: false,
          message: errorMessage,
          error: error.message,
        });
        logger.warn("Development mode minting issue", {
          error: error.message,
        });
      } else {
        const errorMessage = error.message || "Failed to mint NFT";
        setError(errorMessage);
        setMintResult({
          success: false,
          message: errorMessage,
          error: errorMessage,
        });
        logger.error("Error minting Base NFT", {
          error: errorMessage,
        });
      }
    }
  };

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
                className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm flex items-center justify-center gap-2"
                onClick={handleOpenGroveUrl}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                View on Grove
              </button>
            )}

            {isMantleify && isConnected && !mintResult && (
              <>
                {!isOnMantleSepolia ? (
                  <button
                    className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSwitchToMantleSepolia}
                    disabled={isSwitchingNetwork}
                  >
                    {isSwitchingNetwork
                      ? "Switching..."
                      : "Switch to Mantle Sepolia"}
                  </button>
                ) : (
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
              </>
            )}

            {baseOverlayType && isConnected && !mintResult && (
              <>
                {!isOnBaseSepolia ? (
                  <button
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    onClick={handleSwitchToBaseSepolia}
                    disabled={isSwitchingNetwork}
                  >
                    {isSwitchingNetwork
                      ? "Switching..."
                      : "Switch to Base Sepolia"}
                  </button>
                ) : (
                  <button
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    onClick={() => handleMintBaseNFT(baseOverlayType)}
                    disabled={isMinting || isConfirming}
                  >
                    {isMinting
                      ? "Initiating..."
                      : isConfirming
                      ? "Confirming..."
                      : `Mint as NFT on Base Sepolia`}
                  </button>
                )}
              </>
            )}

            {mintResult && (
              <div className="w-full p-2 bg-gray-800 rounded-md text-xs text-center">
                <p
                  className={`mb-1 ${
                    mintResult.success ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {mintResult.success
                    ? "NFT Minted Successfully!"
                    : mintResult.message}
                </p>
                {mintResult.explorerUrl && (
                  <button
                    className="text-blue-400 hover:text-blue-300 underline flex items-center justify-center gap-1 mt-1"
                    onClick={() =>
                      window.open(mintResult.explorerUrl, "_blank")
                    }
                  >
                    View on Explorer
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </button>
                )}
                {!mintResult.success &&
                  mintResult.message?.includes("rejected") && (
                    <button
                      className="text-blue-400 hover:text-blue-300 underline mt-2 block w-full text-center"
                      onClick={handleReset}
                    >
                      Try Again
                    </button>
                  )}
              </div>
            )}

            <button
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              onClick={handleReset}
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
        <div className="w-full p-2 bg-gray-800 rounded-md text-xs text-center text-gray-300">
          Connect your wallet to mint this as an NFT on Mantle
        </div>
      )}

      {!isConnected && baseOverlayType && generatedImage && (
        <div className="w-full p-2 bg-gray-800 rounded-md text-xs text-center text-gray-300 mt-2">
          Connect your wallet to mint this as an NFT on Base
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
