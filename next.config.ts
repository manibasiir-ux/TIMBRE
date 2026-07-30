import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development runs in a Linux container while the source lives on a Windows
  // bind mount, and inotify events do not survive that boundary. Turbopack's
  // watcher, including this pollIntervalMs option, was measured on that mount
  // and never fired: edits made from Windows and from inside the container both
  // left the dev server serving a stale render indefinitely. Webpack's polling
  // watcher, driven by WATCHPACK_POLLING, does fire, so `npm run dev` passes
  // --webpack. See the Development section of README.md.
  //
  // This option is kept because it costs nothing and becomes the correct answer
  // the moment the source moves onto a Linux filesystem or Turbopack fixes the
  // watcher, at which point `npm run dev:turbo` becomes viable.
  watchOptions: {
    pollIntervalMs: 500,
  },
};

export default nextConfig;
