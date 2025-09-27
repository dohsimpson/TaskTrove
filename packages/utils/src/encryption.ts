import bcrypt from "bcryptjs";

/**
 * Hashes sensitive data (like passwords) using bcrypt algorithm.
 * bcrypt automatically handles salt generation and is secure across all environments.
 *
 * @param data - The plaintext data to hash (typically a password)
 * @param saltRounds - Number of salt rounds (default: 12, higher = more secure but slower)
 * @returns The bcrypt hash string containing salt and hash
 * @throws Error if data is empty
 */
export function saltAndHashPassword(
  data: string,
  saltRounds: number = 12,
): string {
  if (data.length === 0) {
    throw new Error("Data must not be empty");
  }

  // bcrypt.hashSync automatically generates salt and returns combined hash
  return bcrypt.hashSync(data, saltRounds);
}

/**
 * Verifies plaintext data against a stored bcrypt hash.
 * Handles the case where both data and storedHash are undefined (returns true).
 *
 * @param data - The plaintext data to verify (typically a password)
 * @param storedHash - The stored bcrypt hash string
 * @returns true if the data matches the stored hash, false otherwise
 */
export function verifyPassword(data?: string, storedHash?: string): boolean {
  // If both data and storedHash are undefined, return true (no password set)
  if (!data && !storedHash) return true;

  // If either data or storedHash is undefined (but not both), return false
  if (!data || !storedHash) return false;

  // Use bcrypt to compare the plaintext password with the stored hash
  return bcrypt.compareSync(data, storedHash);
}
