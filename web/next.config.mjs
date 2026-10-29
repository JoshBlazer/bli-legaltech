/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @attestry/zk (workstream C) is shipped as untranspiled ESM TypeScript; let
  // Next compile it. Its deep Semaphore deps ship browser builds.
  transpilePackages: ["@attestry/zk"],
  webpack: (config, { isServer, webpack }) => {
    // wagmi/viem pull in optional WalletConnect deps that are not installed in
    // this keyless build; silence the resolver for them so the bundle stays lean.
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // C's source uses NodeNext-style ".js" import specifiers that resolve to
    // ".ts" on disk — teach webpack the same mapping.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };

    // The Semaphore/snarkjs stack resolves to browser builds, but C's artifact
    // loader statically imports `node:module` (only ever called under Node). Stub
    // the node built-ins in the client bundle so that import is harmless; the
    // browser proof path passes artifact URLs and never touches them.
    if (!isServer) {
      // Rewrite `node:xxx` scheme imports to bare `xxx` so the fallbacks below
      // apply (webpack does not resolve the `node:` scheme on its own).
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, "");
        }),
      );
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        path: false,
        os: false,
        module: false,
        url: false,
        crypto: false,
        stream: false,
        readline: false,
      };
    }

    return config;
  },
};

export default nextConfig;
