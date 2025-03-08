import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
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
} as const;

export const wagmiConfig = createConfig({
  chains: [mantleSepolia, base, mainnet],
  transports: {
    [mantleSepolia.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [farcasterFrame()],
});
