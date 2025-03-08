"use client";

import { ReactNode, useEffect, useState } from "react";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { createConfig, WagmiProvider, http } from "wagmi";
import {
  mainnet,
  polygon,
  optimism,
  base,
  zksync,
  linea,
  scroll,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client for React Query
const queryClient = new QueryClient();

// Custom chain for Lens Sepolia
const lensSepolia = {
  id: 11155111,
  name: "Lens Sepolia",
  network: "lens-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Sepolia Ether",
    symbol: "ETH",
  },
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

// Custom chain for Mantle Sepolia
const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia",
  network: "mantle-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "MNT",
    symbol: "MNT",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
    public: {
      http: ["https://rpc.sepolia.mantle.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://sepolia.mantlescan.xyz",
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
      mantleSepolia,
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
      [zksync.id]: http("https://mainnet.era.zksync.io"),
      [linea.id]: http(
        `https://linea-mainnet.infura.io/v3/${
          process.env.NEXT_PUBLIC_INFURA_ID || ""
        }`
      ),
      [scroll.id]: http("https://rpc.scroll.io"),
      [lensSepolia.id]: http(
        `https://lens-sepolia.g.alchemy.com/v2/${
          process.env.NEXT_PUBLIC_ALCHEMY_ID || ""
        }`
      ),
      [mantleSepolia.id]: http("https://rpc.sepolia.mantle.xyz"),
    },
    // Required API Keys
    walletConnectProjectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    // App Info
    appName: "WOWOWIFY",
    appDescription: "Image overlay tool",
    appUrl: "https://wowowifyer.vercel.app",
    appIcon: "https://wowowifyer.vercel.app/wowwowowify.png",
  })
);

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider
          customTheme={{
            "--ck-connectbutton-color": "#000000",
            "--ck-connectbutton-background": "#ffffff",
            "--ck-connectbutton-hover-background": "#f5f5f5",
          }}
        >
          {mounted && children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
