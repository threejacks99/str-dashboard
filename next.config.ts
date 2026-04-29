import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    'react-markdown',
    'hast-util-to-jsx-runtime',
    'html-url-attributes',
    'mdast-util-to-hast',
    'remark-parse',
    'remark-rehype',
    'unified',
    'unist-util-visit',
    'vfile',
    'devlop',
  ],
};

export default nextConfig;
