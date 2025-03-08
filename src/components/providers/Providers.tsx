"use client";

import dynamic from "next/dynamic";
import { PropsWithChildren } from "react";

// Dynamically import providers that need to be client-side only
const WagmiProvider = dynamic(
  () =>
    import("./WagmiProvider").then((mod) => ({ default: mod.WagmiProvider })),
  {
    ssr: false,
  }
);

const FarcasterFrameProvider = dynamic(
  () =>
    import("./FarcasterFrameProvider").then((mod) => ({
      default: mod.FarcasterFrameProvider,
    })),
  {
    ssr: false,
  }
);

export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider>
      <FarcasterFrameProvider>{children}</FarcasterFrameProvider>
    </WagmiProvider>
  );
}
