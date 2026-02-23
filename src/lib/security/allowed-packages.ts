/**
 * Allowed packages for skills installation.
 * Only packages in this whitelist can be installed via the dashboard.
 *
 * Security rationale: Arbitrary package installation allows command injection.
 * By restricting to known-safe packages, we prevent:
 * - Malicious npm/brew packages with postinstall scripts
 * - Typosquatting attacks
 * - Supply chain attacks
 *
 * To add a new package:
 * 1. Verify it's a legitimate, well-maintained package
 * 2. Check for known security issues
 * 3. Add to the appropriate category below
 */

export const ALLOWED_PACKAGES = {
  // Homebrew packages (macOS)
  brew: new Set([
    // Audio/Video tools
    "ffmpeg",
    "sox",
    "lame",
    "opus",
    "flac",

    // Development tools
    "jq",
    "yq",
    "httpie",
    "curl",
    "wget",

    // Python (for OpenClaw skills)
    "python3",
    "python@3.11",
    "python@3.12",

    // Node.js
    "node",
    "node@20",
    "node@22",

    // Database tools
    "sqlite",
    "postgresql",

    // Image processing
    "imagemagick",
    "graphviz",

    // PDF tools
    "poppler",
    "ghostscript",

    // OCR
    "tesseract",

    // Utilities
    "tree",
    "ripgrep",
    "fd",
    "bat",
    "fzf",
  ]),

  // npm packages (global)
  npm: new Set([
    // Common CLI tools
    "typescript",
    "ts-node",
    "eslint",
    "prettier",

    // OpenClaw related
    "@anthropic-ai/claude-code",

    // Build tools
    "vite",
    "esbuild",
  ]),

  // pip packages
  pip: new Set([
    // Common Python utilities
    "requests",
    "httpx",
    "aiohttp",
    "beautifulsoup4",
    "lxml",
    "pillow",
    "numpy",
    "pandas",

    // AI/ML
    "openai",
    "anthropic",
    "tiktoken",

    // OpenClaw related
    "openclaw",
  ]),
} as const;

export type PackageManager = keyof typeof ALLOWED_PACKAGES;

/**
 * Check if a package is allowed for installation.
 *
 * @param manager - Package manager (brew, npm, pip)
 * @param packageName - Name of the package to check
 * @returns true if package is in the whitelist
 */
export function isAllowedPackage(manager: PackageManager, packageName: string): boolean {
  const allowedSet = ALLOWED_PACKAGES[manager];
  if (!allowedSet) return false;

  // Normalize package name (lowercase, trim)
  const normalized = packageName.toLowerCase().trim();

  // Block any package name with shell metacharacters
  if (/[;&|`$(){}[\]<>\\!]/.test(normalized)) {
    return false;
  }

  // Block excessively long names (potential buffer overflow attempt)
  if (normalized.length > 100) {
    return false;
  }

  return allowedSet.has(normalized);
}

/**
 * Get list of allowed packages for a manager.
 * Useful for UI display.
 */
export function getAllowedPackages(manager: PackageManager): string[] {
  const allowedSet = ALLOWED_PACKAGES[manager];
  return allowedSet ? Array.from(allowedSet).sort() : [];
}
