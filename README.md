# WOWOWIFY Agent

A Next.js application that provides AI-powered image generation using the Venice AI API, with built-in rate limiting and metrics tracking. It enables image overlays with predefined styles, logos, and filters as well as enabling the user to user their own images as overlays.

## Quick Start Guide for Snel Bot

For a concise guide on how to interact with the Snel bot on Farcaster, see [SNEL_GUIDE.md](./SNEL_GUIDE.md). This guide provides:

- Simple command examples for generating images and applying overlays
- List of all available overlay types
- Proper syntax for customization options
- Common mistakes to avoid
- Troubleshooting tips

This quick reference is especially useful for other bots or agents that want to interact with Snel.

## Agent Integration

WOWOWIFY Agent can be controlled via natural language commands through its API, allowing external services to generate and manipulate images without interacting with the UI.

```bash
# Example: Generate an image with a wowowify overlay
curl -X POST https://your-app.com/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Generate an image of a mountain landscape and add the wowowify overlay"
  }'
```

The agent understands commands like:

- "Generate an image of [description]"
- "Apply the [style] overlay" (styles: degenify, higherify, wowowify, scrollify, lensify, higherise, dickbuttify, nikefy, nounify, baseify, clankerify, mantleify)
- "Position at [x], [y]"
- "Scale to [size]"
- "Set color to [color]"
- "Set opacity to [value]"
- "Add text [content]"
- "Text position [position]"
- "Text size [size]"
- "Text color [color]"
- "Text style [style]"

### Text Commands

To add text to images, use the following command syntax:

```
Generate a beach sunset --text "Summer Vibes" --text-position bottom --text-size 48 --text-color blue
```

The text commands use a clear, flag-based syntax that's easy to understand:

- `--text "Your text here"` - Adds text to the image
- `--text-position [position]` - Sets the position (top, bottom, left, right, center, etc.)
- `--text-size [size]` - Sets the font size
- `--text-color [color]` - Sets the text color
- `--text-style [style]` - Sets the text style (serif, monospace, handwriting, thin, bold)

You can also use `--caption` as an alternative to `--text`:

```
Generate a mountain landscape --caption "Adventure Awaits" --caption-position bottom --caption-size 60
```

This flag-based approach ensures that text parameters are clearly separated from other commands and won't be misinterpreted.

### Text Overlay System

The text overlay system provides robust text rendering capabilities with the following features:

#### Font Support

- **Default Font**: Roboto (sans-serif)
- **Font Families**:
  - Sans-serif: Roboto (default)
  - Serif: System serif font
  - Monospace: Roboto Mono
  - Handwriting: Fallback to Roboto with stylistic adjustments

#### Text Positioning

- **Predefined Positions**:
  - `top`: Aligns text at the top center of the image
  - `bottom`: Aligns text at the bottom center of the image
  - `center`: Centers text both horizontally and vertically
  - `left`: Aligns text at the left center of the image
  - `right`: Aligns text at the right center of the image
  - `top-left`: Positions text at the top left corner
  - `top-right`: Positions text at the top right corner
  - `bottom-left`: Positions text at the bottom left corner
  - `bottom-right`: Positions text at the bottom right corner
- **Custom Positioning**: Supports exact x,y coordinates for precise placement

#### Text Styling

- **Font Size**: Any numeric value (default: 48px)
- **Font Weight**: normal or bold
- **Text Color**: Any valid color name or hex code
- **Text Alignment**: left, center, or right
- **Background**: Optional colored background behind text
- **Padding**: Adjustable padding around text
- **Line Height**: Configurable line spacing for multi-line text
- **Text Wrapping**: Automatic wrapping for long text to fit within image boundaries
- **Rotation**: Optional text rotation in degrees

#### Advanced Text Effects

- **Stroke/Outline**: Add outlines to text for better visibility
- **Shadow Effects**: Add drop shadows with configurable:
  - Shadow color
  - Shadow offset (X and Y)
  - Shadow blur radius
- **Adaptive Sizing**: Automatically adjusts font size to fit available space

#### Implementation Details

