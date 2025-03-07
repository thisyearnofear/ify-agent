/**
 * Test script to simulate a Farcaster webhook event
 *
 * Usage:
 * WEBHOOK_URL=http://localhost:3000/api/farcaster/webhook \
 * FARCASTER_BOT_FID=123456 \
 * COMMAND="lensify a mountain landscape" \
 * node scripts/test-farcaster-webhook.js
 */

// Import fetch properly for Node.js
const { default: fetch } = require("node-fetch");

// Configuration
const WEBHOOK_URL =
  process.env.WEBHOOK_URL || "http://localhost:3000/api/farcaster/webhook";
const BOT_FID = process.env.FARCASTER_BOT_FID || "123456";
const COMMAND =
  process.env.COMMAND || "lensify a mountain landscape. scale to 0.3.";

console.log("=== Farcaster Webhook Test ===");
console.log(
  "This script simulates a Farcaster webhook event when someone mentions your bot."
);
console.log("");
console.log("Configuration:");
console.log(`- Webhook URL: ${WEBHOOK_URL}`);
console.log(`- Bot FID: ${BOT_FID}`);
console.log(`- Command: ${COMMAND}`);
console.log("");
console.log("Sending webhook event...");

// Create a mock webhook payload
const mockWebhookPayload = {
  created_at: Math.floor(Date.now() / 1000),
  type: "cast.created",
  data: {
    object: "cast",
    hash: "0x" + Math.random().toString(16).substring(2, 34),
    thread_hash: "0x" + Math.random().toString(16).substring(2, 34),
    parent_hash: null,
    parent_url: null,
    root_parent_url: null,
    parent_author: {
      fid: null,
    },
    author: {
      object: "user",
      fid: 234506,
      custody_address: "0x3ee6076e78c6413c8a3e1f073db01f87b63923b0",
      username: "testuser",
      display_name: "Test User",
      pfp_url: "https://i.imgur.com/U7ce6gU.jpg",
      profile: {},
      follower_count: 65,
      following_count: 110,
      verifications: ["0x8c16c47095a003b726ce8deffc39ee9cb1b9f124"],
      active_status: "active",
    },
    text: `@snel ${COMMAND}`,
    timestamp: new Date().toISOString(),
    embeds: [],
    reactions: {
      likes: [],
      recasts: [],
    },
    replies: {
      count: 0,
    },
    mentioned_profiles: [
      {
        fid: parseInt(BOT_FID, 10),
        username: "snel",
        display_name: "Snel",
        pfp_url: "",
      },
    ],
  },
};

// Send the mock webhook event
async function sendMockWebhook() {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockWebhookPayload),
    });

    const data = await response.json();

    console.log("");
    console.log("Response:");
    console.log(`- Status: ${response.status} ${response.statusText}`);
    console.log(`- Data: ${JSON.stringify(data, null, 2)}`);

    if (data.status === "success") {
      console.log("");
      console.log("Success! The webhook processed the command.");
      console.log(
        "If everything is set up correctly, your bot should reply to the cast with the generated image."
      );
    } else if (data.status === "error") {
      console.log("");
      console.log(
        "Error: The webhook encountered an error processing the command."
      );
      console.log(
        `Error message: ${data.error || data.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("");
    console.error("Failed to send webhook:");
    console.error(error);
  }
}

// Execute
sendMockWebhook();
