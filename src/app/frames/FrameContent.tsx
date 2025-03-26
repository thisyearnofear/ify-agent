"use client";

import { useEffect, useState, useCallback } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { wagmiConfig } from "@/components/providers/WagmiConfig";
import { FarcasterContext } from "@/types/farcaster";
import {
  isOnBaseSepolia,
  isOnMantleSepolia,
  isOnScrollSepolia,
  handleSwitchToBaseSepolia,
  handleSwitchToMantleSepolia,
  handleSwitchToScrollSepolia,
} from "@/components/frames/NetworkHandlers";
import {
  MintResult,
  handleMintBaseNFT,
  handleMintMantleNFT,
  handleMintScrollifyNFT,
} from "@/components/frames/MintHandlers";
import {
  MintButtons,
  MintResultDisplay,
  UserWelcome,
  GeneratedImageDisplay,
  PromptInput,
  ImageUpload,
} from "@/components/frames/FrameUI";

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
  const [isScrollify, setIsScrollify] = useState(false);
  const [isGhiblify, setIsGhiblify] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<MintResult | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Initialize the SDK
  useEffect(() => {
    const init = async () => {
      try {
        const context = await FrameSDK.context;
        setContextData(context as unknown as FarcasterContext);

        // Hide splash screen after UI renders
        setTimeout(() => {
          // Use ready() instead of hideSplashScreen()
          FrameSDK.actions.ready();
          setIsSDKLoaded(true);
        }, 500);
      } catch (error) {
        console.error("Error initializing Frame SDK:", error);
        setIsSDKLoaded(true); // Still set to true so UI renders
      }
    };

    init();
  }, []);

  // Check network on mount and when connection changes
  useEffect(() => {
    const checkNetwork = async () => {
      if (isConnected && window.ethereum) {
        try {
          const chainIdHex = await window.ethereum.request({
            method: "eth_chainId",
          });
          const currentChainId = parseInt(chainIdHex, 16);
          setChainId(currentChainId);
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
    connect({ connector: wagmiConfig.connectors[0] });
  }, [connect]);

  const handleDisconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratedImage(null);
    setGroveUrl(null);
    setMintResult(null);
    setIsMantleify(false);
    setBaseOverlayType(null);
    setIsScrollify(false);
    setIsGhiblify(false);

    try {
      // Check if this is a ghiblify request
      const isGhiblifyRequest = prompt.toLowerCase().includes("ghiblify");

      if (isGhiblifyRequest) {
        // Extract the image URL from the prompt or context
        const imageUrl =
          contextData?.inputImageUrl || prompt.match(/https?:\/\/[^\s]+/)?.[0];

        if (!imageUrl) {
          throw new Error("No image URL found to transform");
        }

        // Call the replicate endpoint
        const response = await fetch("/api/replicate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl,
          }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setGeneratedImage(data.url);
        setIsGhiblify(true);

        // Post message to parent frame
        postMessageToParent("imageGenerated", {
          imageUrl: data.url,
          isGhiblify: true,
        });
      } else {
        // Handle regular image generation
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
          throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Generation response:", data);

        if (data.error) {
          throw new Error(data.error);
        }

        setGeneratedImage(data.resultUrl);
        setGroveUrl(data.groveUrl || null);

        // Check if this is a mantleify image
        if (
          prompt.toLowerCase().includes("mantleify") ||
          (data.overlayMode && data.overlayMode.toLowerCase() === "mantleify")
        ) {
          setIsMantleify(true);
        }

        // Check if this is a scrollify image
        if (
          prompt.toLowerCase().includes("scrollify") ||
          (data.overlayMode && data.overlayMode.toLowerCase() === "scrollify")
        ) {
          setIsScrollify(true);
        }

        // Check if this is a Base NFT-compatible overlay
        const baseOverlays = [
          "higherify",
          "baseify",
          "higherise",
          "dickbuttify",
        ];
        for (const overlay of baseOverlays) {
          if (
            prompt.toLowerCase().includes(overlay) ||
            (data.overlayMode && data.overlayMode.toLowerCase() === overlay)
          ) {
            setBaseOverlayType(overlay);
            break;
          }
        }

        // Post message to parent frame
        postMessageToParent("imageGenerated", {
          imageUrl: data.resultUrl,
          groveUrl: data.groveUrl,
        });
      }
    } catch (err) {
      console.error("Error generating image:", err);
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, contextData]);

  const handleOpenGroveUrl = useCallback(() => {
    if (groveUrl) {
      window.open(groveUrl, "_blank");
    }
  }, [groveUrl]);

  const handleOpenApp = useCallback(() => {
    window.open("https://wowowifyer.vercel.app", "_blank");
  }, []);

  const handleReset = () => {
    setPrompt("");
    setGeneratedImage(null);
    setGroveUrl(null);
    setError(null);
    setMintResult(null);
    setIsMantleify(false);
    setBaseOverlayType(null);
  };

  const handleSwitchToBase = async () => {
    // Create a no-op function to satisfy the API
    const noOp = () => {};
    await handleSwitchToBaseSepolia(setError, noOp);
  };

  const handleSwitchToMantle = async () => {
    // Create a no-op function to satisfy the API
    const noOp = () => {};
    await handleSwitchToMantleSepolia(setError, noOp);
  };

  const handleSwitchToScroll = async () => {
    // Create a no-op function to satisfy the API
    const noOp = () => {};
    await handleSwitchToScrollSepolia(setError, noOp);
  };

  const mintBaseNFT = async (overlayType: string) => {
    // Check if on the correct network
    if (!isOnBaseSepolia(chainId)) {
      setError("Please switch to Base Sepolia network");
      await handleSwitchToBase();
      return;
    }

    await handleMintBaseNFT(
      overlayType,
      address,
      groveUrl,
      setIsMinting,
      setMintResult
    );
  };

  const mintMantleNFT = async () => {
    // Check if on the correct network
    if (!isOnMantleSepolia(chainId)) {
      setError("Please switch to Mantle Sepolia network");
      await handleSwitchToMantle();
      return;
    }

    await handleMintMantleNFT(address, groveUrl, setIsMinting, setMintResult);
  };

  const mintScrollifyNFT = async () => {
    // Check if on the correct network
    if (!isOnScrollSepolia(chainId)) {
      setError("Please switch to Scroll Sepolia network");
      await handleSwitchToScroll();
      return;
    }

    await handleMintScrollifyNFT(
      address,
      groveUrl,
      setIsMinting,
      setMintResult
    );
  };

  const postMessageToParent = (
    action: string,
    data: Record<string, unknown>
  ) => {
    if (window.parent) {
      window.parent.postMessage(
        {
          action,
          data,
        },
        "*"
      );
    }
  };

  const handleImageSelect = useCallback((file: File) => {
    setUploadedImage(file);
    const url = URL.createObjectURL(file);
    setUploadedImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, []);

  const handleGhiblify = useCallback(async () => {
    if (!uploadedImage) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setGroveUrl(null);
    setMintResult(null);
    setIsGhiblify(true);

    try {
      // Create form data with the image
      const formData = new FormData();
      formData.append("image", uploadedImage);

      // Call the replicate endpoint
      const response = await fetch("/api/replicate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        setGeneratedImage(data.url);
        // Post message to parent frame
        postMessageToParent("imageGenerated", {
          imageUrl: data.url,
          isGhiblify: true,
        });
      } else {
        throw new Error("No transformed image URL received");
      }
    } catch (error) {
      console.error("Error transforming image:", error);
      setError(
        error instanceof Error ? error.message : "Failed to transform image"
      );
      setIsGhiblify(false);
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage]);

  if (!isSDKLoaded) {
    return <div className="p-4 text-center">Loading frame...</div>;
  }

  return (
    <div className="w-[320px] mx-auto py-4 px-2 bg-gray-900 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-4">WOWOWIFY</h1>

      {contextData?.user && <UserWelcome user={contextData.user} />}

      {!generatedImage ? (
        <>
          <div className="flex flex-col gap-4">
            <ImageUpload
              onImageSelect={handleImageSelect}
              onGhiblify={handleGhiblify}
              selectedImage={uploadedImageUrl}
              isTransforming={isGenerating && isGhiblify}
            />

            <div className="text-center text-sm text-gray-400">- or -</div>

            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              isGenerating={isGenerating}
              handleGenerate={handleGenerate}
            />
          </div>

          {error && (
            <div className="mt-4 p-2 bg-red-900 text-white rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 w-full">
            {isConnected ? (
              <button
                className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                onClick={handleDisconnectWallet}
              >
                Disconnect Wallet
              </button>
            ) : (
              <button
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                onClick={handleConnectWallet}
              >
                Connect Wallet
              </button>
            )}

            <button
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md"
              onClick={handleOpenApp}
            >
              Open Full App
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center w-full">
          <GeneratedImageDisplay
            generatedImage={generatedImage}
            groveUrl={groveUrl}
            handleOpenGroveUrl={handleOpenGroveUrl}
            handleOpenApp={handleOpenApp}
          />

          <MintButtons
            groveUrl={groveUrl}
            isConnected={isConnected}
            isMinting={isMinting}
            isMantleify={isMantleify}
            baseOverlayType={baseOverlayType}
            isScrollify={isScrollify}
            isOnMantleSepolia={isOnMantleSepolia(chainId)}
            isOnBaseSepolia={isOnBaseSepolia(chainId)}
            isOnScrollSepolia={isOnScrollSepolia(chainId)}
            handleMintMantleNFT={mintMantleNFT}
            handleMintBaseNFT={mintBaseNFT}
            handleMintScrollifyNFT={mintScrollifyNFT}
          />

          {mintResult && <MintResultDisplay mintResult={mintResult} />}

          {error && (
            <div className="mt-4 p-2 bg-red-900 text-white rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 w-full">
            <button
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              onClick={handleReset}
            >
              Generate Another
            </button>

            {isConnected ? (
              <button
                className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-md"
                onClick={handleDisconnectWallet}
              >
                Disconnect Wallet
              </button>
            ) : (
              <button
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                onClick={handleConnectWallet}
              >
                Connect Wallet
              </button>
            )}
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
