import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

export const wagmiConfig = createConfig({
  chains: [base, mainnet],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [farcasterFrame()],
});
