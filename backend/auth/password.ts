import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

// A real hash of a random value, compared against when the email is unknown so that
// "no such account" takes as long as "wrong password" and reveals nothing.
const DUMMY_HASH = bcrypt.hashSync(`unused-${Math.random()}`, SALT_ROUNDS);

export async function comparePassword(plainText: string, hash: string | null | undefined): Promise<boolean> {
  try {
    return await bcrypt.compare(plainText, hash || DUMMY_HASH);
  } catch {
    return false;
  }
}
