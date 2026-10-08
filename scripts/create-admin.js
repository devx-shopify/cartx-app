// Create or update an /enterprise dashboard admin user.
// Usage: node scripts/create-admin.js <email> <password> [name]
//   (requires DATABASE_URL in the environment, and the AdminUser migration applied)
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../app/lib/password.js";

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: node scripts/create-admin.js <email> <password> [name]");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const normalized = email.trim().toLowerCase();
  const user = await db.adminUser.upsert({
    where: { email: normalized },
    create: { email: normalized, passwordHash: hashPassword(password), name: name || null },
    update: { passwordHash: hashPassword(password), ...(name ? { name } : {}) },
  });
  console.log(`✅ Admin user ready: ${user.email}`);
} catch (err) {
  console.error("Failed to create admin user:", err.message);
  process.exit(1);
} finally {
  await db.$disconnect();
}
