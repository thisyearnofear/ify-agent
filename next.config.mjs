/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.venice.run",
      },
    ],
  },
  // Enable edge runtime for API routes
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "your-production-domain.vercel.app"],
    },
  },
};

export default nextConfig;
