import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't let `next dev` keep appending an agent-rules block to CLAUDE.md on every run.
  agentRules: false,
};

export default nextConfig;
