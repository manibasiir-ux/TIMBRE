import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and accessibility, roadmap §7.
 *
 * WebKit is in the matrix because Safari is where this class of bug hides: the
 * roadmap records a `?t=` deep link failing on Safari 17 at launch, from a
 * URLSearchParams parse running before hydration. Chromium alone would not have
 * caught it.
 *
 * There is no `webServer` block. Compose already owns the dev server and waits
 * on its healthcheck, so letting Playwright start a second one would race the
 * first for port 3000.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /**
   * One retry, everywhere. Not a way of manufacturing a pass.
   *
   * The genuine defects this suite found are fixed: three focus races only
   * WebKit exposed, and a step advancing before React had committed. What is
   * left is timing. Even at one worker, roughly one WebKit test per full run
   * exceeds a timeout — a different one each time, and every one of them passes
   * repeatedly when run alone. That is the container being slow, not the code
   * being wrong.
   *
   * Playwright reports a retried test as **flaky**, not as passing, so this
   * keeps the noise non-blocking without making it invisible. A test that fails
   * both attempts is a real failure and still goes red.
   */
  retries: 1,
  // One worker, deliberately.
  //
  // The VM has four cores and under 6 GB. At two workers the suite reported 28
  // failures in 7.2 minutes, while every one of those tests passed in isolation
  // in under two seconds — the failures were contention, not defects. A suite
  // that fails for reasons unrelated to the code is worse than no suite,
  // because it teaches everyone to ignore it.
  workers: 1,
  reporter: [["list"]],

  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The dev server compiles a route the first time it is asked for it, which
    // can take longer than a default action timeout on a cold start.
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /reduced-motion\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /reduced-motion\.spec\.ts/,
    },
    {
      // §10 treats reduced motion as a designed state rather than a stripped
      // one, and it has been unverifiable until now: a real browser session
      // cannot be made to report the preference, but Playwright can.
      name: "reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        // Belongs under contextOptions in this version, not directly in `use`.
        contextOptions: { reducedMotion: "reduce" },
      },
      testMatch: /reduced-motion\.spec\.ts/,
    },
  ],
});
