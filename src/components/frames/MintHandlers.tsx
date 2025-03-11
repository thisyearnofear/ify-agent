"use client";

import { encodeFunctionData } from "viem";
import { EthereumError } from "./NetworkHandlers";

// Interface for mint result
export interface MintResult {
  success: boolean;
  message?: string;
  tokenId?: string;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
  alreadyMinted?: boolean;
}

/**
 * Handles minting an NFT on the Base Sepolia network
 * @param overlayType The type of overlay (higherify, baseify, etc.)
 * @param address The user's wallet address
 * @param groveUrl The Grove URL of the image
 * @param setIsMinting Function to set minting state
 * @param setMintResult Function to set mint result
 * @returns Promise that resolves when the minting process is complete
 */
export const handleMintBaseNFT = async (
  overlayType: string,
  address: string | undefined,
  groveUrl: string | null,
  setIsMinting: (isMinting: boolean) => void,
  setMintResult: (result: MintResult | null) => void
): Promise<void> => {
  if (!address || !groveUrl) {
    setMintResult({
      success: false,
      message: "Please connect your wallet first",
    });
    return;
  }

  setIsMinting(true);
  setMintResult(null);

  try {
    // Normalize the overlay type to ensure consistency
    const normalizedOverlayType = overlayType.toLowerCase();
    console.log("Minting with overlay type:", normalizedOverlayType);

    // Create a metadata URI that includes the Grove URL
    const metadataUri = `ipfs://${normalizedOverlayType}/${encodeURIComponent(
      groveUrl
    )}`;
    console.log("Metadata URI:", metadataUri);

    // Get the overlay type enum value
    let overlayTypeEnum = 0; // Default to HIGHER
    switch (normalizedOverlayType) {
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
    console.log("Overlay type enum:", overlayTypeEnum);

    // Contract address on Base Sepolia
    const contractAddress = "0x7bc9ff8519cf0ba2cc3ead8dc27ea3d9cb760e12";

    // ABI for the mintNFT function - using proper format for viem
    const mintFunctionAbi = [
      {
        name: "mintNFT",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "creator", type: "address" },
          { name: "groveUrl", type: "string" },
          { name: "tokenURI", type: "string" },
          { name: "overlayType", type: "uint8" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ];

    if (!window.ethereum) {
      throw new Error("No Ethereum provider found. Please install a wallet.");
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const walletAddress = accounts[0];

    // Encode the function call
    const data = encodeFunctionData({
      abi: mintFunctionAbi,
      functionName: "mintNFT",
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

    console.log("Transaction hash:", hash);

    // Set transaction hash and update UI
    setMintResult({
      success: true,
      message: "NFT minted successfully!",
      transactionHash: hash as string,
      explorerUrl: `https://sepolia-explorer.base.org/tx/${hash}`,
    });
  } catch (err: unknown) {
    console.error("Error minting NFT:", err);

    // Handle different error types
    if (!err) {
      // Handle empty error object
      setMintResult({
        success: false,
        message: "Transaction failed. Please try again.",
        error: "Unknown error occurred",
      });
      return;
    }

    // Try to cast to EthereumError, but handle cases where it might not match the expected structure
    let errorCode: number | undefined;
    let errorMessage: string | undefined;

    if (typeof err === "object") {
      const errorObj = err as any;
      errorCode = errorObj.code;
      errorMessage =
        errorObj.message || errorObj.reason || JSON.stringify(errorObj);
    }

    // Check if user rejected the transaction
    if (errorCode === 4001) {
      setMintResult({
        success: false,
        message: "Transaction rejected. Please try again.",
        error: "User rejected the transaction",
      });
    } else {
      setMintResult({
        success: false,
        message: `Error minting NFT: ${
          errorMessage || "Unknown error. Please try again."
        }`,
        error: errorMessage,
      });
    }
  } finally {
    setIsMinting(false);
  }
};

/**
 * Handles minting an NFT on the Mantle Sepolia network
 * @param address The user's wallet address
 * @param groveUrl The Grove URL of the image
 * @param setIsMinting Function to set minting state
 * @param setMintResult Function to set mint result
 * @returns Promise that resolves when the minting process is complete
 */
export const handleMintMantleNFT = async (
  address: string | undefined,
  groveUrl: string | null,
  setIsMinting: (isMinting: boolean) => void,
  setMintResult: (result: MintResult | null) => void
): Promise<void> => {
  if (!address || !groveUrl) {
    setMintResult({
      success: false,
      message: "Please connect your wallet first",
    });
    return;
  }

  setIsMinting(true);
  setMintResult(null);

  try {
    // Create a metadata URI that includes the Grove URL
    const metadataUri = `ipfs://mantleify/${encodeURIComponent(groveUrl)}`;
    console.log("Metadata URI:", metadataUri);

    // Contract address on Mantle Sepolia
    const contractAddress = "0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37";

    // ABI for the mintNFT function
    const mintFunctionAbi = [
      "function mintNFT(address to, address creator, string calldata groveUrl, string calldata tokenURI) returns (uint256)",
    ];

    if (!window.ethereum) {
      throw new Error("No Ethereum provider found. Please install a wallet.");
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const walletAddress = accounts[0];

    // Encode the function call
    const data = encodeFunctionData({
      abi: mintFunctionAbi,
      args: [walletAddress, walletAddress, groveUrl, metadataUri],
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

    console.log("Transaction hash:", hash);

    // Set transaction hash and update UI
    setMintResult({
      success: true,
      message: "NFT minted successfully!",
      transactionHash: hash as string,
      explorerUrl: `https://sepolia.mantlescan.xyz/tx/${hash}`,
    });
  } catch (err: unknown) {
    console.error("Error minting NFT:", err);

    // Handle different error types
    if (!err) {
      // Handle empty error object
      setMintResult({
        success: false,
        message: "Transaction failed. Please try again.",
        error: "Unknown error occurred",
      });
      return;
    }

    // Try to cast to EthereumError, but handle cases where it might not match the expected structure
    let errorCode: number | undefined;
    let errorMessage: string | undefined;

    if (typeof err === "object") {
      const errorObj = err as any;
      errorCode = errorObj.code;
      errorMessage =
        errorObj.message || errorObj.reason || JSON.stringify(errorObj);
    }

    // Check if user rejected the transaction
    if (errorCode === 4001) {
      setMintResult({
        success: false,
        message: "Transaction rejected. Please try again.",
        error: "User rejected the transaction",
      });
    } else {
      setMintResult({
        success: false,
        message: `Error minting NFT: ${
          errorMessage || "Unknown error. Please try again."
        }`,
        error: errorMessage,
      });
    }
  } finally {
    setIsMinting(false);
  }
};

/**
 * Handles minting an NFT on the Scroll Sepolia network
 * @param address The user's wallet address
 * @param groveUrl The Grove URL of the image
 * @param setIsMinting Function to set minting state
 * @param setMintResult Function to set mint result
 * @returns Promise that resolves when the minting process is complete
 */
export const handleMintScrollifyNFT = async (
  address: string | undefined,
  groveUrl: string | null,
  setIsMinting: (isMinting: boolean) => void,
  setMintResult: (result: MintResult | null) => void
): Promise<void> => {
  if (!address || !groveUrl) {
    setMintResult({
      success: false,
      message: "Please connect your wallet first",
    });
    return;
  }

  setIsMinting(true);
  setMintResult(null);

  try {
    // Create a metadata URI that includes the Grove URL
    const metadataUri = `ipfs://scrollify/${encodeURIComponent(groveUrl)}`;
    console.log("Metadata URI:", metadataUri);

    // Contract address on Scroll Sepolia
    const contractAddress = "0x653d41fba630381aa44d8598a4b35ce257924d65";

    // ABI for the mintNFT function - using proper format for viem
    const mintFunctionAbi = [
      {
        name: "mintNFT",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
          { name: "to", type: "address" },
          { name: "creator", type: "address" },
          { name: "groveUrl", type: "string" },
          { name: "tokenURI", type: "string" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
    ];

    if (!window.ethereum) {
      throw new Error("No Ethereum provider found. Please install a wallet.");
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const walletAddress = accounts[0];

    // Encode the function call
    const data = encodeFunctionData({
      abi: mintFunctionAbi,
      functionName: "mintNFT",
      args: [walletAddress, walletAddress, groveUrl, metadataUri],
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

    console.log("Transaction hash:", hash);

    // Set transaction hash and update UI
    setMintResult({
      success: true,
      message: "NFT minted successfully!",
      transactionHash: hash as string,
      explorerUrl: `https://sepolia.scrollscan.com/tx/${hash}`,
    });
  } catch (err: unknown) {
    console.error("Error minting NFT:", err);
    const error = err as EthereumError;

    // Check if user rejected the transaction
    if (error.code === 4001) {
      setMintResult({
        success: false,
        message: "Transaction rejected. Please try again.",
        error: "User rejected the transaction",
      });
    } else {
      setMintResult({
        success: false,
        message: `Error minting NFT: ${
          error.message || "Unknown error. Please try again."
        }`,
        error: error.message,
      });
    }
  } finally {
    setIsMinting(false);
  }
};
