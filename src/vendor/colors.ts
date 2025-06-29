/**
 * Provides ANSI text color formats and the styling utility.
 *
 * @module    vendor/colors
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     2.0.0
 */

type NonReadonly<T> = {
  -readonly [K in keyof T]: T[K]
};

/**
 * Represents a color code in various formats used for {@link style()} function.
 *
 * @internal
 * @since    5.0.0
 */
export type ColorFormat = typeof COLORS[number];

/**
 * ANSI escape sequence.
 * @param code - The escape code to apply.
 *
 * @internal
 * @since    5.0.0
 */
export const CSI = (code: typeof ANSI_CODES[keyof typeof ANSI_CODES][0] | string) => `\u001B[${code}m`;


/**
 * A mapping of human-readable style and color names to their corresponding ANSI escape codes.
 *
 * This is intended for internal usage only.  
 * This object provides codes for text modifiers (such as bold, underline, etc.),
 * standard and bright foreground colors, as well as standard and bright background colors.
 *
 * @remarks
 * - The values are arrays (with single value) containing the numeric ANSI code(s) for each style or color.
 * - Use the {@link ANSI_CODES.reset} code to clear all styles and colors.
 *
 * @internal
 * @since    5.0.0
 */
export const ANSI_CODES = {
  // Reset
  reset:        [0],

  // Modifiers
  bold:         [1],
  dim:          [2],
  italic:       [3],
  underline:    [4],
  inverse:      [7],
  strikethrough:[9],

  // Foreground colors
  black:        [30],
  red:          [31],
  green:        [32],
  yellow:       [33],
  blue:         [34],
  magenta:      [35],
  cyan:         [36],
  white:        [37],
  gray:         [90],

  // Bright foreground
  blackBright:  [90],
  redBright:    [91],
  greenBright:  [92],
  yellowBright: [93],
  blueBright:   [94],
  magentaBright:[95],
  cyanBright:   [96],
  whiteBright:  [97],

  // Background colors
  bgBlack:      [40],
  bgRed:        [41],
  bgGreen:      [42],
  bgYellow:     [43],
  bgBlue:       [44],
  bgMagenta:    [45],
  bgCyan:       [46],
  bgWhite:      [47],
  bgGray:       [100],

  // Bright background
  bgBlackBright:   [100],
  bgRedBright:     [101],
  bgGreenBright:   [102],
  bgYellowBright:  [103],
  bgBlueBright:    [104],
  bgMagentaBright: [105],
  bgCyanBright:    [106],
  bgWhiteBright:   [107],
} as const;

/**
 * An array containing the names of all built-in color styles supported
 * by Node.js's {@link inspect.colors}.
 *
 * These color names can be used to customize console output formatting.
 *
 * @internal
 * @since    5.0.0
 * @see      {@link https://nodejs.org/api/util.html#utilinspectcolors}
 */
export const BUILTIN_COLORS = [ ...Object.keys(ANSI_CODES) ] as NonReadonly<keyof typeof ANSI_CODES>[];

/**
 * A list contains all supported style formats for styling text.
 *
 * It extends the builtin color formats from `util.inspect.colors``property.
 *
 * @internal
 * @since 2.0.0
 */
export const COLORS = [
  ...BUILTIN_COLORS,

  // Custom colors
  0, '0',                       // Reset
  'BK', 'BBK', 'bgBK',          // Black : Bright Black : BG Black
  'R', 'BR', 'bgR', 'bgBR',     // Red : Bright Red : BG Red : BG Bright Red
  'G', 'BG', 'bgG', 'bgBG',     // Green : Bright Green : BG Green : BG Bright Green
  'Y', 'BY', 'bgY', 'bgBY',     // Yellow : Bright Yellow : BG Yellow : BG Bright Yellow
  'B', 'BB', 'bgB', 'bgBB',     // Blue : Bright Blue : BG Blue : BG Bright Blue
  'M', 'BM', 'bgM', 'bgBM',     // Magenta : Bright Magenta : BG Magenta : BG Bright Magenta
  'C', 'BC', 'bgC', 'bgBC',     // Cyan : Bright Cyan : BG Cyan : 
  'W', 'BW', 'bgW', 'bgBW',     // White : Bright White : BG White : BG Bright White
  'GR', 'bgGR',                 // Gray : BG Gray

  // Custom modifiers
  '.u', '_',              // Underline
  '.b', '^', '**',        // Bold
  '.i', '*',              // Italic
  '.I', '!',              // Inverse
  '.s', '-',              // Strikethrough
  '.d', '~',              // Dim
] as const;


