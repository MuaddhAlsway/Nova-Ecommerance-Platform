import crypto from "crypto";

const ALGO = "scrypt";
const KEY_LEN = 64;
const SALT_LEN = 16;
const IV_LEN = 16;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LEN).toString("hex");
  const key = crypto.scryptSync(password, salt, KEY_LEN);
  return `${salt}:${key.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const key = crypto.scryptSync(password, salt, KEY_LEN);
  return key.toString("hex") === hash;
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
