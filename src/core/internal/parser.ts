/**
 * @module    core/internal/parser
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

/**
 * Mapping of template placeholders to their corresponding property names.
 *
 * This map is used for replacing placeholders in output file templates
 * with the actual property values.
 *
 * @internal
 * @since 5.0.0
 */
export const OUTFILE_TEMPLATE_MAP = {
  '%(title)s': 'title',
  '%(id)s': 'id',
  '%(author)s': 'author',
  '%(url)s': 'url',
  '%(ext)s': 'ext',
} as const;

/**
 * Replaces placeholders in a file template with actual property values.
 *
 * @remarks Unsupported placeholders are ignored and will not be replaced.
 *
 * @param input - The file template with placeholders.
 * @param replacer - An object containing property values to replace the placeholders.
 * @returns The file template with placeholders replaced.
 *
 * @internal
 * @since 5.0.0
 */
export function parseOutFile(
  input: string,
  replacer: Record<(typeof OUTFILE_TEMPLATE_MAP)[keyof typeof OUTFILE_TEMPLATE_MAP], string>
): string {
  Object.entries(OUTFILE_TEMPLATE_MAP).forEach(([key, value]) => {
    input = input.replace(key, replacer[value] ?? '');
  });

  return input;
}
