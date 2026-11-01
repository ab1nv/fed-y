import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Prisma CLI never connects here for this app: schema changes are applied to
    // Turso by scripts/db-push.ts. A file URL keeps `prisma generate` happy.
    url: "file:./prisma/dev.db",
  },
});
