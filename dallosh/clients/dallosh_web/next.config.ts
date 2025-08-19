/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Disable next/image optimization for static export
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Browser compatibility configuration
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { dev, isServer }) => {
    // Add browser compatibility for older browsers
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        process: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        events: false,
        assert: false,
        constants: false,
        domain: false,
        punycode: false,
        querystring: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        url: false,
        vm: false,
        zlib: false,
      };
    }

    return config;
  },
  // Configure output for better browser compatibility
  output: 'standalone',
  // Add headers for better browser support
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  // Use SWC with ES5 target
  swcMinify: true,
  compiler: {
    removeConsole: false,
  },
  // Environment variables configuration
  // env: {
  //   NEXT_PUBLIC_SODULAR_BASE_URL: process.env.NEXT_PUBLIC_SODULAR_BASE_URL || 'http://host.docker.internal:5005/api/v1',
  //   NEXT_PUBLIC_SODULAR_AI_BASE_URL: process.env.NEXT_PUBLIC_SODULAR_AI_BASE_URL || 'http://host.docker.internal:4200/api/v1',
  //   NEXT_PUBLIC_SODULAR_DATABASE_ID: process.env.NEXT_PUBLIC_SODULAR_DATABASE_ID || 'd8d1badd-d3bd-48ce-863b-44c0ebdca41d',
  //   NEXT_PUBLIC_DALLOSH_AI_BASE_URL: process.env.NEXT_PUBLIC_DALLOSH_AI_BASE_URL || 'http://host.docker.internal:7860',
  // },
};

export default nextConfig;
