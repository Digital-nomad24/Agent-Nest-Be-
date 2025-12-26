import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/models/",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node prisma/seed.ts"
  },
  datasource: {
    url: process.env.DATABASE_URL!
  },
});