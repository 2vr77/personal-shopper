import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A stray package-lock.json in the parent directory makes Turbopack guess the
  // wrong workspace root; pin it to this project.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
}

export default nextConfig
