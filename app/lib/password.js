import crypto from "node:crypto";

// Password hashing via Node's built-in scrypt — no external dependency.
// Stored format: "<saltHex>:<hashHex>".

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hashHex] = stored.split(":");
  const hashBuf = Buffer.from(hashHex, "hex");
  const testBuf = crypto.scryptSync(String(password), salt, 64);
  return hashBuf.length === testBuf.length && crypto.timingSafeEqual(hashBuf, testBuf);
}
