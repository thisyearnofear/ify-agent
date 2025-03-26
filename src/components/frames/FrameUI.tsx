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

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onGhiblify: () => void;
  onClear: () => void;
  selectedImage: string | null;
  isTransforming: boolean;
}

/**
 * Component for uploading and previewing images
 */
export const ImageUpload = ({
  onImageSelect,
  onGhiblify,
  onClear,
  selectedImage,
  isTransforming,
}: ImageUploadProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <div className="w-full">
      {!selectedImage ? (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG or GIF</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="relative w-full">
          <div className="relative w-full aspect-square mb-4">
            <Image
              src={selectedImage}
              alt="Selected image"
              fill
              className="object-contain rounded-lg"
              priority
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onGhiblify}
              disabled={isTransforming}
              className={`flex-1 py-3 px-4 rounded-lg text-white font-medium ${
                isTransforming
                  ? "bg-pink-800 cursor-wait"
                  : "bg-pink-600 hover:bg-pink-700"
              } transition-colors`}
            >
              {isTransforming ? (
                <div className="flex items-center justify-center gap-2">
                  <span>Transforming</span>
                  <span className="animate-pulse">✨</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Ghiblify</span>
                  <span>✨</span>
                </div>
              )}
            </button>
            <button
              onClick={onClear}
              disabled={isTransforming}
              className="py-3 px-4 rounded-lg text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <span>Clear</span>
                <span>🗑️</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
