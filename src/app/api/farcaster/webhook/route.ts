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

// Check if a command is requesting an image generation or overlay
const isImageGenerationCommand = (command: string): boolean => {
  const lowerCommand = command.toLowerCase();

  // Check for overlay mode keywords
  const hasOverlayKeyword =
    lowerCommand.includes("degenify") ||
    lowerCommand.includes("higherify") ||
    lowerCommand.includes("scrollify") ||
    lowerCommand.includes("lensify") ||
    lowerCommand.includes("higherise") ||
    lowerCommand.includes("dickbuttify") ||
    lowerCommand.includes("nikefy") ||
    lowerCommand.includes("nounify") ||
    lowerCommand.includes("baseify") ||
    lowerCommand.includes("clankerify") ||
    lowerCommand.includes("mantleify") ||
    lowerCommand.includes("overlay");

  // Check for generation keywords
  const hasGenerationKeyword =
    lowerCommand.includes("generate") ||
    lowerCommand.includes("create") ||
    lowerCommand.includes("make") ||
    lowerCommand.includes("draw") ||
    (lowerCommand.includes("image") &&
      (lowerCommand.includes("of") || lowerCommand.includes("with")));

  // Check for image manipulation keywords
  const hasManipulationKeyword =
    lowerCommand.includes("apply to") ||
    lowerCommand.includes("add to") ||
    lowerCommand.includes("put on") ||
    lowerCommand.includes("this image");

  // Check for text commands
  const hasTextCommand =
    lowerCommand.includes("--text") ||
    lowerCommand.includes("--caption") ||
    lowerCommand.includes("--text-position") ||
    lowerCommand.includes("--text-size") ||
    lowerCommand.includes("--text-color") ||
    lowerCommand.includes("--text-style") ||
    lowerCommand.includes("--caption-position") ||
    lowerCommand.includes("--caption-size") ||
    lowerCommand.includes("--caption-color") ||
    lowerCommand.includes("--caption-style");

  // If it's just a text command with no other content, it's likely a text-only overlay
  if (hasTextCommand) {
    // Check if the command is mostly just text parameters
    const cleanedCommand = command
      .replace(/--text\s+"[^"]+"/gi, "")
      .replace(/--text\s+'[^']+'/gi, "")
      .replace(/--text\s+[^,\.\s][^,\.]+/gi, "")
      .replace(/--text-position\s+\w+/gi, "")
      .replace(/--text-size\s+\d+/gi, "")
      .replace(/--text-color\s+\w+/gi, "")
      .replace(/--text-style\s+\w+/gi, "")
      .replace(/--caption\s+"[^"]+"/gi, "")
      .replace(/--caption\s+'[^']*'/gi, "")
      .replace(/--caption\s+[^,\.\s][^,\.]+/gi, "")
      .replace(/--caption-position\s+\w+/gi, "")
      .replace(/--caption-size\s+\d+/gi, "")
      .replace(/--caption-color\s+\w+/gi, "")
      .replace(/--caption-style\s+\w+/gi, "")
      .trim();

    // If there's not much left after removing text parameters, it's a text-only command
    if (cleanedCommand.length < 10) {
      logger.info("Detected text-only command", { command, cleanedCommand });
      return true;
    }
  }

  return (
    hasOverlayKeyword ||
    hasGenerationKeyword ||
    hasManipulationKeyword ||
    hasTextCommand
  );
};

// Check if a URL is an image URL
const isImageUrl = (url: string): boolean => {
  if (!url) return false;

  // Check for common image extensions
  const hasImageExtension = /\.(png|jpg|jpeg|gif|webp)$/i.test(url);

  // Check for common image hosting domains
  const isImageHostingDomain =
    url.includes("api.grove.storage") ||
    url.includes("i.imgur.com") ||
    url.includes("cdn.warpcast.com") ||
    url.includes("ipfs.io") ||
    url.includes("arweave.net") ||
    url.includes("lens.infura-ipfs.io") ||
    url.includes("imagedelivery.net"); // Add Farcaster's image delivery domain

  return hasImageExtension || isImageHostingDomain;
};

