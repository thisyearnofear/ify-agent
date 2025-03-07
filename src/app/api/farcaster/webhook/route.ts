import { NextResponse } from "next/server";
import { parseCommand } from "@/lib/command-parser";
import { logger } from "@/lib/logger";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { getAllowedUsers } from "@/lib/farcaster-allowed-users";
import { createHmac } from "crypto";

// Mark as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

// Environment variables for Neynar
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.FARCASTER_SIGNER_UUID;
const BOT_FID = process.env.FARCASTER_BOT_FID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const WEBHOOK_SECRET = process.env.NEYNAR_WEBHOOK_SECRET;

// Define types for Farcaster profiles
interface FarcasterProfile {
  fid: number;
  username?: string;
  display_name?: string;
  pfp_url?: string;
}

// Initialize Neynar client
const getNeynarClient = () => {
  if (!NEYNAR_API_KEY) {
    throw new Error("NEYNAR_API_KEY is not defined");
  }
  return new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });
};

// Extract command from mention text
const extractCommand = (text: string): string => {
  // Remove @snel or any other mention from the text
  return text.replace(/@\w+/g, "").trim();
};

// Reply to the original cast with the result
const replyToCast = async (
  parentHash: string,
  text: string,
  imageUrl?: string
) => {
  try {
    if (!SIGNER_UUID) {
      throw new Error("FARCASTER_SIGNER_UUID is not defined");
    }

    const neynarClient = getNeynarClient();

    // If we have an image URL, include it in the cast
    const embeds = imageUrl ? [{ url: imageUrl }] : [];

    // Publish the cast as a reply
    const response = await neynarClient.publishCast({
      signerUuid: SIGNER_UUID,
      text,
      embeds,
      parent: parentHash, // Use 'parent' instead of 'parentHash'
    });

    logger.info("Reply sent to Farcaster", {
      parentHash,
      replyHash: response.cast.hash,
    });

    return response.cast;
  } catch (error) {
    logger.error("Failed to reply to cast", {
      error: error instanceof Error ? error.message : String(error),
      parentHash,
    });
    throw error;
  }
};

// Format error messages to be more user-friendly
const formatErrorMessage = (error: string): string => {
  // Check for specific error patterns
  if (error.includes("Wallet connection required for lensify overlay")) {
    return "The 'lensify' overlay requires a wallet connection. Please visit https://wowowify.vercel.app/agent to use this feature directly.";
  }

  // Add more error patterns as needed

  // Default case: return the original error
  return `Error: ${error}`;
};

// Verify webhook signature
const verifyWebhookSignature = (
  signature: string | null,
  rawBody: string
): boolean => {
  if (!signature) {
    logger.error("Missing X-Neynar-Signature header");
    return false;
  }

  if (!WEBHOOK_SECRET) {
    logger.error("NEYNAR_WEBHOOK_SECRET is not defined");
    return false;
  }

  try {
    const hmac = createHmac("sha512", WEBHOOK_SECRET);
    hmac.update(rawBody);
    const generatedSignature = hmac.digest("hex");

    const isValid = generatedSignature === signature;

    if (!isValid) {
      logger.error("Invalid webhook signature", {
        receivedSignature: signature,
        generatedSignature,
      });
    }

    return isValid;
  } catch (error) {
    logger.error("Error verifying webhook signature", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

export async function POST(request: Request) {
  try {
    // Get the raw request body for signature verification
    const rawBody = await request.text();

    // Verify the webhook signature
    const signature = request.headers.get("X-Neynar-Signature");
    const isSignatureValid = verifyWebhookSignature(signature, rawBody);

    // Skip signature verification in development
    if (!isSignatureValid && process.env.NODE_ENV === "production") {
      logger.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    logger.info("Received Farcaster webhook", {
      type: payload.type,
      hash: payload.data?.hash,
    });

    // Verify this is a cast.created event
    if (payload.type !== "cast.created") {
      return NextResponse.json({
        status: "ignored",
        reason: "Not a cast.created event",
      });
    }

    const castData = payload.data;

    // Check if our bot is mentioned
    const isBotMentioned = castData.mentioned_profiles?.some(
      (profile: FarcasterProfile) => profile.fid.toString() === BOT_FID
    );

    if (!isBotMentioned) {
      return NextResponse.json({
        status: "ignored",
        reason: "Bot not mentioned",
      });
    }

    // Get the current list of allowed users
    const allowedUsers = await getAllowedUsers();

    // Check if the author is in the allowed list
    const authorFid = castData.author?.fid;
    const isAuthorAllowed = allowedUsers.includes(authorFid);

    if (!isAuthorAllowed) {
      logger.info("Ignoring request from unauthorized user", {
        authorFid,
        allowedFids: JSON.stringify(allowedUsers),
      });
      // Silently ignore - don't reply to unauthorized users
      return NextResponse.json({
        status: "ignored",
        reason: "User not authorized",
      });
    }

    // Extract the command from the cast text
    const commandText = extractCommand(castData.text);
    if (!commandText) {
      await replyToCast(
        castData.hash,
        "I didn't understand that command. Try something like '@snel lensify a mountain landscape. scale to 0.3.'"
      );
      return NextResponse.json({ status: "error", reason: "Empty command" });
    }

    logger.info("Processing Farcaster command", { commandText });

    // Parse the command using our existing parser
    const parsedCommand = parseCommand(commandText);

    try {
      // Call our existing agent API to process the command
      const response = await fetch(`${APP_URL}/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: commandText,
          parameters: parsedCommand,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agent API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.error) {
        await replyToCast(castData.hash, formatErrorMessage(result.error));
        return NextResponse.json({ status: "error", error: result.error });
      }

      // Get the best URL to share (Grove URL preferred)
      const imageUrl = result.groveUrl || result.resultUrl;

      // Reply with the result
      const overlayMode = parsedCommand.overlayMode || "generated";
      await replyToCast(
        castData.hash,
        `✨ Here's your ${overlayMode} image!`,
        imageUrl
      );

      return NextResponse.json({ status: "success", result });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error("Error calling agent API", {
        error: errorMessage,
        command: commandText,
      });

      // Format the error message to be more user-friendly
      const formattedError = formatErrorMessage(errorMessage);

      await replyToCast(castData.hash, formattedError);

      return NextResponse.json({ status: "error", error: errorMessage });
    }
  } catch (error) {
    logger.error("Error processing Farcaster webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }
}
