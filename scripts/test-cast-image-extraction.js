// Test script for extracting images from Farcaster casts
require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");
const { NeynarAPIClient } = require("@neynar/nodejs-sdk");

// Check if .env.local exists, otherwise try .env
if (
  !fs.existsSync(path.join(process.cwd(), ".env.local")) &&
  fs.existsSync(path.join(process.cwd(), ".env"))
) {
  require("dotenv").config({ path: ".env" });
}

// Initialize Neynar client
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
if (!NEYNAR_API_KEY) {
  console.error(
    "Error: NEYNAR_API_KEY is not defined in environment variables"
  );
  process.exit(1);
}

const client = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });

// Function to check if a URL is an image URL
function isImageUrl(url) {
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
    url.includes("imagedelivery.net");

  return hasImageExtension || isImageHostingDomain;
}

// Function to extract image URL from a cast
function extractImageUrlFromCast(cast) {
  console.log("Analyzing cast structure:");
  console.log(JSON.stringify(cast, null, 2));

  // Check if there's an image in the embeds
  if (cast.embeds && cast.embeds.length > 0) {
    console.log("Found embeds:", JSON.stringify(cast.embeds, null, 2));

    for (const embed of cast.embeds) {
      if (embed.url && isImageUrl(embed.url)) {
        console.log("Found image URL in embeds:", embed.url);
        return embed.url;
      }
    }
  }

  // Check if parent_url is an image
  if (cast.parent_url && isImageUrl(cast.parent_url)) {
    console.log("Found image URL in parent_url:", cast.parent_url);
    return cast.parent_url;
  }

  // Check for image URLs in the text (sometimes images are directly embedded)
  if (cast.text) {
    const urlMatches = cast.text.match(/https?:\/\/[^\s]+/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        if (isImageUrl(url)) {
          console.log("Found image URL in text:", url);
          return url;
        }
      }
    }
  }

  console.log("No image URL found in cast");
  return undefined;
}

// Main function to test image extraction
async function testImageExtraction() {
  try {
    // Get cast hash from command line or use default
    const castHash =
      process.argv[2] || "0x3382bad3651556c61c127c7577009843286374c0";
    console.log(`Fetching cast with hash: ${castHash}`);

    // Fetch the cast using Neynar API
    const response = await client.lookupCastByHashOrWarpcastUrl({
      identifier: castHash,
      type: "hash",
    });

    console.log("Cast fetched successfully");

    // Extract image URL from the cast
    const imageUrl = extractImageUrlFromCast(response.cast);

    if (imageUrl) {
      console.log("\nSUCCESS: Image URL extracted successfully");
      console.log("Image URL:", imageUrl);
    } else {
      console.log("\nFAILURE: No image URL found in the cast");
    }
  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
  }
}

// Run the test
testImageExtraction();
