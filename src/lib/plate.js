/**
 * Formats a stored plate string for display by inserting a space after the 4th character.
 * Stored format: KMCF123A → Display: KMCF 123A
 */
export function formatPlate(plate) {
  if (!plate) return '';
  const clean = plate.toUpperCase().replace(/\s+/g, '');
  if (clean.length <= 4) return clean;
  return clean.slice(0, 4) + ' ' + clean.slice(4);
}