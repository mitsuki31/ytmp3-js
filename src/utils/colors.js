/**
 * Provides ANSI text color formats and the styling utility.
 *
 * @module    utils/colors
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @license   MIT
 * @since     2.0.0
 */

'use strict';

const { styleText, inspect } = require('node:util');
const { isNullOrUndefined } = require('./type-utils');

/**
 * ANSI escape sequence.
 * @param {string} code
 * @returns {string}
 * @package
 * @since 2.0.0
 */
const CSI = (code) => `\x1b[${code}`;
const BUILTIN_COLORS = Object.keys(inspect.colors);

/**
 * A list contains all supported style formats for styling text.
 *
 * It extends the builtin color formats from `util.inspect.colors``property.
 *
 * @readonly
 * @package
 * @since 2.0.0
 */
const COLORS = Object.freeze([
  ...BUILTIN_COLORS,

  // Custom colors
  0, '0',                       // Reset
  'BK', 'BBK', 'bgBK',                 // Black : Bright Black : BG Black
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
]);


/**
 *
 * @param {?string} format
 * @returns {string | null}
 * @private
 * @since 2.0.0
 */
function _translate(format) {
  if (isNullOrUndefined(format)) return 'reset';

  format = typeof format === 'string' ? format.trim() : format;
  if (BUILTIN_COLORS.includes(format)) return format;

  let trFormat;
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

  return trFormat || format;
}

/**
 * Formats given texts with specified text format styles.
 *
 * This function extends to `util.styleText` function but with additional custom
 * format style aliases and errors handled gracefully.
 *
 * @param {string | string[]} format - The format styles to use, can be an array.
 * @param  {...string} texts - Texts to be formatted. If multiple text or an array
 *                             array is given, concatenate them with separated by a space. 
 * @returns {string} The formatted text.
 * @package
 * @since 2.0.0
 * @see   {@link module:utils/colors~COLORS COLORS}
 */
function style(format, ...texts) {
  if (!Array.isArray(format)) {
    return styleText(_translate(format), texts.join(' '));
  }

  const trFormats = format.map(fmt => _translate(fmt));
  return styleText(trFormats, texts.join(' '));
}

module.exports = {
  CSI,
  COLORS,
  style
};

