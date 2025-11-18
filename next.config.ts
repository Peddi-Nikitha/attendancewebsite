import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for IONOS static hosting
  output: 'export',
  
  // Optimize images for production
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
