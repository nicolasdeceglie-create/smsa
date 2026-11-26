import type { NextConfig } from "next";

// /api/* viene girato al backend Express
const backend = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
    async rewrites() {
        return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
    },
};

export default nextConfig;
