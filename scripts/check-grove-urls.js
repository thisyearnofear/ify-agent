// Script to check if Grove URLs are being stored correctly in the HigherBaseOriginals contract
const { ethers } = require("ethers");

// Contract address
const CONTRACT_ADDRESS = "0xF90552377071C01B8922c4879eA9E20A39476998";

// ABI (simplified for testing)
const ABI = [
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function creators(uint256 tokenId) external view returns (address)",
  "function overlayTypes(uint256 tokenId) external view returns (uint8)",
  "function groveUrlToTokenId(string) external view returns (uint256)",
];

// Overlay type names
const OVERLAY_TYPES = ["HIGHER", "BASE", "DICKBUTTIFY"];

async function checkGroveUrls() {
  try {
    // Connect to Base Sepolia
    const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    console.log("Connected to HigherBaseOriginals contract:", CONTRACT_ADDRESS);

    // Check the first 10 tokens
    console.log("\nChecking tokens:");
    for (let i = 1; i <= 10; i++) {
      try {
        // Check if token exists
        const owner = await contract.ownerOf(i).catch(() => null);
        if (!owner) {
          console.log(`Token #${i}: Does not exist`);
          continue;
        }

        // Get token details
        const tokenURI = await contract.tokenURI(i);
        const creator = await contract.creators(i);
        const overlayType = await contract.overlayTypes(i);

        console.log(`\nToken #${i}:`);
        console.log(`- Owner: ${owner}`);
        console.log(`- Creator: ${creator}`);
        console.log(`- Overlay Type: ${OVERLAY_TYPES[overlayType]}`);
        console.log(`- Token URI: ${tokenURI}`);

        // Extract Grove URL from token URI
        let groveUrl = "";
        if (tokenURI) {
          const match = tokenURI.match(/^ipfs:\/\/([^\/]+)\//);
          if (match && match[1]) {
            const prefix = match[1];
            try {
              groveUrl = decodeURIComponent(
                tokenURI.replace(`ipfs://${prefix}/`, "")
              );
              console.log(`- Extracted Grove URL: ${groveUrl}`);

              // Check if this Grove URL is correctly mapped in the contract
              const tokenId = await contract.groveUrlToTokenId(groveUrl);
              console.log(`- Token ID from groveUrlToTokenId: ${tokenId}`);

              if (tokenId.toString() === i.toString()) {
                console.log(
                  "✅ Grove URL is correctly mapped to this token ID"
                );
              } else {
                console.log("❌ Grove URL is mapped to a different token ID");
              }
            } catch (error) {
              console.log(`- Error decoding URI: ${error.message}`);
            }
          } else {
            console.log(`- Could not extract Grove URL from token URI`);
          }
        }
      } catch (error) {
        console.log(`Error checking token #${i}: ${error.message}`);
      }
    }

    // Check some specific Grove URLs
    console.log("\nTesting with some sample Grove URLs:");
    const sampleUrls = [
      "https://api.grove.storage/fa20af4f32ddbf3e538012f18194ae7e09371451637063e352d9209b91cc554a",
      // Add more sample URLs if you have them
    ];

    for (const url of sampleUrls) {
      try {
        const tokenId = await contract.groveUrlToTokenId(url);
        console.log(`\nGrove URL: ${url}`);
        console.log(`- Mapped to token ID: ${tokenId}`);

        if (tokenId.toString() !== "0") {
          // Get token details
          const owner = await contract.ownerOf(tokenId);
          const tokenURI = await contract.tokenURI(tokenId);

          console.log(`- Token #${tokenId} owner: ${owner}`);
          console.log(`- Token #${tokenId} URI: ${tokenURI}`);
        } else {
          console.log("- Not mapped to any token");
        }
      } catch (error) {
        console.log(`Error checking Grove URL: ${error.message}`);
      }
    }

    console.log("\nCheck completed!");
  } catch (error) {
    console.error("Script failed:", error);
  }
}

// Run the check
checkGroveUrls();
