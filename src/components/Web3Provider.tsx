"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import {
  mainnet,
  polygon,
  optimism,
  base,
  zksync,
  linea,
  scroll,
  sepolia,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { ReactNode } from "react";

// Create a client for React Query
const queryClient = new QueryClient();

// Create a custom Lens Sepolia chain
const lensSepolia = {
  ...sepolia,
  id: 11155111, // Sepolia chain ID
  name: "Lens Sepolia",
  network: "lens-sepolia",
  rpcUrls: {
    default: {
      http: [
        `https://lens-sepolia.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID ||
          "Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
        }`,
      ],
    },
    public: {
      http: [
        `https://lens-sepolia.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID ||
          "Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
        }`,
      ],
    },
  },
};

// Create a Wagmi config with ConnectKit's default configuration
const config = createConfig(
  getDefaultConfig({
    // Support multiple chains
    chains: [
      mainnet,
      polygon,
      optimism,
      base,
      zksync,
      linea,
      scroll,
      lensSepolia,
    ],
    transports: {
      // RPC URLs for each chain
      [mainnet.id]: http(
        `https://eth-mainnet.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [polygon.id]: http(
        `https://polygon-mainnet.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [optimism.id]: http(
        `https://opt-mainnet.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [base.id]: http(
        `https://base-mainnet.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [zksync.id]: http(
        `https://zksync-mainnet.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [linea.id]: http(
        `https://linea-mainnet.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [scroll.id]: http(
        `https://scroll-mainnet.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [lensSepolia.id]: http(
        `https://lens-sepolia.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
    },

    // Required API Keys
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",

    // Required App Info
    appName: "WOWOWIFY",

    // Optional App Info
    appDescription: "AI-powered image generation with Web3 storage",
    appUrl: "https://wowowifyer.vercel.app",
    appIcon: "https://wowowifyer.vercel.app/wowwowowify.png",
  })
);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
