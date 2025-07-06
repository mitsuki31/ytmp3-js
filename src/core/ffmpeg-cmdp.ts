/**
 * @module   core/ffmpeg-cmdp
 * @author   Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license  MIT
 * @since    5.0.0
 */

import { isNullish, isString } from '#/utils';

/**
 * Splits FFmpeg options from a string into an array of individual arguments,
 * correctly handling quoted strings and preserving option-value pairs.
 *
 * This function attempts to mimic basic shell-like parsing for command-line arguments.
 * It will group:
 * - Options followed by a non-hyphen value (e.g., `-i input.mp4`)
 * - Standalone options (e.g., `-y`)
 * - Quoted strings (e.g., `-metadata title="My Video"`)
 * - Other non-option tokens (e.g., 'input.mp4' if not preceded by `-i`)
 *
 * @example
 * ```js
 * splitFfmpegOptions('-i "input file with spaces.mp4" -c:v libx264 -preset slow -metadata title="A new title with spaces"');
 * // Expected: [
 * //   '-i "input file with spaces.mp4"',
 * //   '-c:v libx264',
 * //   '-preset slow',
 * //   '-metadata title="A new title with spaces"'
 * // ]
 * ```
 *
 * @example
 * ```js
 * splitFfmpegOptions('input.mp4 -ss 00:00:10 -t 00:00:20 output.mp4');
 * // Expected: [
 * //   'input.mp4',
 * //   '-ss 00:00:10',
 * //   '-t 00:00:20',
 * //   'output.mp4'
 * // ]
 * ```
 *
 * @example
 * ```js
 * splitFfmpegOptions('-hide_banner -y');
 * // Expected: ['-hide_banner', '-y']
 * ```
 *
 * @param options - The string or array of options to split.
 * @returns The resolved options as an array of individual string arguments.
 *
 * @public
 * @since 5.0.0
 */
export function splitFfmpegOptions(options?: string | string[] | null): string[] {
  // Handle null, undefined, or other invalid inputs
  if (isNullish(options)) return [];

  // If already an array, filter to ensure all elements are strings
  if (Array.isArray(options)) {
    return options.filter(item => isString(item));
  }

  // For string input, we need a robust parsing mechanism
  // This regex matches:
  // 1. Double-quoted strings (e.g., "my file with spaces")
  // 2. Single-quoted strings (e.g., 'another file with spaces')
  // 3. Any non-whitespace sequence (e.g., -i, input.mp4, libx264)
  const argumentRegex = /"[^"]+"|'[^']+'|\S+/g;
  const tokens: string[] = [];
  const resolvedArguments: string[] = [];

  let match;
  while ((match = argumentRegex.exec(options)) !== null) {
    // match[0] is the entire matched string (e.g., '"my file"', or '-i', or 'input.mp4')
    tokens.push(match[0]);
  }

  let i = 0;
  while (i < tokens.length) {
    const currentToken = tokens[i];

    // Check if current token starts with a hyphen (typical FFmpeg option)
    if (currentToken.startsWith('-') && (i + 1) < tokens.length) {
      const nextToken = tokens[i + 1];
      // If the next token doesn't start with a hyphen, assume it's a value for the current option
      // Example: '-i', '"input.mp4"', '-c:v', 'libx264'
      // Groups '-i "input.mp4"', '-c:v libx264'
      if (!nextToken.startsWith('-')) {
        resolvedArguments.push(`${currentToken} ${nextToken}`);
        i += 2;    // Consume both option and its value
        continue;  // Go to next iteration
      }
    }
  
    // If it's a standalone option, or a non-option token (like an input/output file name),
    // or an option whose value is another option (e.g., '-map 0:v:0') which should stay separate for FFmpeg
    resolvedArguments.push(currentToken);
    i += 1;
  }

  return resolvedArguments;
}
