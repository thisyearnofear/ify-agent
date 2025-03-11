"use client";

import Image from "next/image";
import { MintResult } from "./MintHandlers";
import { FarcasterUser } from "@/types/farcaster";

interface MintButtonsProps {
  groveUrl: string | null;
  isConnected: boolean;
  isMinting: boolean;
  isMantleify: boolean;
  baseOverlayType: string | null;
  prompt: string;
  isScrollify?: boolean;
  isOnMantleSepolia: boolean;
  isOnBaseSepolia: boolean;
  isOnScrollSepolia: boolean;
  handleMintMantleNFT: () => Promise<void>;
  handleMintBaseNFT: (overlayType: string) => Promise<void>;
  handleMintScrollifyNFT: () => Promise<void>;
}

/**
 * Component for displaying mint buttons
 */
export const MintButtons = ({
  groveUrl,
  isConnected,
  isMinting,
  isMantleify,
  baseOverlayType,
  prompt,
  isScrollify,
  isOnMantleSepolia,
  isOnBaseSepolia,
  isOnScrollSepolia,
  handleMintMantleNFT,
  handleMintBaseNFT,
  handleMintScrollifyNFT,
}: MintButtonsProps) => {
  if (!groveUrl) return null;

  return (
    <div className="flex flex-col gap-2 w-full mt-4">
      {/* Mantle minting button */}
      {isMantleify && (
        <button
          className={`w-full py-2 px-4 rounded-md text-white ${
            !isConnected || isMinting
              ? "bg-gray-400 cursor-not-allowed"
              : !isOnMantleSepolia
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={handleMintMantleNFT}
          disabled={!isConnected || isMinting}
        >
          {!isConnected
            ? "Connect Wallet to Mint"
            : !isOnMantleSepolia
            ? "Switch to Mantle Sepolia"
            : isMinting
            ? "Minting..."
            : "Mint"}
        </button>
      )}

      {/* Base minting button */}
      {baseOverlayType && (
        <button
          className={`w-full py-2 px-4 rounded-md text-white ${
            !isConnected || isMinting
              ? "bg-gray-400 cursor-not-allowed"
              : !isOnBaseSepolia
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={() => handleMintBaseNFT(baseOverlayType)}
          disabled={!isConnected || isMinting}
        >
          {!isConnected
            ? "Connect Wallet to Mint"
            : !isOnBaseSepolia
            ? "Switch to Base Sepolia"
            : isMinting
            ? "Minting..."
            : "Mint"}
        </button>
      )}

      {/* Scrollify minting button */}
      {isScrollify && (
        <button
          className={`w-full py-2 px-4 rounded-md text-white ${
            !isConnected || isMinting
              ? "bg-gray-400 cursor-not-allowed"
              : !isOnScrollSepolia
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
          onClick={handleMintScrollifyNFT}
          disabled={!isConnected || isMinting}
        >
          {!isConnected
            ? "Connect Wallet to Mint"
            : !isOnScrollSepolia
            ? "Switch to Scroll Sepolia"
            : isMinting
            ? "Minting..."
            : "Mint"}
        </button>
      )}
    </div>
  );
};

interface MintResultDisplayProps {
  mintResult: MintResult;
}

/**
 * Component for displaying mint result
 */
export const MintResultDisplay = ({ mintResult }: MintResultDisplayProps) => {
  if (!mintResult) return null;

  return (
    <div className="mt-4 p-3 rounded-md text-center">
      {mintResult.success ? (
        <div className="text-green-500">
          <p className="font-semibold">{mintResult.message}</p>
          {mintResult.explorerUrl && (
            <a
              href={mintResult.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm mt-2 block"
            >
              View on Explorer
            </a>
          )}
        </div>
      ) : (
        <div className="text-red-500">
          <p>{mintResult.message}</p>
          {mintResult.alreadyMinted && (
            <p className="text-sm mt-1">
              This image has already been minted as an NFT.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

interface UserWelcomeProps {
  user: FarcasterUser | undefined;
}

/**
 * Component for displaying user welcome message
 */
export const UserWelcome = ({ user }: UserWelcomeProps) => {
  if (!user) return null;

  return (
    <div className="mb-4 text-center">
      <p className="text-sm text-gray-300">
        Welcome, {user.displayName || user.username || `FID: ${user.fid}`}
      </p>
    </div>
  );
};

interface GeneratedImageDisplayProps {
  generatedImage: string;
  groveUrl: string | null;
  handleOpenGroveUrl: () => void;
  handleOpenApp: () => void;
}

/**
 * Component for displaying generated image
 */
export const GeneratedImageDisplay = ({
  generatedImage,
  groveUrl,
  handleOpenGroveUrl,
  handleOpenApp,
}: GeneratedImageDisplayProps) => {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-4 relative w-full aspect-square">
        <Image
          src={generatedImage}
          alt="Generated image"
          fill
          className="object-contain rounded-md"
          priority
        />
      </div>

      <div className="flex flex-col gap-2 w-full">
        {groveUrl && (
          <button
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-2"
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

        <button
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md"
          onClick={handleOpenApp}
        >
          Open Full App
        </button>
      </div>
    </div>
  );
};

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
}

/**
 * Component for prompt input
 */
export const PromptInput = ({
  prompt,
  setPrompt,
  isGenerating,
  handleGenerate,
}: PromptInputProps) => {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded-md"
        placeholder="Try 'baseify a futuristic city' or 'overlay: higherify scale 0.5'"
        rows={2}
        disabled={isGenerating}
      ></textarea>

      <button
        className={`w-full py-2 px-4 ${
          isGenerating
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white rounded-md`}
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? "Generating..." : "Generate"}
      </button>
    </div>
  );
};
