"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { Web3Provider } from "@/components/Web3Provider";
import WalletConnect from "@/components/WalletConnect";
import { useAccount } from "wagmi";
import MintMantleifyButton from "@/components/MintMantleifyButton";
import MintBaseNFTButton from "@/components/MintBaseNFTButton";
import MintScrollifyNFTButton from "@/components/MintScrollifyNFTButton";

// Loading indicator component
const LoadingIndicator = () => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
      <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
    </div>
    <div className="mt-4 text-center">
      <p className="text-gray-700 font-medium">wowow in progress...</p>
      <p className="text-gray-500 text-sm mt-1">This may take a few moments</p>
    </div>
  </div>
);

interface ParsedCommand {
  action: string;
  prompt?: string;
  overlayMode?: string;
  controls?: {
    scale?: number;
    x?: number;
    y?: number;
    overlayColor?: string;
    overlayAlpha?: number;
  };
  text?: {
    content: string;
    position?: string;
    fontSize?: number;
    color?: string;
    style?: string;
  };
}

interface CommandResult {
  id: string;
  status: string;
  resultUrl?: string;
  previewUrl?: string;
  error?: string;
  groveUri?: string;
  groveUrl?: string;
}

// Main component wrapped with Web3Provider
function AgentContent() {
  const [command, setCommand] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(
    null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { isConnected } = useAccount();

  // Check if URL has a command parameter
  useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cmdParam = params.get("cmd");
      if (cmdParam) {
        setCommand(decodeURIComponent(cmdParam));
      }
    }
  });

  // Function to proxy image URLs if needed
  const getProxiedUrl = (url: string): string => {
    // If it's an IPFS URL, proxy it
    if (url.startsWith("https://ipfs.io/ipfs/")) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Function to get the best available image URL
  const getBestImageUrl = (result: CommandResult): string => {
    // Prefer Grove URL if available as it's more reliable
    if (result.groveUrl) {
      return result.groveUrl;
    }
    // Fall back to the result URL
    return result.resultUrl || "";
  };

  // Check if the command is a mantleify command
  const isMantleifyCommand = (cmd: string): boolean => {
    return cmd.toLowerCase().includes("mantleify");
  };

  // Check if the command is a scrollify command
  const isScrollifyCommand = (cmd: string): boolean => {
    return cmd.toLowerCase().includes("scrollify");
  };

  // Check if the command is using one of the Base NFT overlays
  const getBaseOverlayType = (cmd: string): string | null => {
    const lowerCmd = cmd.toLowerCase();
    if (lowerCmd.includes("higherify")) return "higherify";
    if (lowerCmd.includes("baseify")) return "baseify";
    if (lowerCmd.includes("higherise")) return "higherise";
    if (lowerCmd.includes("dickbuttify")) return "dickbuttify";
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      // Parse the command first
      const parseResponse = await fetch("/api/agent/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      });

      if (!parseResponse.ok) {
        throw new Error(`Error: ${parseResponse.status}`);
      }

      const parsedData = await parseResponse.json();
      setParsedCommand(parsedData);
      setShowConfirmation(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse command. Please try again."
      );
    }
  };

  // Handle confirmation
  const handleConfirm = async () => {
    if (!parsedCommand) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to process command. Please try again.";

      // Check for timeout or cold start scenarios
      if (
        errorMessage.includes("504") ||
        errorMessage.includes("FUNCTION_INVOCATION_TIMEOUT")
      ) {
        setError(
          "The server is warming up. Please try again in a few moments. This happens when the server hasn't been used for a while."
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setParsedCommand(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Navigation />

      <div className="flex justify-center mb-4">
        <WalletConnect />
      </div>

      <div className="flex justify-center mb-6">
        <Image
          src="/wowwowowify.png"
          alt="WOWOWIFY"
          width={200}
          height={200}
          className="w-32 h-auto"
          priority
        />
      </div>

      <form onSubmit={handleSubmit} className="mb-8 text-center">
        <div className="mb-4">
          <label htmlFor="command" className="block text-sm font-medium mb-2">
            Try
          </label>
          <textarea
            id="command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., Higherify a mountain landscape. Scale to 0.8."
            className="w-full p-2 border rounded resize-none overflow-hidden text-center placeholder:text-center"
            style={{
              minHeight: "42px",
              maxHeight: "150px",
              height: "auto",
              textAlign: "center",
            }}
            required
            rows={Math.min(5, Math.max(1, command.split("\n").length))}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              // Reset height to auto to get the correct scrollHeight
              target.style.height = "auto";
              // Set the height to the scrollHeight to expand the textarea
              target.style.height = `${Math.min(150, target.scrollHeight)}px`;
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || showConfirmation}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? "Processing..." : "wowow"}
        </button>
      </form>

      {loading && (
        <div className="p-4 mb-4 bg-white rounded border text-center">
          <LoadingIndicator />
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded text-center">
          {error}
        </div>
      )}

      {showConfirmation && parsedCommand && (
        <div className="p-4 mb-4 bg-gray-100 rounded border">
          <h2 className="text-xl font-semibold mb-4 text-center">Confirm</h2>
          <div className="mb-4">
            <p className="mb-2 text-center">
              <strong>I understood</strong>
            </p>
            <div className="bg-white p-3 rounded border mb-4">
              {parsedCommand.action === "generate" && (
                <div>
                  <p className="mb-2 text-center">Generate an image of:</p>
                  <p className="text-center font-medium">
                    {parsedCommand.prompt || "No prompt provided"}
                  </p>
                  {parsedCommand.overlayMode && (
                    <p className="mt-2 text-center text-blue-600">
                      Using{" "}
                      <span className="font-medium">
                        {parsedCommand.overlayMode}
                      </span>{" "}
                      overlay
                    </p>
                  )}
                </div>
              )}
              {parsedCommand.action === "overlay" && (
                <div>
                  <p className="mb-2 text-center">
                    Apply the{" "}
                    <span className="font-medium">
                      {parsedCommand.overlayMode || "default"}
                    </span>{" "}
                    overlay to{" "}
                    {parsedCommand.prompt
                      ? "an image of:"
                      : "the generated image"}
                  </p>
                  {parsedCommand.prompt && (
                    <p className="text-center font-medium">
                      {parsedCommand.prompt}
                    </p>
                  )}
                </div>
              )}
              {parsedCommand.controls && (
                <div className="mt-4 pt-4 border-t">
                  <p className="mb-2 text-center">With these adjustments:</p>
                  <ul className="text-sm">
                    {parsedCommand.controls.scale !== undefined && (
                      <li className="text-center">
                        Scale: {parsedCommand.controls.scale}
                      </li>
                    )}
                    {parsedCommand.controls.x !== undefined &&
                      parsedCommand.controls.y !== undefined && (
                        <li className="text-center">
                          Position: {parsedCommand.controls.x},{" "}
                          {parsedCommand.controls.y}
                        </li>
                      )}
                    {parsedCommand.controls.overlayColor && (
                      <li className="text-center">
                        Color: {parsedCommand.controls.overlayColor}
                      </li>
                    )}
                    {parsedCommand.controls.overlayAlpha !== undefined && (
                      <li className="text-center">
                        Opacity: {parsedCommand.controls.overlayAlpha}
                      </li>
                    )}
                  </ul>
                </div>
              )}
              {parsedCommand.text && (
                <div className="mt-4 pt-4 border-t">
                  <p className="mb-2 text-center">With text:</p>
                  <p className="text-center font-medium">
                    &ldquo;{parsedCommand.text.content}&rdquo;
                  </p>
                  <ul className="text-sm mt-2">
                    {parsedCommand.text.position && (
                      <li className="text-center">
                        Position: {parsedCommand.text.position}
                      </li>
                    )}
                    {parsedCommand.text.fontSize !== undefined && (
                      <li className="text-center">
                        Size: {parsedCommand.text.fontSize}
                      </li>
                    )}
                    {parsedCommand.text.color && (
                      <li className="text-center">
                        Color: {parsedCommand.text.color}
                      </li>
                    )}
                    {parsedCommand.text.style && (
                      <li className="text-center">
                        Style: {parsedCommand.text.style}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Yes, do it!
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="p-4 mb-8 bg-white rounded border">
          <h2 className="text-xl font-semibold mb-4 text-center">Result</h2>
          {result.status === "completed" && result.resultUrl && (
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-md mb-4">
                <Image
                  src={getProxiedUrl(getBestImageUrl(result))}
                  alt="Generated image"
                  width={512}
                  height={512}
                  className="w-full h-auto rounded border"
                />
              </div>
              <a
                href={getBestImageUrl(result)}
                download
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-4"
              >
                Download
              </a>
              <p className="text-sm text-gray-500 text-center">
                Note: Images are stored temporarily. Download to keep.
              </p>

              {result.groveUri && result.groveUrl && (
                <div className="mt-4 text-center">
                  <a
                    href={result.groveUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 underline"
                  >
                    Grove
                  </a>

                  {/* Add Mint as NFT button for mantleify images */}
                  {isMantleifyCommand(command) &&
                    result.groveUrl &&
                    isConnected && (
                      <div className="mt-2">
                        <MintMantleifyButton groveUrl={result.groveUrl} />
                      </div>
                    )}

                  {/* Add Mint as NFT button for Base NFT overlays */}
                  {getBaseOverlayType(command) &&
                    result.groveUrl &&
                    isConnected && (
                      <div className="mt-2">
                        <MintBaseNFTButton
                          groveUrl={result.groveUrl}
                          overlayType={getBaseOverlayType(command)!}
                        />
                      </div>
                    )}

                  {/* Add Mint as NFT button for scrollify images */}
                  {isScrollifyCommand(command) &&
                    result.groveUrl &&
                    isConnected && (
                      <div className="mt-2">
                        <MintScrollifyNFTButton groveUrl={result.groveUrl} />
                      </div>
                    )}
                </div>
              )}
            </div>
          )}
          {result.status === "failed" && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded text-center">
              {result.error || "Failed to process the command"}
            </div>
          )}
        </div>
      )}

      <div className="mb-8 p-4 bg-gray-50 rounded border text-center">
        <h2 className="text-lg font-semibold mb-3">How</h2>
        <div className="flex flex-col gap-2 max-w-md mx-auto">
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Basic:</strong> &ldquo;higherify a
            cat&rdquo;
          </div>
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Placement:</strong>{" "}
            &ldquo;Position at 20, -30&rdquo;
          </div>
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Size:</strong> &ldquo;Scale to
            0.5&rdquo;
          </div>
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Style:</strong> &ldquo;Color to
            #0000FF&rdquo;
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-blue-800 text-sm max-w-md mx-auto">
          <strong>Supported overlays:</strong>{" "}
          <span className="font-mono">degen</span>,{" "}
          <span className="font-mono">higher</span>,{" "}
          <span className="font-mono">scroll</span>,{" "}
          <span className="font-mono">lens</span>,{" "}
          <span className="font-mono">dickbutt</span>,{" "}
          <span className="font-mono">nikefy</span>,{" "}
          <span className="font-mono">noun</span>,{" "}
          <span className="font-mono">base</span>,{" "}
          <span className="font-mono">mantle</span>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200 text-yellow-800 text-sm max-w-md mx-auto">
          <strong>Tip:</strong> Separate commands with periods for better
          results:
          <br />
          <span className="font-mono text-xs mt-1 block">
            Higherify a dog. Opacity 0.3. Color green.
          </span>
        </div>
        <div className="mt-3 p-3 bg-green-50 rounded border border-green-200 text-green-800 text-sm max-w-md mx-auto">
          <strong>New!</strong> <span className="font-mono">mantle & base</span>
          images mintable as testnet NFTs.
          <br />
        </div>
      </div>
    </div>
  );
}

export default function AgentPage() {
  return (
    <Web3Provider>
      <AgentContent />
    </Web3Provider>
  );
}
