import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Mesma precedência do Next.js: .env.local sobrescreve .env.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
