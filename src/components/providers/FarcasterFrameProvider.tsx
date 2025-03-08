import { PropsWithChildren, useEffect } from "react";
import FrameSDK from "@farcaster/frame-sdk";
import { connect } from "wagmi/actions";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { logger } from "@/lib/logger";
import { wagmiConfig } from "./WagmiConfig";

export function FarcasterFrameProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const init = async () => {
      try {
        const context = await FrameSDK.context;

        // Log the context for debugging
        logger.info("Farcaster Frame context", {
          contextData: JSON.stringify(context),
        });

        // Autoconnect if running in a frame
        if (context?.client.clientFid) {
          connect(wagmiConfig, { connector: farcasterFrame() });

          logger.info("Connected to Farcaster wallet", {
            clientFid: context.client.clientFid,
          });
        }

        // Hide splash screen after UI renders
        setTimeout(() => {
          FrameSDK.actions.ready();
          logger.info("Farcaster Frame ready");
        }, 500);
      } catch (error) {
        logger.error("Error initializing Farcaster Frame", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    init();
  }, []);

  return <>{children}</>;
}
