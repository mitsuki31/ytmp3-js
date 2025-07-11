/**
 * @module    utils/progressbar/loadingBar
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

/** Default character used to fill the moving segment. */
export const DEFAULT_FILL_CHAR = '\u2595';   // Full block character
/** Default character used for the empty parts of the segment bar. */
export const DEFAULT_EMPTY_CHAR = '\u2591';  // Light shade character

export interface BarControl {
  /**
   * Starts the loading bar animation.
   * This method will begin the animation of the loading bar.
   *
   * @remarks
   * This method will do nothing if the bar is already running or if the stream is not a TTY.
   */
  start: () => void;
  /**
   * Stops the loading bar animation.
   *
   * @remarks The loading bar will not stop by itself; it must be stopped manually.
   */
  stop: () => void;
}

export interface CreateLoadingBarOptions {
  /** The message to display alongside the loading bar (placed behind the bar). */
  message?: string;
  /**
   * The total width of the loading bar (excluding brackets).
   * @default 40
   */
  barWidth?: number;
  /**
   * The length of the moving filled segment.
   * If exceeded from {@link barWidth}, the {@link barWidth} value will be used instead.
   * @default 8
   */
  segmentLength?: number;
  /**
   * The character used to fill the moving segment.
   * @see {@link DEFAULT_FILL_CHAR}
   */
  fillChar?: string;
  /**
   * The character used for the empty parts of the bar.
   * @see {@link DEFAULT_EMPTY_CHAR}
   */
  emptyChar?: string;
  /**
   * The time in milliseconds between each bar frame update.
   * @default 20
   */
  interval?: number;
}

/**
 * Creates and controls a non-progressive loading bar in TTY console.
 *
 * @param options - The options for the loading bar.
 * @returns An object with `start` and `stop` methods to control the loading bar.
 */
export function createLoadingBar(options?: CreateLoadingBarOptions): BarControl {
  let barIntervalId: NodeJS.Timeout | null = null;
  let currentPosition = 0; // Represents the start of the moving segment
  let direction = 1;       // 1 for moving right, -1 for moving left
  let longestLineLength = 0; // To ensure we clear the entire line

  options ??= {};
  const {
    message = '',
    barWidth = 40,
    fillChar = '\u2589',
    emptyChar = '\u2591',
    interval = 20,
  } = options;
  let { segmentLength = 8 } = options;

  // Ensure `segmentLength` doesn't exceed barWidth
  segmentLength = Math.min(segmentLength, barWidth);

  /**
   * Generates a single frame of the loading bar.
   * @param position - The starting position of the filled segment.
   * @returns The formatted loading bar string.
   * @ignore
   */
  const generateBarFrame = (position: number): string => {
    const barContent = [];
    for (let i = 0; i < barWidth; i++) {
      if (i >= position && i < position + segmentLength) {
        barContent.push(fillChar);
      } else {
        barContent.push(emptyChar);
      }
    }
    return `[${barContent.join('')}]`;
  };

  const start: BarControl["start"] = () => {
    // Bar is already running
    if (barIntervalId) return;
    if (!process.stdout.isTTY) return;  // Don't run in TTY mode

    barIntervalId = setInterval(() => {
      const barFrame = generateBarFrame(currentPosition);
      const line = `${message ? message + ' ' : ''}${barFrame}`;

      // Update the longest line length to ensure full clearing later
      longestLineLength = Math.max(longestLineLength, line.length);

      // Use \r to return the cursor to the beginning of the line
      process.stdout.write(`\r${line}`);

      // Move the segment
      currentPosition += direction;

      // Reverse direction if segment hits the boundaries
      // If moving right and hits or passes the right boundary
      if (direction === 1 && currentPosition >= barWidth - segmentLength) {
        direction = -1;
      }
      // If moving left and hits or passes the left boundary
      else if (direction === -1 && currentPosition <= 0) {
        direction = 1;
      }
    }, interval);
  };

  const stop: BarControl["stop"] = () => {
    if (barIntervalId) {
      clearInterval(barIntervalId);
      barIntervalId = null;
      currentPosition = 0; // Reset for next use
      direction = 1;       // Reset direction for next use

      if (process.stdout.isTTY) {
        process.stdout.cursorTo(0); // Move cursor to the start of the line
        process.stdout.clearLine(0); // Clear the current line
      }
    }
  };

  return { start, stop };
}
