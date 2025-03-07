"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { Web3Provider } from "@/components/Web3Provider";
import WalletConnect from "@/components/WalletConnect";
import { useAccount } from "wagmi";

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
  const { isConnected, address } = useAccount();

  // Helper function to proxy IPFS URLs to avoid CORS issues
  const getProxiedUrl = (url: string): string => {
    if (!url) return "";

    // List of IPFS gateways that might need proxying
    const ipfsGateways = [
      "https://ipfs.io/ipfs/",
      "https://gateway.ipfs.io/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://lens.infura-ipfs.io/ipfs/",
    ];

    // Check if the URL is from any of the IPFS gateways
    const isIpfsUrl = ipfsGateways.some((gateway) => url.startsWith(gateway));

    if (isIpfsUrl) {
      console.log("Proxying IPFS URL:", url);
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }

    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setParsedCommand(null);
    setShowConfirmation(false);

    try {
      // First, get the parsed command for confirmation
      const response = await fetch("/api/agent/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to parse command");
      }

      setParsedCommand(data);
      setShowConfirmation(true);
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      console.log("Sending request to API:", {
        command,
        parsedCommand,
      });

      // Include wallet address in the request if connected
      const requestBody: {
        command: string;
        parameters: ParsedCommand | null;
        walletAddress?: string;
      } = {
        command,
        parameters: parsedCommand,
      };

      // Add wallet address if connected and using lensify
      if (isConnected && parsedCommand?.overlayMode === "lensify") {
        requestBody.walletAddress = address;
      }

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // Check if the response is ok before trying to parse JSON
      if (!response.ok) {
        const contentType = response.headers.get("content-type");

        // If the response is JSON, try to parse it
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            throw new Error(
              errorData.error || `Server error: ${response.status}`
            );
          } catch {
            // If JSON parsing fails, use the status text
            throw new Error(
              `Server error: ${response.status} ${response.statusText}`
            );
          }
        } else {
          // If not JSON, get the text
          const errorText = await response.text();
          console.error("Non-JSON error response:", errorText);
          throw new Error(
            `Server error: ${response.status} - ${errorText.substring(
              0,
              100
            )}...`
          );
        }
      }

      // If we get here, the response is ok, so try to parse JSON
      try {
        const data = await response.json();
        setResult(data);
      } catch (jsonError) {
        console.error(
          "Error parsing JSON from successful response:",
          jsonError
        );
        const responseText = await response.text();
        throw new Error(
          `Failed to parse server response: ${responseText.substring(
            0,
            100
          )}...`
        );
      }
    } catch (error) {
      console.error("Request error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";

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
                  <div className="p-2 bg-gray-50 text-center border rounded font-medium">
                    {parsedCommand.prompt}
                  </div>
                </div>
              )}

              {parsedCommand.overlayMode && (
                <p className="mt-3 text-center">
                  Apply the{" "}
                  <span className="font-semibold text-blue-600">
                    {parsedCommand.overlayMode}
                  </span>{" "}
                  overlay
                </p>
              )}

              {parsedCommand.controls &&
                Object.keys(parsedCommand.controls).length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-center">With adjustments:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {parsedCommand.controls.scale !== undefined && (
                        <div className="p-2 bg-gray-50 border rounded">
                          <strong>Scale:</strong> {parsedCommand.controls.scale}
                        </div>
                      )}
                      {parsedCommand.controls.x !== undefined &&
                        parsedCommand.controls.y !== undefined && (
                          <div className="p-2 bg-gray-50 border rounded">
                            <strong>Position:</strong>{" "}
                            {parsedCommand.controls.x},{" "}
                            {parsedCommand.controls.y}
                          </div>
                        )}
                      {parsedCommand.controls.overlayColor && (
                        <div className="p-2 bg-gray-50 border rounded">
                          <strong>Color:</strong>{" "}
                          {parsedCommand.controls.overlayColor}
                        </div>
                      )}
                      {parsedCommand.controls.overlayAlpha !== undefined && (
                        <div className="p-2 bg-gray-50 border rounded">
                          <strong>Opacity:</strong>{" "}
                          {parsedCommand.controls.overlayAlpha}
                        </div>
                      )}
                    </div>
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
                  src={getProxiedUrl(result.resultUrl)}
                  alt="Generated image"
                  width={512}
                  height={512}
                  className="w-full h-auto rounded border"
                />
              </div>
              <a
                href={result.resultUrl || "#"}
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
                    View on Grove
                  </a>
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
          <span className="font-mono">degenify</span>,{" "}
          <span className="font-mono">higherify</span>,{" "}
          <span className="font-mono">scrollify</span>,{" "}
          <span className="font-mono">lensify</span>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200 text-yellow-800 text-sm max-w-md mx-auto">
          <strong>Tip:</strong> Separate commands with periods for better
          results:
          <br />
          <span className="font-mono text-xs mt-1 block">
            Higherify a cat wearing sunglasses. Opacity to 0.3. Color to green.
          </span>
        </div>
      </div>

      {result && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-600">
            Debug Info
          </summary>
          <div className="p-4 bg-gray-100 rounded mt-2 overflow-auto max-h-60">
            <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </details>
      )}
    </div>
  );
}

// Export the wrapped component
export default function AgentTest() {
  return (
    <Web3Provider>
      <AgentContent />
    </Web3Provider>
  );
}
