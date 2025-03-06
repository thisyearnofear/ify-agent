"use client";

import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";

interface WalletConnectProps {
  className?: string;
}

export default function WalletConnect({ className = "" }: WalletConnectProps) {
  const { isConnected, address } = useAccount();

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <ConnectKitButton />

      {isConnected && address && (
        <div className="text-sm text-gray-600 mt-1">
          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
            {address.substring(0, 6)}...{address.substring(address.length - 4)}
          </span>
        </div>
      )}
    </div>
  );
}
