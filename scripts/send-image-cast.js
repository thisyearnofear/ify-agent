/**
 * Script to send an introductory cast for the @snel bot with an embedded image
 *
 * Usage:
 * node scripts/send-intro-cast.js
 */

const { NeynarAPIClient } = require("@neynar/nodejs-sdk");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
  console.log("Loaded environment variables from .env.local");
} else {
  console.warn("Warning: .env.local file not found");
  // Try loading from .env as fallback
  dotenv.config();
}

// Configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.FARCASTER_SIGNER_UUID;

if (!NEYNAR_API_KEY || !SIGNER_UUID) {
  console.error(
    "Error: NEYNAR_API_KEY and FARCASTER_SIGNER_UUID must be set in .env.local"
  );
  console.error("Current values:");
  console.error("NEYNAR_API_KEY:", NEYNAR_API_KEY ? "Set" : "Not set");
  console.error("FARCASTER_SIGNER_UUID:", SIGNER_UUID ? "Set" : "Not set");
  process.exit(1);
}

// Initialize Neynar client
const neynarClient = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });

// Image URL from Grove
const imageUrl =
  "https://api.grove.storage/40f0072d36e7f3547d7c0394a3322407da5ddacdebfba4246483aafdffe3d0c8";

// Introductory cast text
const introCast = `Hey @toka - what do you see? 🐌`;

// Send the cast with embedded image
async function sendIntroCast() {
  try {
    console.log("Sending introductory cast with embedded image...");

    const response = await neynarClient.publishCast({
      signerUuid: SIGNER_UUID,
      text: introCast,
      embeds: [
        {
          url: imageUrl,
        },
      ],
    });

    console.log("Cast sent successfully!");
    console.log("Cast hash:", response.cast.hash);
    console.log(
      "Cast URL:",
      `https://warpcast.com/${
        response.cast.author.username
      }/${response.cast.hash.slice(0, 10)}`
    );
  } catch (error) {
    console.error("Error sending cast:", error);
    if (error.response && error.response.data) {
      console.error(
        "Error details:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
  }
}

// Execute
sendIntroCast();
