/**
 * Splits a full name string into first, middle, and last name parts.
 * - "John" → { firstName: "John", middleName: "", lastName: "" }
 * - "John Kamau" → { firstName: "John", middleName: "", lastName: "Kamau" }
 * - "John Mwangi Kamau" → { firstName: "John", middleName: "Mwangi", lastName: "Kamau" }
 * - "John Mwangi Test Kamau" → { firstName: "John", middleName: "Mwangi Test", lastName: "Kamau" }
 */
export function splitFullName(fullName) {
  if (!fullName || !fullName.trim()) return { firstName: '', middleName: '', lastName: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

/**
 * Joins first, middle, and last name parts into a single full name string.
 * Empty parts are skipped. "John" + "" + "Kamau" → "John Kamau"
 */
export function joinFullName(firstName, middleName, lastName) {
  return [firstName, middleName, lastName]
    .filter(s => s && s.trim())
    .join(' ')
    .trim();
}