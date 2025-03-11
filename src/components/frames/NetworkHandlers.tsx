"use client";

import { baseSepolia } from "viem/chains";

// Define Scroll Sepolia chain ID
export const SCROLL_SEPOLIA_CHAIN_ID = 534351;
// Define Mantle Sepolia chain ID
export const MANTLE_SEPOLIA_CHAIN_ID = 5003;

// Type definition for Ethereum errors
export type EthereumError = {
  code: number;
  message: string;
};

/**
 * Checks if the user is on the Base Sepolia network
 * @param chainId The current chain ID
 * @returns Whether the user is on Base Sepolia
 */
export const isOnBaseSepolia = (chainId: number | null): boolean => {
  return chainId === baseSepolia.id;
};

/**
 * Checks if the user is on the Mantle Sepolia network
 * @param chainId The current chain ID
 * @returns Whether the user is on Mantle Sepolia
 */
export const isOnMantleSepolia = (chainId: number | null): boolean => {
  return chainId === MANTLE_SEPOLIA_CHAIN_ID;
};

/**
 * Checks if the user is on the Scroll Sepolia network
 * @param chainId The current chain ID
 * @returns Whether the user is on Scroll Sepolia
 */
export const isOnScrollSepolia = (chainId: number | null): boolean => {
  return chainId === SCROLL_SEPOLIA_CHAIN_ID;
};

/**
 * Handles switching to the Base Sepolia network
 * @param setError Function to set error message
 * @param setIsSwitchingNetwork Function to set switching network state
 * @returns Promise that resolves when the network switch is complete
 */
export const handleSwitchToBaseSepolia = async (
  setError: (error: string | null) => void,
  setIsSwitchingNetwork: (isSwitching: boolean) => void
): Promise<void> => {
  if (!window.ethereum) {
    setError("No Ethereum provider found. Please install a wallet.");
    return;
  }

  setIsSwitchingNetwork(true);
  setError(null);

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
        setError("Failed to add Base Sepolia network. Please add it manually.");
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

/**
 * Handles switching to the Mantle Sepolia network
 * @param setError Function to set error message
 * @param setIsSwitchingNetwork Function to set switching network state
 * @returns Promise that resolves when the network switch is complete
 */
export const handleSwitchToMantleSepolia = async (
  setError: (error: string | null) => void,
  setIsSwitchingNetwork: (isSwitching: boolean) => void
): Promise<void> => {
  if (!window.ethereum) {
    setError("No Ethereum provider found. Please install a wallet.");
    return;
  }

  setIsSwitchingNetwork(true);
  setError(null);

  try {
    // Try to switch to Mantle Sepolia
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1393" }], // 5003 in hex
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
      console.error("Error switching network:", err);
    }
  } finally {
    setIsSwitchingNetwork(false);
  }
};

/**
 * Handles switching to the Scroll Sepolia network
 * @param setError Function to set error message
 * @param setIsSwitchingNetwork Function to set switching network state
 * @returns Promise that resolves when the network switch is complete
 */
export const handleSwitchToScrollSepolia = async (
  setError: (error: string | null) => void,
  setIsSwitchingNetwork: (isSwitching: boolean) => void
): Promise<void> => {
  if (!window.ethereum) {
    setError("No Ethereum provider found. Please install a wallet.");
    return;
  }

  setIsSwitchingNetwork(true);
  setError(null);

  try {
    // Try to switch to Scroll Sepolia
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x8274f" }], // 534351 in hex
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
              chainId: "0x8274f", // 534351 in hex
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
      } catch (addError) {
        setError(
          "Failed to add Scroll Sepolia network. Please add it manually."
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
