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
      case "dickbuttify":
        overlayTypeEnum = 2; // DICKBUTTIFY
        break;
    }
    console.log("Overlay type enum:", overlayTypeEnum);

    // Contract address on Base Sepolia
    const contractAddress = "0xf83BEE9560F7DBf5b103e8449d7869AF1E5EBD80";
    console.log("Using contract address:", contractAddress);

    // ABI for the mintNFT function and price getter - using proper format for viem
    const contractAbi = [
      {
        name: "mintOriginalNFT",
        type: "function",
        stateMutability: "payable",
        inputs: [
          { name: "to", type: "address" },
          { name: "creator", type: "address" },
          { name: "groveUrl", type: "string" },
          { name: "tokenURI", type: "string" },
          { name: "overlayType", type: "uint8" },
        ],
        outputs: [{ name: "", type: "uint256" }],
      },
      {
        name: "ORIGINAL_PRICE",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
      },
    ];

    if (!window.ethereum) {
      throw new Error("No Ethereum provider found. Please install a wallet.");
    }

    console.log("Requesting account access...");
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const walletAddress = accounts[0];
    console.log("Connected wallet address:", walletAddress);

    try {
      // Check if we're on Base Sepolia (chain ID: 84532)
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      console.log("Current chain ID:", chainId);

      if (chainId !== "0x14a34") {
        // 84532 in hex
        console.log("Switching to Base Sepolia...");
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x14a34" }],
          });
        } catch (switchError: unknown) {
          // This error code indicates that the chain has not been added to MetaMask
          const error = switchError as { code: number };
          if (error.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x14a34",
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
          } else {
            throw switchError;
          }
        }
      }

      // Use the known constant price from the contract
      // 0.05 ETH = 50000000000000000 wei = 0x0B1A2BC2EC50000
      const mintPriceHex = "0x0B1A2BC2EC50000"; // 0.05 ETH (50000000000000000 wei)
      console.log(
        "Using contract's ORIGINAL_PRICE:",
        mintPriceHex,
        "(0.05 ETH)"
      );

      // Encode the mint function call
      console.log("Encoding mint function call...");
      const mintData = encodeFunctionData({
        abi: contractAbi,
        functionName: "mintOriginalNFT",
        args: [
          walletAddress,
          walletAddress,
          groveUrl,
          metadataUri,
          overlayTypeEnum,
        ],
      });

      // Prepare transaction with the dynamically fetched price
      console.log("Preparing transaction...");
      const txParams = {
        from: walletAddress,
        to: contractAddress,
        data: mintData,
        value: mintPriceHex,
      };
      console.log("Transaction params:", {
        from: txParams.from,
        to: txParams.to,
        value: txParams.value,
      });

      // Send transaction
      console.log("Sending transaction...");
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
    } catch (mintError: unknown) {
      console.error("Error in minting process:", {
        error: mintError,
        errorType: typeof mintError,
        errorString: String(mintError),
        errorJSON: JSON.stringify(mintError),
        stack: mintError instanceof Error ? mintError.stack : undefined,
      });

      throw mintError; // Re-throw to be caught by outer catch block
    }
  } catch (err: unknown) {
    console.error("Error handling:", {
      error: err,
      errorType: typeof err,
      errorString: String(err),
      errorJSON: JSON.stringify(err),
      stack: err instanceof Error ? err.stack : undefined,
    });

    // Handle different error types
    if (!err) {
      setMintResult({
        success: false,
        message: "Transaction failed. Please try again.",
        error: "Unknown error occurred (empty error object)",
      });
      return;
    }

    // Try to cast to EthereumError, but handle cases where it might not match the expected structure
    let errorCode: number | undefined;
    let errorMessage: string | undefined;

    if (typeof err === "object") {
      const errorObj = err as Record<string, unknown>;
      errorCode = typeof errorObj.code === "number" ? errorObj.code : undefined;
      errorMessage =
        typeof errorObj.message === "string"
          ? errorObj.message
          : typeof errorObj.reason === "string"
          ? errorObj.reason
          : JSON.stringify(errorObj);

      console.log("Error details:", {
        code: errorCode,
        message: errorMessage,
        raw: errorObj,
      });
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
          errorMessage ||
          "Unknown error. Please check your wallet and try again."
        }`,
        error: errorMessage || "Unknown error occurred during minting",
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

    // ABI for the mintNFT function and price getter
    const contractAbi = [
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
      {
        name: "MINT_PRICE",
        type: "function",
        stateMutability: "view",
        inputs: [],
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

    // Get the mint price from the contract
    const mintPriceData = encodeFunctionData({
      abi: contractAbi,
      functionName: "MINT_PRICE",
    });

    const mintPriceHex = await window.ethereum.request({
      method: "eth_call",
      params: [
        {
          to: contractAddress,
          data: mintPriceData,
        },
        "latest",
      ],
    });

    // Encode the mint function call
    const mintData = encodeFunctionData({
      abi: contractAbi,
      functionName: "mintNFT",
      args: [walletAddress, walletAddress, groveUrl, metadataUri],
    });

    // Prepare transaction with the dynamically fetched price
    const txParams = {
      from: walletAddress,
      to: contractAddress,
      data: mintData,
      value: mintPriceHex, // Use the price from the contract
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
      const errorObj = err as Record<string, unknown>;
      errorCode = typeof errorObj.code === "number" ? errorObj.code : undefined;
      errorMessage =
        typeof errorObj.message === "string"
          ? errorObj.message
          : typeof errorObj.reason === "string"
          ? errorObj.reason
          : JSON.stringify(errorObj);
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
    const contractAddress = "0xf230170c3afd6bea32ab0d7747c04a831bf24968";

    // Scroll Sepolia chain ID - can be represented in different formats
    const SCROLL_SEPOLIA_CHAIN_ID = 534351;
    const SCROLL_SEPOLIA_CHAIN_ID_HEX = "0x82750";

    // ABI for the mintOriginal function and price getter
    const contractAbi = [
      {
        name: "mintOriginal",
        type: "function",
        stateMutability: "payable",
        inputs: [{ name: "_tokenURI", type: "string" }],
        outputs: [{ name: "", type: "uint256" }],
      },
      {
        name: "MINT_PRICE",
        type: "function",
        stateMutability: "view",
        inputs: [],
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

    // Check if we're on Scroll Sepolia (chain ID: 534351)
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    const chainIdDecimal = parseInt(chainIdHex as string, 16);

    console.log("Current chain ID:", {
      hex: chainIdHex,
      decimal: chainIdDecimal,
      isCorrect:
        chainIdDecimal === SCROLL_SEPOLIA_CHAIN_ID ||
        chainIdHex === SCROLL_SEPOLIA_CHAIN_ID_HEX,
    });

    // Check if we're already on the correct network
    const isCorrectNetwork =
      chainIdDecimal === SCROLL_SEPOLIA_CHAIN_ID ||
      chainIdHex === SCROLL_SEPOLIA_CHAIN_ID_HEX;

    if (!isCorrectNetwork) {
      console.log("Switching to Scroll Sepolia...");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SCROLL_SEPOLIA_CHAIN_ID_HEX }],
        });

        // Verify the switch was successful
        const newChainIdHex = await window.ethereum.request({
          method: "eth_chainId",
        });
        const newChainIdDecimal = parseInt(newChainIdHex as string, 16);

        console.log("After switching, chain ID:", {
          hex: newChainIdHex,
          decimal: newChainIdDecimal,
        });

        // If still not on the correct network, throw an error
        if (
          newChainIdDecimal !== SCROLL_SEPOLIA_CHAIN_ID &&
          newChainIdHex !== SCROLL_SEPOLIA_CHAIN_ID_HEX
        ) {
          throw new Error("Failed to switch to Scroll Sepolia network");
        }
      } catch (switchError: unknown) {
        // This error code indicates that the chain has not been added to MetaMask
        const error = switchError as { code: number };
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: SCROLL_SEPOLIA_CHAIN_ID_HEX,
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

            // Verify the network was added and switched to
            const newChainIdHex = await window.ethereum.request({
              method: "eth_chainId",
            });
            const newChainIdDecimal = parseInt(newChainIdHex as string, 16);

            console.log("After adding network, chain ID:", {
              hex: newChainIdHex,
              decimal: newChainIdDecimal,
            });

            // If still not on the correct network, throw an error
            if (
              newChainIdDecimal !== SCROLL_SEPOLIA_CHAIN_ID &&
              newChainIdHex !== SCROLL_SEPOLIA_CHAIN_ID_HEX
            ) {
              throw new Error(
                "Failed to switch to Scroll Sepolia network after adding it"
              );
            }
          } catch (addError) {
            console.error("Error adding Scroll Sepolia network:", addError);
            throw new Error(
              "Failed to add Scroll Sepolia network. Please add it manually."
            );
          }
        } else {
          console.error("Error switching to Scroll Sepolia:", switchError);
          throw switchError;
        }
      }
    } else {
      console.log("Already on Scroll Sepolia network, no need to switch");
    }

    // Get the mint price from the contract
    try {
      const mintPriceData = encodeFunctionData({
        abi: contractAbi,
        functionName: "MINT_PRICE",
      });

      const mintPriceHex = await window.ethereum.request({
        method: "eth_call",
        params: [
          {
            to: contractAddress,
            data: mintPriceData,
          },
          "latest",
        ],
      });

      console.log("Mint price from contract:", mintPriceHex);

      // Encode the mint function call
      const mintData = encodeFunctionData({
        abi: contractAbi,
        functionName: "mintOriginal",
        args: [metadataUri],
      });

      // Prepare transaction with the dynamically fetched price
      const txParams = {
        from: walletAddress,
        to: contractAddress,
        data: mintData,
        value: mintPriceHex, // Use the price from the contract
      };

      console.log("Transaction params:", {
        from: txParams.from,
        to: txParams.to,
        value: txParams.value,
      });

      // Send transaction
      console.log("Sending transaction...");
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
    } catch (priceError) {
      console.error(
        "Error getting mint price or sending transaction:",
        priceError
      );

      // Fallback to hardcoded price of 0.01 ETH
      const hardcodedPrice = "0x2386F26FC10000"; // 0.01 ETH in hex
      console.log("Using hardcoded price:", hardcodedPrice);

      // Encode the mint function call
      const mintData = encodeFunctionData({
        abi: contractAbi,
        functionName: "mintOriginal",
        args: [metadataUri],
      });

      // Prepare transaction with hardcoded price
      const txParams = {
        from: walletAddress,
        to: contractAddress,
        data: mintData,
        value: hardcodedPrice,
      };

      console.log("Transaction params (with hardcoded price):", {
        from: txParams.from,
        to: txParams.to,
        value: txParams.value,
      });

      // Send transaction
      console.log("Sending transaction with hardcoded price...");
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
    }
  } catch (err: unknown) {
    console.error("Error minting NFT:", {
      error: err,
      errorType: typeof err,
      errorString: String(err),
      errorJSON: JSON.stringify(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
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
