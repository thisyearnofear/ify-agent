// Test script for HigherBaseOriginals and HigherBaseEditions contracts
const { ethers } = require("ethers");

// Contract addresses
const ORIGINALS_CONTRACT = "0x90ab236bc818a1e650c68cf611edcdb8fe5bf8b3";
const EDITIONS_CONTRACT = "0x9166d2931f1d3f536ef9049bb6700ca4ae418f8f";

// ABIs (simplified for testing)
const ORIGINALS_ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function creators(uint256 tokenId) external view returns (address)",
  "function overlayTypes(uint256 tokenId) external view returns (uint8)",
  "function groveUrlToTokenId(string) external view returns (uint256)",
];

const EDITIONS_ABI = [
  "function editionCounts(uint256 originalId) external view returns (uint256)",
  "function uri(uint256 editionId) external view returns (string)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
];

async function testContracts() {
  try {
    // Connect to Base Sepolia
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");

    // Initialize contracts
    const originalsContract = new ethers.Contract(
      ORIGINALS_CONTRACT,
      ORIGINALS_ABI,
      provider
    );
    const editionsContract = new ethers.Contract(
      EDITIONS_CONTRACT,
      EDITIONS_ABI,
      provider
    );

    console.log("Connected to contracts:");
    console.log("- HigherBaseOriginals:", ORIGINALS_CONTRACT);
    console.log("- HigherBaseEditions:", EDITIONS_CONTRACT);

    // Test if we can read from the contracts
    try {
      // Try to get token URI for token ID 1 (if it exists)
      const tokenURI = await originalsContract.tokenURI(1).catch(() => null);
      if (tokenURI) {
        console.log("\nFound token #1:");
        console.log("- Token URI:", tokenURI);

        // Get owner and creator
        const owner = await originalsContract.ownerOf(1);
        const creator = await originalsContract.creators(1);
        const overlayType = await originalsContract.overlayTypes(1);

        console.log("- Owner:", owner);
        console.log("- Creator:", creator);
        console.log(
          "- Overlay Type:",
          ["HIGHER", "BASE", "DICKBUTTIFY"][overlayType]
        );

        // Check if there are any editions
        const editionCount = await editionsContract.editionCounts(1);
        console.log("- Edition Count:", editionCount.toString());

        if (editionCount > 0) {
          // Get the first edition URI
          const editionId = 1 * 10000 + 1; // First edition of token #1
          const editionURI = await editionsContract.uri(editionId);
          console.log("- First Edition URI:", editionURI);
        }
      } else {
        console.log("\nNo tokens minted yet.");
      }
    } catch (error) {
      console.log("\nError reading token data:", error.message);
    }

    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testContracts();
