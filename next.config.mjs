/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
    turbo: {
      // Configure Turbopack
      resolveAlias: {
        // Add any aliases needed for Turbopack
      },
      rules: {
        // Add any custom rules for Turbopack
      },
    },
  },
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        dns: false,
        tls: false,
        fs: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