// Extract image URL from a cast
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractImageUrlFromCast = (cast: any): string | undefined => {
  // Check if there's an image in the embeds
  if (cast.embeds && cast.embeds.length > 0) {
    for (const embed of cast.embeds) {
      // Check if the embed has metadata indicating it's an image
      if (
        embed.metadata &&
        embed.metadata.content_type &&
        embed.metadata.content_type.startsWith("image/")
      ) {
        logger.info("Found image URL in embeds with image content type", {
          imageUrl: embed.url,
          contentType: embed.metadata.content_type,
        });
        return embed.url;
      }

      // Fallback to URL check if metadata doesn't indicate image
      if (embed.url && isImageUrl(embed.url)) {
        logger.info("Found image URL in embeds", { imageUrl: embed.url });
        return embed.url;
      }
    }
  }

  // Check if parent_url is an image
  if (cast.parent_url && isImageUrl(cast.parent_url)) {
    logger.info("Found image URL in parent_url", { imageUrl: cast.parent_url });
    return cast.parent_url;
  }

  // Check for image URLs in the text (sometimes images are directly embedded)
  if (cast.text) {
    const urlMatches = cast.text.match(/https?:\/\/[^\s]+/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        if (isImageUrl(url)) {
          logger.info("Found image URL in text", { imageUrl: url });
          return url;
        }
      }
    }
  }

  return undefined;
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

    // Get the current list of allowed users with a timeout
    let allowedUsers: number[];
    try {
      // Set a timeout for getting allowed users
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Getting allowed users timed out"));
        }, 2000); // 2 second timeout
      });

      // Race the operation against the timeout
      allowedUsers = await Promise.race([getAllowedUsers(), timeoutPromise]);
    } catch (error) {
      // If there's an error getting allowed users, log it and use the default
      logger.error("Error getting allowed users, using default", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Default to just the owner
      allowedUsers = [5254]; // @papa's FID
    }

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

    // Check if this is actually an image generation command
    if (!isImageGenerationCommand(commandText)) {
      logger.info(
        "Not an image generation command, responding with help message",
        {
          command: commandText,
        }
      );

      await replyToCast(
        castData.hash,
        "Hi there! I'm Snel, a bot that can generate and modify images. Try commands like:\n\n" +
          "• '@snel higherify a mountain landscape'\n" +
          "• '@snel degenify this image' (when replying to a cast with an image)\n" +
          "• '@snel scrollify a tech background. scale to 0.5'\n\n" +
          "Powered by Venice AI & Grove"
      );

      return NextResponse.json({
        status: "success",
        reason: "Responded with help message",
      });
    }

    logger.info("Processing Farcaster command", { commandText });

    // Parse the command using our existing parser
    const parsedCommand = parseCommand(commandText);

    // Check if this is a text-only command (has text parameters but no overlay mode)
    const isTextOnlyCommand =
      parsedCommand.text &&
      !parsedCommand.overlayMode &&
      !commandText.toLowerCase().includes("generate") &&
      !commandText.toLowerCase().includes("create");

    // If it's a text-only command, ensure we use the parent image
    if (isTextOnlyCommand) {
      parsedCommand.action = "overlay";
      parsedCommand.useParentImage = true;
      logger.info("Detected text-only command in webhook handler", {
        textContent: parsedCommand.text?.content,
        textPosition: parsedCommand.text?.position,
        useParentImage: true,
      });
    }

    // Check if we need to use the parent cast's image
    let parentImageUrl: string | undefined;
    const currentCastImageUrl = extractImageUrlFromCast(castData);

    // First, check if the current cast has an image
    if (currentCastImageUrl) {
      logger.info("Found image in current cast", {
        imageUrl: currentCastImageUrl,
      });
    }

    // If useParentImage flag is set and this is a reply to another cast, check parent cast
    if (parsedCommand.useParentImage && castData.parent_hash) {
      try {
        // Initialize Neynar client
        const neynarClient = getNeynarClient();

        logger.info("Fetching parent cast to find image", {
          parentHash: castData.parent_hash,
        });

        try {
          // Use lookupCastByHashOrWarpcastUrl to get the parent cast
          const parentCastResponse =
            await neynarClient.lookupCastByHashOrWarpcastUrl({
              identifier: castData.parent_hash,
              type: "hash",
            });

          if (parentCastResponse && parentCastResponse.cast) {
            // Extract image URL from the parent cast
            parentImageUrl = extractImageUrlFromCast(parentCastResponse.cast);

            if (parentImageUrl) {
              logger.info("Found image URL in parent cast", {
                parentImageUrl,
              });
            }
          }
        } catch (error) {
          logger.error("Error fetching parent cast", {
            error: error instanceof Error ? error.message : String(error),
            parentHash: castData.parent_hash,
          });
        }

        // If we couldn't find an image in the parent cast and there's no image in the current cast
        if (!parentImageUrl && !currentCastImageUrl) {
          // Only show an error if this is not a text-only command or if it is a text-only command but we need a parent image
          if (
            !isTextOnlyCommand ||
            (isTextOnlyCommand && parsedCommand.useParentImage)
          ) {
            await replyToCast(
              castData.hash,
              "I couldn't find an image in the parent cast to apply the overlay to. Please make sure the cast you're replying to contains an image."
            );
            return NextResponse.json({
              status: "error",
              reason: "No image found in parent cast",
            });
          }
        }
      } catch (error) {
        logger.error("Error getting parent image URL", {
          error: error instanceof Error ? error.message : String(error),
          parentHash: castData.parent_hash,
        });

        await replyToCast(
          castData.hash,
          "I couldn't find an image in the parent cast. Please try again with a cast that contains an image."
        );
        return NextResponse.json({
          status: "error",
          error: "Failed to get parent image URL",
        });
      }
    } else if (parsedCommand.useParentImage && !castData.parent_hash) {
      // If useParentImage is set but this is not a reply to another cast
      if (!currentCastImageUrl) {
        await replyToCast(
          castData.hash,
          "I need a cast with an image to apply the overlay to. Please either include an image in your cast or reply to a cast that contains an image."
        );
        return NextResponse.json({
          status: "error",
          reason: "No image found in current or parent cast",
        });
      }
    }

    // Determine which image URL to use
    // Precedence: Current cast image > Parent cast image
    const imageUrlToUse = currentCastImageUrl || parentImageUrl;

    try {
      // Call our existing agent API to process the command
      const response = await fetch(`${APP_URL}/api/agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Source": "farcaster-webhook", // Add a custom header to identify the source
        },
        body: JSON.stringify({
          command: commandText,
          parameters: parsedCommand,
          parentImageUrl: imageUrlToUse, // Pass the selected image URL
          isFarcaster: true, // Flag to indicate this is a Farcaster request
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

      // Check if we have a Grove URL
      if (!result.groveUrl && imageUrl) {
        logger.warn(
          "No Grove URL returned from agent API, image may not display properly on Farcaster",
          {
            resultUrl: result.resultUrl,
            groveUrl: result.groveUrl,
          }
        );
      }

      // Reply with the result
      const overlayMode = parsedCommand.overlayMode || "generated";
      await replyToCast(
        castData.hash,
        `✨ Here's your ${overlayMode} image!\n\npowered by Venice AI & Grove`,
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