function _translate<T extends ColorFormat | string>(format: T): ColorFormat | null {
  if (typeof format === 'undefined' || format === null) return 'reset';

  format = (typeof format === 'string' ? format.trim() : format) as T;
  if (BUILTIN_COLORS.includes(format as typeof BUILTIN_COLORS[number])) return format as ColorFormat;

  let trFormat: ColorFormat | null = null;
  switch (format) {
    // Reset
    case 0:
    case '0':
      trFormat = 'reset';
      break;
    // Black
    case 'BK': trFormat = 'black'; break;
    case 'BBK': trFormat = 'blackBright'; break;
    case 'bgBK': trFormat = 'bgBlack'; break;
    // Red
    case 'R': trFormat = 'red'; break;
    case 'BR': trFormat = 'redBright'; break;
    case 'bgR': trFormat = 'bgRed'; break;
    case 'bgBR': trFormat = 'bgRedBright'; break;
    // Green
    case 'G': trFormat = 'green'; break;
    case 'BG': trFormat = 'greenBright'; break;
    case 'bgG': trFormat = 'bgGreen'; break;
    case 'bgBG': trFormat = 'bgGreenBright'; break;
    // Yellow
    case 'Y': trFormat = 'yellow'; break;
    case 'BY': trFormat = 'yellowBright'; break;
    case 'bgY': trFormat = 'bgYellow'; break;
    case 'bgBY': trFormat = 'bgYellowBright'; break;
    // Blue
    case 'B': trFormat = 'blue'; break;
    case 'BB': trFormat = 'blueBright'; break;
    case 'bgB': trFormat = 'bgBlue'; break;
    case 'bgBB': trFormat = 'bgBlueBright'; break;
    // Magenta
    case 'M': trFormat = 'magenta'; break;
    case 'BM': trFormat = 'magentaBright'; break;
    case 'bgM': trFormat = 'bgMagenta'; break;
    case 'bgBM': trFormat = 'bgMagentaBright'; break;
    // Cyan
    case 'C': trFormat = 'cyan'; break;
    case 'BC': trFormat = 'cyanBright'; break;
    case 'bgC': trFormat = 'bgCyan'; break;
    case 'bgBC': trFormat = 'bgCyanBright'; break;
    // White
    case 'W': trFormat = 'white'; break;
    case 'BW': trFormat = 'whiteBright'; break;
    case 'bgW': trFormat = 'bgWhite'; break;
    case 'bgBW': trFormat = 'bgWhiteBright'; break;
    // Gray
    case 'GR': trFormat = 'gray'; break;
    case 'bgGR': trFormat = 'bgGray'; break;

    // -- Modifiers
    // Underline
    case '.u':
    case '_':
      trFormat = 'underline';
      break;
    // Bold
    case '.b':
    case '^':
    case '**':
      trFormat = 'bold';
      break;
    // Italic
    case '.i':
    case '*':
      trFormat = 'italic';
      break;
    // Inverse
    case '.I':
    case '!':
      trFormat = 'inverse';
      break;
    // Strikethrough
    case '.s':
    case '-':
      trFormat = 'strikethrough';
      break;
    // Dim
    case '.d':
    case '~':
      trFormat = 'dim';
      break;
  }

  return trFormat || format as ColorFormat;
}

/**
 * Formats given texts with specified text format styles.
 *
 * This function extends to `util.styleText` function but with additional custom
 * format style aliases and errors handled gracefully.
 *
 * @param format - The format styles to use, can be an array.
 * @param  texts - Texts to be formatted. If multiple text or an array
 *                 array is given, concatenate them with separated by a space.
 * @returns The ANSI formatted text.
 *
 * @internal
 * @since   5.0.0
 */
export function style(format: ColorFormat | ColorFormat[], ...texts: string[]): string {
  const text = texts.join(' ');
  const formats: ColorFormat[] = Array.isArray(format) ? format : [format];
  const codes = formats
    .map(_translate)
    .filter((c): c is keyof typeof ANSI_CODES => !!c && c in ANSI_CODES)
    .flatMap(f => ANSI_CODES[f]);

  // If no valid codes, return the original text
  if (!codes.length) return text;

  let ansiText = '';
  codes.forEach(code => ansiText += CSI(code));
  ansiText += text + CSI(0);

  return ansiText;
}