- **Font Registration**: Fonts are bundled with the application and registered at runtime
- **Serverless Compatibility**: Optimized for Vercel serverless environment
- **Error Handling**: Graceful fallbacks if specific fonts aren't available
- **Performance**: Efficient text rendering even with complex styling

### Structured Command Format

For more complex commands, you can still use a structured format with section markers, but the flag-based syntax is recommended for text parameters:

```
[PROMPT]: beach sunset
[OVERLAY]: scrollify, scale 0.5, position 10 20
--text "Summer Vibes" --text-position bottom --text-size 48 --text-color blue
```

Alternative formats are also supported:

```
PROMPT: beach sunset
OVERLAY: scrollify, scale 0.5, position 10 20
--text "Summer Vibes" --text-position bottom --text-size 48 --text-color blue
```

Or even more concise:

```
beach sunset.
WOWOW: scrollify, scale 0.5, opacity 0.4.
--caption "stunning" --caption-position bottom --caption-style handwriting
```

This structured approach helps avoid confusion between different parts of the command and ensures that text parameters aren't misinterpreted.

### Text Customization Options

When adding text to images, you can customize:

- **Position**: top, bottom, left, right, center, top-left, top-right, bottom-left, bottom-right
- **Size**: Any numeric value (e.g., size 48)
- **Color**: Any color name or hex code (e.g., color blue, color #FF5500)
- **Style**: serif, monospace, handwriting, thin, bold
- **Background**: Optional background color with transparency (e.g., rgba(0,0,0,0.5))
- **Effects**: Stroke/outline and shadow effects for better visibility

Example:

```
[PROMPT]: mountain landscape
[TEXT]: Adventure Awaits, bottom, size 60, color white, style bold
```

You can also provide structured parameters to override NLP extraction:

```json
{
  "command": "Generate a futuristic city",
  "parameters": {
    "overlayMode": "degenify",
    "controls": {
      "scale": 1.2,
      "x": 0,
      "y": 0,
      "overlayColor": "#ffffff",
      "overlayAlpha": 0.8
    },
    "text": {
      "content": "FUTURE CITY",
      "position": "bottom",
      "fontSize": 48,
      "color": "white",
      "style": "bold",
      "backgroundColor": "rgba(0,0,0,0.5)"
    }
  }
}
```

### Text Overlay Examples

Here are some examples of text overlay commands:

1. **Simple Caption**:

   ```
   Generate a beach sunset --text "Summer Vibes"
   ```

2. **Positioned Text**:

   ```
   Generate a mountain landscape --text "ADVENTURE" --text-position top
   ```

3. **Styled Text**:

   ```
   Generate a cityscape --text "METROPOLIS" --text-position bottom --text-size 72 --text-color white --text-style bold
   ```

4. **Text with Background**:

   ```
   Generate a forest scene --text "NATURE" --text-position center --text-color white --text-background-color "rgba(0,0,0,0.7)"
   ```

5. **Multiple Text Elements** (using structured format):
   ```json
   {
     "command": "Generate a beach scene",
     "parameters": {
       "text": {
         "content": "PARADISE",
         "position": "top",
         "fontSize": 60,
         "color": "white"
       },
       "secondaryText": {
         "content": "Summer 2024",
         "position": "bottom-right",
         "fontSize": 24,
         "color": "white",
         "style": "italic"
       }
     }
   }
   ```

## Features

- 🎨 AI Image Generation using Venice AI
- 🖼️ Image Overlay System with multiple modes:
  - Lensify: Add lens-style overlays with Web3 storage via Grove
- 🎭 Custom image upload for both base images and overlays
- 🎛️ Advanced image controls:
  - Positioning (X/Y coordinates)
  - Scaling
  - Color filters
  - Opacity/transparency
- 💬 Text Overlay System:
  - Multiple font styles and families
  - Positioning and alignment options
  - Size, color, and style customization
  - Background, stroke, and shadow effects
- 💾 One-click download of combined images
- 🔒 Rate limiting with Redis
- 📊 Request metrics tracking
- 🚦 Error handling and timeout management
- 🔄 Automatic retries for Redis operations
- 📝 Comprehensive logging
- 🌳 Web3 storage integration with Grove (for Lensify overlay)
- 🪙 NFT minting on multiple chains:
  - Mantle Sepolia for mantleify images
  - Base Sepolia for higherify and baseify images

## Environment Setup

The application requires the following environment variables:

```bash
VENICE_API_KEY=your_venice_api_key
REDIS_URL=your_redis_url
```

You can obtain these from:

- Venice AI API key: [Venice AI Dashboard](https://venice.ai)
- Redis URL: [Upstash Redis](https://upstash.com)

## Getting Started

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your environment variables
4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Endpoints

### POST /api/generate

Generate an AI image with the following parameters:

```json
{
  "prompt": "your image description",
  "model": "stable-diffusion-3.5" | "fluently-xl",
  "hide_watermark": boolean
}
```

Rate limits:

- 20 requests per hour per IP
- Response headers include rate limit information

### POST /api/agent

Process natural language commands to generate and manipulate images:

```json
{
  "command": "your natural language command",
  "parameters": {
    "baseImageUrl": "optional URL to an existing image",
    "prompt": "optional prompt to override NLP extraction",
    "overlayMode": "degenify" | "higherify" | "wowowify" | "scrollify" | "lensify" | "higherise" | "dickbuttify" | "nikefy" | "nounify" | "baseify" | "clankerify" | "mantleify",
    "controls": {
      "scale": 1.2,
      "x": 0,
      "y": 0,
      "overlayColor": "#ffffff",
      "overlayAlpha": 0.8
    }
  },
  "callbackUrl": "optional URL for async processing"
}
```

Response:

```json
{
  "id": "unique_request_id",
  "status": "processing" | "completed" | "failed",
  "resultUrl": "URL to the processed image",
  "previewUrl": "URL to a preview of the processed image",
  "error": "Error message if status is failed",
  "groveUri": "Optional Grove URI for lensify overlay",
  "groveUrl": "Optional Grove URL for lensify overlay"
}
```

Rate limits:

- 20 requests per hour per IP
- Response headers include rate limit information

## Deployment

The application is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Deployment Considerations

When deploying to Vercel or other serverless environments, keep these important points in mind:

1. **Serverless Function Timeouts**:

   - Vercel functions have a default timeout of 10 seconds (Hobby plan) or 60 seconds (Pro plan)
   - Our application implements its own timeout handling to prevent hanging requests
   - If you experience timeouts, consider upgrading to a Pro plan

2. **Memory Storage**:

   - Images are stored in memory rather than the filesystem in production
   - This is because serverless functions have ephemeral filesystems
   - Images are automatically cleaned up to prevent memory leaks
   - Users should download images they want to keep

3. **Error Handling**:

   - The application implements robust error handling for API responses
   - Frontend code checks content types before parsing JSON
   - Detailed error messages are provided to help diagnose issues

4. **Architecture Notes**:

   - The agent route directly calls the Venice API to reduce API hops
   - Overlay images are loaded from public URLs rather than the filesystem
   - All image processing happens within a single serverless function

5. **Troubleshooting**:
   - If you see "Unexpected token" errors, it's likely a JSON parsing issue
   - Check that all API responses are properly formatted as JSON
   - Ensure timeouts are properly handled with AbortController
   - Verify that all environment variables are correctly set in Vercel

## Grove Integration

The application integrates with Grove, a secure, flexible, onchain-controlled storage layer for Web3 apps. When using the "lensify" overlay, the generated image is stored both in memory and on Grove.

### How it works

1. When a user requests an image with the "lensify" overlay, the application processes the image as usual.
2. After processing, the image is stored in memory like other overlays.
3. Additionally, the image is uploaded to Grove using the `@lens-chain/storage-client` library.
4. The response includes both the standard image URLs and Grove-specific URIs and URLs.
5. The UI displays Grove information when available, allowing users to access their images through Grove.

### Benefits

- **Persistent Storage**: Unlike in-memory storage, Grove provides more persistent storage for images.
- **Web3 Integration**: Images stored on Grove can be referenced in Web3 applications.
- **Access Control**: Grove supports various access control mechanisms for uploaded content.

## Mantle NFT Integration

The application includes NFT minting functionality on the Mantle Sepolia testnet, allowing users to mint their generated images as NFTs.

### How It Works

1. When a user generates an image with the "mantleify" overlay, they can mint it as an NFT directly from the UI.
2. The minting process uses a smart contract deployed on the Mantle Sepolia testnet.
3. The NFT metadata includes a reference to the Grove URL, ensuring the image is permanently stored.
4. Users can view their minted NFTs in the gallery section of the admin page.

### Smart Contract Details

- **Contract Address**: `0x8b62d610c83c42ea8a8fc10f80581d9b7701cd37` (Mantle Sepolia Testnet)
- **Contract Name**: MantleifyNFT
- **Token Standard**: ERC-721
- **Token Symbol**: MANTLE

The contract includes the following key functions:

```solidity
// Mint a new NFT with the given Grove URL and metadata
function mintNFT(
    address to,
    address creator,
    string calldata groveUrl,
    string calldata tokenURI
) external returns (uint256)

// Check if a Grove URL has already been minted
function isGroveUrlMinted(string calldata groveUrl) public view returns (bool)

// Get the token ID for a Grove URL
function getTokenIdByGroveUrl(string calldata groveUrl) external view returns (uint256)
```

### Minting Process

1. User generates an image with the "mantleify" overlay
2. The image is stored on Grove for permanent storage
3. User connects their wallet to the Mantle Sepolia network
4. User clicks the "Mint as NFT" button
5. The application prepares the transaction with:
   - Recipient address (user's wallet)
   - Creator address (user's wallet)
   - Grove URL (for image reference)
   - Token URI (metadata including the Grove URL)
6. The transaction is sent to the Mantle Sepolia network
7. Once confirmed, the NFT appears in the user's wallet and in the gallery

### Viewing Minted NFTs

Minted NFTs can be viewed in several ways:

1. **Gallery View**: The admin page includes a gallery of all minted NFTs
2. **Mantle Explorer**: Each NFT includes a link to view the transaction on Mantle Explorer
3. **Wallet**: NFTs appear in the user's wallet if it supports ERC-721 tokens on Mantle Sepolia

### Testing Mantle Integration

To test the Mantle NFT integration:

1. Connect your wallet to the Mantle Sepolia network
2. Get some test MNT from the [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz/)
3. Generate an image with the "mantleify" overlay
4. Click the "Mint as NFT" button
5. Confirm the transaction in your wallet
6. View your NFT in the gallery or on Mantle Explorer

## Base NFT Integration

The application now includes an upgraded NFT system on Base Sepolia testnet that separates originals and editions into two contracts:

### HigherBaseOriginals Contract

This contract handles the minting of original NFTs for images created with our overlay system.

- **Contract Address**: `0xF90552377071C01B8922c4879eA9E20A39476998` (Base Sepolia Testnet)
- **Contract Name**: HigherBaseOriginals
- **Token Standard**: ERC-721
- **Token Symbol**: HBO
- **Minting Price**: 0.05 ETH (testnet ETH)
- **Supported Overlays**: Higher, Base, Dickbuttify

The contract includes the following key functions:

```solidity
// Mint a new original NFT with the given Grove URL and metadata
function mintOriginalNFT(
    address to,
    address creator,
    string calldata groveUrl,
    string calldata tokenURI,
    OverlayType overlayType
) external payable returns (uint256)

// Check if a Grove URL has already been minted
function isGroveUrlMinted(string calldata groveUrl) public view returns (bool)
```

### HigherBaseEditions Contract

This companion contract allows users to mint editions of original NFTs. This functionality is not directly accessible from our main app but is available through a separate interface.

- **Contract Address**: `0x6A0E6D188cFca3FdCcB7b68352B849b133eD74C9` (Base Sepolia Testnet)
- **Contract Name**: HigherBaseEditions
- **Token Standard**: ERC-1155
- **Edition Price**: 0.01 ETH (testnet ETH)
- **Maximum Editions**: 100 per original

The contract includes the following key functions:

```solidity
// Mint an edition of an original NFT
function mintEdition(uint256 originalId) external payable returns (uint256)

// Get the URI for an edition
function uri(uint256 editionId) public view returns (string memory)
```

### How It Works

1. Users can mint original NFTs directly from our app after creating images with supported overlays
2. Each original costs 0.05 testnet ETH to mint
3. The original NFTs are stored on the HigherBaseOriginals contract
4. Editions of these originals can be minted through a separate interface using the HigherBaseEditions contract
5. Each edition costs 0.01 testnet ETH to mint
6. Editions reference the original NFT's metadata with an edition number appended

## Farcaster Integration

### Farcaster Bot

The bot can process commands when mentioned in a Farcaster cast. It works in two ways:

#### Generating New Images with Overlays

- `@snel Generate a mountain landscape` - Generates a new image with the default overlay (Stable Diffusion)
- `@snel degenify a futuristic city. scale to 0.5` - Generates an image with the degenify overlay
- `@snel higherify a beach sunset. opacity to 0.7` - Generates an image with the higherify overlay
- `@snel scrollify a minimalist tech background. color to blue` - Generates an image with the scrollify overlay
- `@snel lensify a professional portrait. scale to 0.4` - Generates an image with the lensify overlay
- `@snel higherise a cityscape. scale to 0.6` - Generates an image with the higherise overlay
- `@snel dickbuttify a meme template. position at 10, 20` - Generates an image with the dickbuttify overlay
- `@snel nikefy a sports scene. opacity to 0.8` - Generates an image with the nikefy overlay
- `@snel nounify a cartoon character. scale to 0.5` - Generates an image with the nounify overlay
- `@snel baseify a crypto-themed image. color to blue` - Generates an image with the baseify overlay
- `@snel clankerify a robot scene. scale to 0.7` - Generates an image with the clankerify overlay
- `@snel mantleify a blockchain visualization. scale to 0.5` - Generates an image with the mantleify overlay

#### Applying Overlays to Existing Images

When replying to a cast with an image:

- `@snel degenify this image` - Applies the degenify overlay to the image in the parent cast
- `@snel higherify this. scale to 0.3` - Applies the higherify overlay with scaling
- `@snel scrollify. position at 10, 20` - Applies the scrollify overlay with positioning
- `@snel lensify this photo. opacity to 0.5` - Applies the lensify overlay with opacity adjustment
- `@snel overlay with degenify. color to red` - Applies the degenify overlay with color adjustment
- `@snel higherise this` - Applies the higherise overlay to the parent image
- `@snel dickbuttify this photo` - Applies the dickbuttify overlay to the parent image
- `@snel nikefy. scale to 0.4` - Applies the nikefy overlay with scaling
- `@snel nounify this. position at 20, 30` - Applies the nounify overlay with positioning
- `@snel baseify this image. opacity to 0.6` - Applies the baseify overlay with opacity adjustment
- `@snel clankerify. color to green` - Applies the clankerify overlay with color adjustment
- `@snel mantleify this image. scale to 0.4` - Applies the mantleify overlay with scaling

The bot is smart enough to understand that when you reply to a cast and use phrases like "this image", "this photo", or simply specify an overlay mode, you want to apply the overlay to the image in the parent cast.

### Customization Options

All overlays can be customized with the following parameters:

- **Scale**: `scale to 0.5` - Adjusts the size of the overlay (0.1 to 2.0)
- **Position**: `position at 10, 20` - Sets the X,Y coordinates of the overlay
- **Color**: `color to red` - Changes the color filter of the overlay
- **Opacity**: `opacity to 0.7` - Adjusts the transparency of the overlay (0.0 to 1.0)

### Storage

All images generated by the bot are stored on Grove for persistence, ensuring that they remain accessible even after the temporary URLs expire. The bot always replies with the Grove URL when available, providing a reliable link to the generated image.

When an image is generated or processed:

1. The image is first stored temporarily in memory
2. It is then uploaded to Grove, a decentralized storage solution
3. The Grove URL is included in the bot's reply
4. This URL is permanent and can be accessed indefinitely

This approach ensures that your images remain accessible long after the interaction with the bot, making it ideal for sharing and referencing images in the future.

### Setup

1. Create a Neynar account at [neynar.com](https://neynar.com) and get an API key
2. Create a Farcaster bot and get a signer UUID
3. Configure environment variables in your deployment:
   ```
   NEYNAR_API_KEY=your_neynar_api_key
   FARCASTER_SIGNER_UUID=your_farcaster_signer_uuid
   FARCASTER_BOT_FID=your_bot_fid
   NEXT_PUBLIC_APP_URL=https://your-app-url.com
   NEYNAR_WEBHOOK_SECRET=your_webhook_secret
   ```
4. Set up a webhook in the Neynar dashboard:
   - Event: `cast.created`
   - Filter: `mentioned_fids` = your bot's FID
   - Target URL: `https://your-app-url.com/api/farcaster/webhook`

### Access Control

By default, the bot is configured to respond only to authorized users. This is managed through a Redis-based allowed users list, which can be updated via the admin API. This ensures that the bot's resources are used only by approved users during testing and early deployment phases.

#### Managing the Allowlist

The allowlist is a list of Farcaster FIDs (Farcaster IDs) that are authorized to use the bot. You can manage this list using the admin API:

1. **View the current allowlist**:

   ```bash
   curl "https://your-app-url.com/api/farcaster/allowed-users?apiKey=YOUR_ADMIN_API_KEY"
   ```

2. **Add users to the allowlist**:

   ```bash
   curl -X POST "https://your-app-url.com/api/farcaster/allowed-users?apiKey=YOUR_ADMIN_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"users": [5254, 8685, 323496, 7316, 898337]}'
   ```

   This will replace the existing allowlist with the new list of FIDs. Make sure to include all existing FIDs you want to keep, plus any new ones.

3. **Find a user's FID**:
   - You can find a user's FID by visiting their Warpcast profile and looking at the URL: `https://warpcast.com/username`
   - Or by using the Neynar API: `curl -H "api_key: YOUR_NEYNAR_API_KEY" "https://api.neynar.com/v2/farcaster/user/search?q=username"`

The `ADMIN_API_KEY` is set as an environment variable in your deployment. Make sure to keep this key secure and only share it with trusted administrators.

### Testing

You can test the webhook locally using the provided test script:

```bash
WEBHOOK_URL=http://localhost:3000/api/farcaster/webhook \
FARCASTER_BOT_FID=123456 \
COMMAND="lensify a mountain landscape" \
node scripts/test-farcaster-webhook.js
```

To test the image overlay functionality specifically, you can use:

```bash
WEBHOOK_URL=http://localhost:3000/api/farcaster/webhook \
FARCASTER_BOT_FID=123456 \
COMMAND="degenify this image" \
node scripts/test-farcaster-webhook.js
```

### Farcaster Frames

The application now supports Farcaster Frames, allowing users to interact with the image overlay tool directly within Farcaster clients. This provides a seamless experience for users to:

- wowowifys with overlays without leaving Farcaster
- Connect their wallet for additional functionality
- Access the full application with a single tap

#### Using the Frame

1. Visit the frame URL: `https://wowowifyer.vercel.app/frames`
2. The frame will appear in Farcaster clients with a button to open the interactive interface
3. Once opened, you can:
   - Select an overlay mode
   - Enter a prompt for image generation
   - wowowifys directly within the frame
   - Connect your wallet for additional functionality
   - Open the full application if needed

#### Frame Development

The frame is built using:

- `@farcaster/frame-sdk` - Official Farcaster Frame SDK
- `@farcaster/frame-wagmi-connector` - Wallet connector for Farcaster Frames
- `wagmi` and `viem` - For wallet interactions

The frame implementation follows the Farcaster Frames v2 specification, providing a rich interactive experience within Farcaster clients.

## Scroll NFT Integration

The application includes NFT minting functionality on the Scroll Sepolia testnet, allowing users to mint images created with the "scrollify" overlay as NFTs.

### How It Works

1. When a user generates an image with the "scrollify" overlay, they can mint it as an NFT directly from the UI.
2. The minting process uses a smart contract deployed on the Scroll Sepolia testnet.
3. The NFT metadata includes a reference to the Grove URL, ensuring the image is permanently stored.
4. Users can view their minted NFTs in the gallery section of the admin page.

### Smart Contract Details

- **Contract Address**: `0xf230170c3afd6bea32ab0d7747c04a831bf24968` (Scroll Sepolia Testnet)
- **Contract Name**: Scrollify Originals
- **Token Standard**: ERC-721
- **Token Symbol**: SCROLL-O
- **Minting Price**: 0.01 ETH (testnet ETH)

The contract includes the following key functions:

```solidity
// Mint a new original NFT with the given token URI
function mintOriginal(string calldata _tokenURI) external payable

// Get the token URI for a token ID
function tokenURI(uint256 tokenId) public view returns (string memory)

// Get the creator of a token
function creators(uint256 tokenId) public view returns (address)

// Get the total supply of tokens
function totalSupply() external view returns (uint256)

// Get the mint price
function MINT_PRICE() external view returns (uint256)
```

### Minting Process

1. User generates an image with the "scrollify" overlay
2. The image is stored on Grove for permanent storage
3. User connects their wallet to the Scroll Sepolia network
4. User clicks the "Mint Scrollify NFT" button
5. The application prepares the transaction with:
   - Recipient address (user's wallet)
   - Creator address (user's wallet)
   - Grove URL (for image reference)
   - Token URI (metadata including the Grove URL)
6. The transaction is sent to the Scroll Sepolia network
7. Once confirmed, the NFT appears in the user's wallet and in the gallery

### Viewing Minted NFTs

Minted NFTs can be viewed in several ways:

1. **Gallery View**: The admin page includes a gallery of all minted Scrollify NFTs
2. **Scroll Explorer**: Each NFT includes a link to view the transaction on Scroll Explorer
3. **Wallet**: NFTs appear in the user's wallet if it supports ERC-721 tokens on Scroll Sepolia

### Testing Scroll Integration

To test the Scroll NFT integration:

1. Connect your wallet to the Scroll Sepolia network
2. Get some test ETH from the [Scroll Sepolia Faucet](https://sepolia-faucet.scroll.io/)
3. Generate an image with the "scrollify" overlay
4. Click the "Mint Scrollify NFT" button
5. Confirm the transaction in your wallet
6. View your NFT in the gallery or on Scroll Explorer

## Ghibli Style Integration

The application now includes a Ghibli-style transformation feature powered by the Replicate API. This allows users to transform their images into a Studio Ghibli-inspired art style.

### How It Works

1. When a user requests an image with the "ghiblify" overlay, the application sends the image to the Replicate API
2. The API processes the image using a pre-trained model that applies the Ghibli art style
3. The transformed image is then stored on Grove (if a wallet address is provided)
4. The result is returned to the user with both the direct URL and Grove URL (if available)

### Using Ghiblify

You can use the ghiblify feature in several ways:

1. **Through the Farcaster Bot**:

   ```
   @snel ghiblify this image
   ```

   When replying to a cast with an image, or:

   ```
   @snel ghiblify a mountain landscape
   ```

   To generate and transform a new image

2. **Through the API**:
   ```json
   {
     "command": "ghiblify this image",
     "parameters": {
       "baseImageUrl": "https://example.com/image.jpg",
       "overlayMode": "ghiblify"
     }
   }
   ```

### Setup

1. Get a Replicate API token from [replicate.com](https://replicate.com)
2. Add the token to your environment variables:
   ```bash
   REPLICATE_API_TOKEN=your_replicate_api_token
   ```

### Technical Details

The ghiblify feature uses the following Replicate model:

- Model: `grabielairu/ghibli`
- Version: `4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253`

The model is optimized for:

- Landscapes and nature scenes
- Character illustrations
- Architectural scenes
- General artwork transformation

## Technologies Used

- [Next.js 15](https://nextjs.org/)
- [Redis](https://redis.io/) via [ioredis](https://github.com/redis/ioredis)
- [Venice AI API](https://venice.ai)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Canvas](https://www.npmjs.com/package/canvas) for image processing
- [Grove](https://grove.storage) for Web3 storage

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs)
- [Venice AI Documentation](https://docs.venice.ai)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Grove Documentation](https://docs.grove.storage)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
