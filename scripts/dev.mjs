#!/usr/bin/env node
/**
 * Dev server: uses webpack by default to avoid Turbopack errors.
 * Set NEXT_USE_TURBOPACK=1 in .env.local to use Turbopack instead.
 */
import { spawn } from "child_process";

const useTurbopack = process.env.NEXT_USE_TURBOPACK === "1" || process.env.NEXT_USE_TURBOPACK === "true";
const args = useTurbopack ? ["dev"] : ["dev", "--webpack"];

const child = spawn("next", args, {
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});

child.on("exit", (code) => process.exit(code ?? 0));
