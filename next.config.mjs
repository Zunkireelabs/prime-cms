/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cms-primeceramics.com.np",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
