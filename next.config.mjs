/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['ottomate.vault7a.xyz', 'localhost:8110']
    }
  }
};

export default nextConfig;
