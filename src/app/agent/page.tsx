"use client";

import { useState } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";

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
}

export default function AgentTest() {
  const [command, setCommand] = useState("");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(
    null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);

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

      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
          parameters: parsedCommand,
        }),
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
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
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

      <div className="flex flex-col items-center gap-4 mb-6">
        <Image
          src="/wowwowowify.png"
          alt="WOWOWIFY"
          width={200}
          height={200}
          className="w-32 h-auto"
          priority
        />
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded border text-center">
        <h2 className="text-lg font-semibold mb-3">How</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Basic:</strong> &ldquo;higherify a
            cat&rdquo; | &ldquo;degenify a mountain&rdquo;
          </div>
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Position:</strong> &ldquo;Position
            at 20, -30&rdquo; | &ldquo;Move to 0, 50&rdquo;
          </div>
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Scale:</strong> &ldquo;Scale to
            0.5&rdquo; | &ldquo;Scale to 1.5&rdquo;
          </div>
          <div className="p-2 bg-white rounded border">
            <strong className="text-blue-600">Style:</strong> &ldquo;Color to
            blue&rdquo; | &ldquo;Opacity to 0.7&rdquo;
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-blue-800 text-sm">
          <strong>Supported overlays:</strong>{" "}
          <span className="font-mono">degenify</span>,{" "}
          <span className="font-mono">higherify</span>,{" "}
          <span className="font-mono">scrollify</span>
        </div>
        <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200 text-yellow-800 text-sm">
          <strong>Tip:</strong> Separate commands with periods for better
          results:
          <br />
          <span className="font-mono text-xs mt-1 block">
            Higherify a cat wearing sunglasses. Scale to 0.5. Opacity to 0.3.
            Color to blue.
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 text-center">
        <div className="mb-4">
          <label htmlFor="command" className="block text-sm font-medium mb-2">
            Try
          </label>
          <input
            type="text"
            id="command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., Higherify a mountain landscape. Scale to 0.8."
            className="w-full p-2 border rounded"
            required
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
                  <div className="mt-3 text-center">
                    <p className="font-medium mb-2">With these adjustments:</p>
                    <ul className="list-disc flex flex-col items-center mt-1 space-y-1">
                      {parsedCommand.controls.scale !== undefined && (
                        <li>
                          Scale:{" "}
                          <span className="font-mono bg-gray-100 px-1 rounded text-center">
                            {parsedCommand.controls.scale}
                          </span>
                        </li>
                      )}
                      {(parsedCommand.controls.x !== undefined ||
                        parsedCommand.controls.y !== undefined) && (
                        <li>
                          Position:{" "}
                          <span className="font-mono bg-gray-100 px-1 rounded">
                            x={parsedCommand.controls.x || 0}, y=
                            {parsedCommand.controls.y || 0}
                          </span>
                        </li>
                      )}
                      {parsedCommand.controls.overlayColor && (
                        <li>
                          Color:{" "}
                          <span className="font-mono bg-gray-100 px-1 rounded">
                            {parsedCommand.controls.overlayColor}
                          </span>
                        </li>
                      )}
                      {parsedCommand.controls.overlayAlpha !== undefined && (
                        <li>
                          Opacity:{" "}
                          <span className="font-mono bg-gray-100 px-1 rounded">
                            {parsedCommand.controls.overlayAlpha}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
            </div>

            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-gray-600">
                View raw data
              </summary>
              <pre className="whitespace-pre-wrap break-words text-xs mt-2 bg-gray-50 p-2 rounded">
                {JSON.stringify(parsedCommand, null, 2)}
              </pre>
            </details>
          </div>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              type="button"
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && result.status === "completed" && (
        <div className="p-4 mb-4 bg-white rounded border text-center">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          <div className="mb-4">
            <img
              src={result.previewUrl}
              alt="Generated image"
              className="max-w-full h-auto mx-auto rounded border"
              style={{ maxHeight: "60vh" }}
            />
          </div>
          <div className="flex flex-col items-center">
            <a
              href={result.resultUrl}
              download={`wowow-image.png`}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 mb-4"
            >
              Download Image
            </a>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Note: Images are stored temporarily and will be automatically
              deleted. Please download your image if you want to keep it.
            </p>
          </div>
        </div>
      )}

      {result && result.status === "failed" && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded text-center">
          {result.error || "An error occurred while processing your request."}
        </div>
      )}

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
