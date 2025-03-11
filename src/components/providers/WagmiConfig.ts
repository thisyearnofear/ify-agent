import { createConfig, http } from "wagmi";
import { base, mainnet, baseSepolia } from "wagmi/chains";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

// Define Mantle Sepolia chain
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

// Define Scroll Sepolia chain
const scrollSepolia = {
  id: 534351,
  name: "Scroll Sepolia",
  network: "scroll-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Scroll Sepolia Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rpc.scroll.io"],
    },
    public: {
      http: ["https://sepolia-rpc.scroll.io"],
    },
  },
  blockExplorers: {
    default: {
      name: "Scroll Sepolia Explorer",
      url: "https://sepolia.scrollscan.com",
    },
  },
};

// Create a Wagmi config for the Farcaster Frame
export const wagmiConfig = createConfig({
  chains: [mainnet, base, baseSepolia, mantleSepolia, scrollSepolia],
  connectors: [farcasterFrame()],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [mantleSepolia.id]: http(),
    [scrollSepolia.id]: http(),
  },
});
