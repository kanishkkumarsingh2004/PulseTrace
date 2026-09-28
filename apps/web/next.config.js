/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pulsetrace/types', '@pulsetrace/validation'],
};

module.exports = nextConfig;
