"use client";

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Image from "next/image";

interface DebugInfo {
  environment: string;
  redisUrl: string;
  urlComponents: {
    protocol: string;
    username: string;
    passwordLength: number;
    host: string;
    port: string;
    error: string;
  };
  redisStatus: string;
  pingResult: string;
  testWriteResult: string;
  testReadResult: string;
  timestamp: string;
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUpstash, setIsUpstash] = useState(false);

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const fetchDebugInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/debug-redis");
      if (!response.ok) {
        throw new Error(`Error fetching debug info: ${response.statusText}`);
      }
      const data = await response.json();
      setDebugInfo(data);

      // Check if it's an Upstash URL
      setIsUpstash(data.redisUrl?.includes("upstash.io") || false);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load debug info"
      );
    } finally {
      setLoading(false);
    }
  };

  const testUpstash = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/test-upstash");
      if (!response.ok) {
        throw new Error(`Error testing Upstash: ${response.statusText}`);
      }
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to test Upstash"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Navigation />

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

      <h1 className="text-2xl font-bold mb-6 text-center">Redis Debug Info</h1>

      <div className="mb-4 flex justify-center gap-4">
        <button
          onClick={fetchDebugInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Debug Info
        </button>

        {isUpstash && (
          <button
            onClick={testUpstash}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Test Upstash Directly
          </button>
        )}
      </div>

      {loading && (
        <div className="p-4 bg-white rounded border text-center">
          <p>Loading debug information...</p>
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded text-center">
          {error}
        </div>
      )}

      {!loading && debugInfo && (
        <div className="bg-white rounded border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded border">
              <h2 className="font-bold mb-2">Environment</h2>
              <p>{debugInfo.environment}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded border">
              <h2 className="font-bold mb-2">Timestamp</h2>
              <p>{new Date(debugInfo.timestamp).toLocaleString()}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded border">
              <h2 className="font-bold mb-2">Redis URL (masked)</h2>
              <p className="break-all">{debugInfo.redisUrl}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded border">
              <h2 className="font-bold mb-2">Redis Status</h2>
              <p
                className={
                  debugInfo.redisStatus === "ready"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {debugInfo.redisStatus}
              </p>
            </div>
          </div>

          <h2 className="font-bold mt-6 mb-2">URL Components</h2>
          <div className="bg-gray-50 rounded border p-3 mb-4">
            {debugInfo.urlComponents.error ? (
              <p className="text-red-600">{debugInfo.urlComponents.error}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <p className="font-semibold">Protocol:</p>
                  <p>{debugInfo.urlComponents.protocol}</p>
                </div>
                <div>
                  <p className="font-semibold">Username:</p>
                  <p>{debugInfo.urlComponents.username}</p>
                </div>
                <div>
                  <p className="font-semibold">Password Length:</p>
                  <p>{debugInfo.urlComponents.passwordLength} characters</p>
                </div>
                <div>
                  <p className="font-semibold">Host:</p>
                  <p>{debugInfo.urlComponents.host}</p>
                </div>
                <div>
                  <p className="font-semibold">Port:</p>
                  <p>{debugInfo.urlComponents.port}</p>
                </div>
              </div>
            )}
          </div>

          <h2 className="font-bold mt-6 mb-2">Redis Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-1">PING Test</h3>
              <p
                className={
                  debugInfo.pingResult === "PONG"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {debugInfo.pingResult}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-1">Write Test</h3>
              <p
                className={
                  debugInfo.testWriteResult === "OK"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {debugInfo.testWriteResult}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded border">
              <h3 className="font-semibold mb-1">Read Test</h3>
              <p
                className={
                  debugInfo.testReadResult === "test-value"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {debugInfo.testReadResult}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
