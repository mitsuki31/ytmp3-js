/**
 * @module   core/helpers/handler
 * @author   Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license  MIT
 * @since    5.0.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { Writable } from 'node:stream';
import cliProgress from 'cli-progress';

import type { YTMP3GlobalState } from '#globals';
import { createDirIfNotExist, createStream, customDateFormat, isStreamClosed, isTTYStream, NoneLogger, normalizeFilename, style } from '#/utils';
import { getGlob, isDebugMode, runBeforeExit } from '#runtime/env';
import { defaultPreset } from '#/utils/progressbar';
import type { DownloadHandlerFunction } from '../internal/interfaces/options/DownloadOptions';

/**
 * Default download handler function for streaming content to a file.
 *
 * This handler provides robust features including:
 * - **Resume capability**: Automatically detects partial downloads and resumes from the last byte.
 * - **Progress bar**: Displays real-time download progress in the terminal using `cli-progress`.
 * - **Stall detection**: Implements a timeout to detect and throw an error if the download stalls.
 * - **Cancellation**: Supports AbortController signals for graceful cancellation.
 * - **Error handling**: Catches and enhances download errors with progress information.
 * - **Resource management**: Ensures file streams and progress bars are properly closed/stopped on completion or error.
 * - **TTY awareness**: Adapts progress bar rendering based on terminal capabilities.
 *
 * @param stream - The `ReadableStream<Uint8Array>` (e.g., from `fetch` API) providing the download data.
 * @param info - The video information object (`ytmp3.VideoInfo`).
 * @param options - An object containing download options, including:
 *   - Logger
 *   - Selected format
 *   - Output directory path
 *   - Filename
 *   - Quiet flag, and
 *   - Abort signal.
 *
 * @returns A promise that resolves with the absolute path of the downloaded file upon successful completion.
 *
 * @throws {Error} Thrown if one of the below conditions met:
 *   - If `selectedFormat.content_length` is not available.
 *   - If the download stalls for more than 5 seconds (hardcoded).
 *   - If the download is aborted via the `signal` (e.g., `SIGINT`).
 *   - For any underlying I/O write operation errors.
 *
 * @public
 * @since 5.0.0
 */
export const defaultHandler: DownloadHandlerFunction = async function defaultHandler(
  stream,
  info,
  { logger, selectedFormat, outDir, filename, quiet, signal }
) {
  logger = quiet ? NoneLogger : logger;
  const file = path.join(outDir, normalizeFilename(filename));  // Join the output directory and filename
  const reader = stream.getReader();         // Get the stream reader
  const idC = style(['**', 'BM'], info.videoId);
  const isTTY = isTTYStream(logger.stdout);
  const stdout = logger.stdout as NodeJS.WriteStream;

  // Create the output directory if not exists
  await createDirIfNotExist(outDir);

  function updateTime() {
    return customDateFormat(new Date(), isTTY);
  }

  // Initialize the CLI progress bar
  const bar = new cliProgress.SingleBar({
    hideCursor: true,            // Hide cursor during progress
    gracefulExit: true,          // Ensure proper exit even if progress bar isn't stopped manually
    clearOnComplete: false,      // Keep the progress bar visible after completion
    noTTYOutput: isDebugMode(),  // Optionally suppress TTY output if in debug mode
    notTTYSchedule: 500,         // Update interval for non-TTY output (e.g., for file logging)
    // Dynamically adjust bar size based on terminal width for better aesthetics
    barsize: ((stdout.columns ?? 80) >= 80)
      ? (stdout.columns / 1.5)
      : (((stdout.columns ?? 80) < 80) ? stdout.columns : 30) / 2,
    stream: stdout,              // Direct progress output to stdout
    align: 'left',               // Align progress bar to the left
  }, defaultPreset);

  let bytesWritten = 0;
  const totalBytes = selectedFormat.content_length ?? NaN;
  if (isNaN(totalBytes)) {
    // Throw an error if content length is not available
    throw new Error(`{${idC}} Failed to get content length for selected format`);
  }
  let valueMB = 0;
  const totalMB = totalBytes / (1024 ** 2);

  // Get the previous bytes written
  let bytesWrittenPrev = 0;
  if (fs.existsSync(file)) bytesWrittenPrev = (await fs.promises.stat(file)).size;
  if (bytesWrittenPrev && bytesWrittenPrev < totalBytes) {
    bytesWritten = bytesWrittenPrev;  // Override with the previous bytes written
    valueMB = bytesWritten / (1024 ** 2);
  }

  let hasCleanup = false;
  const cleanup = async () => {
    if (hasCleanup) return;
    hasCleanup = true;

    reader.releaseLock();
    bar.stop();
    if (fileStream instanceof Writable && !isStreamClosed(fileStream)) {
      await new Promise(resolve => (fileStream as Writable).end(resolve));
    }
  };

  if (bytesWritten) {
    logger.info(`{${idC}} Resuming download '${style('Y', info.title ?? '<unknown>')}' from ${
      style('C', valueMB.toFixed(2) + 'MiB')}...`);
    logger.debug(`Continue download from bytes ${style('C', String(bytesWritten))}...`);
  } else {
    logger.info(`{${idC}} Starting download '${style('Y', info.title ?? '<unknown>')}'...`);
  }

  let fileStream: fs.WriteStream | null = null;
  let completed = false;
  let hookIndex = -1;
  try {
    fileStream = createStream('w', file, {
      signal, start: bytesWritten, flags: bytesWritten ? 'a' : 'w'
    });
    console.log(fileStream.path.toString());
    const closeDownloadedFileStream = async () => {
      await cleanup();
    };

    // Attach hook to close the file stream before exit
    runBeforeExit(closeDownloadedFileStream);
    hookIndex = getGlob('__onExit', [] as YTMP3GlobalState["__onExit"])
      ?.indexOf(closeDownloadedFileStream) ?? -1;

    // Start the progress bar and assign initial values, if quiet disabled
    if (!quiet) {
      bar.start(totalBytes, 0, {
        time: updateTime(),
        value_mb: valueMB.toFixed(2),
        total_mb: totalMB.toFixed(2),
        percentage: '0'
      });
    }

    while (true) {
      let timeoutPromise: Promise<never> | null = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const err: Error & {
            bytesWritten?: number, totalBytes?: number, remainingBytes?: number
          } = new Error('Download timed out');
          err.bytesWritten = bytesWritten;
          err.totalBytes = totalBytes;
          err.remainingBytes = totalBytes - bytesWritten;
          reject(err);
        }, 5000);
      });
      const { value, done } = await Promise.race([reader.read(), timeoutPromise]);
      timeoutPromise = null;

      if (done) {
        completed = true;
        break;  // ! Crucial to break this infinite loop
      }

      // Throw an error if the operation is aborted
      signal?.throwIfAborted();

      bytesWritten += value.length;
      valueMB = bytesWritten / (1024 ** 2);

      // Update the progress bar
      if (!quiet) {
        bar.update(bytesWritten, {
          time: updateTime(),
          value_mb: valueMB.toFixed(2),
          total_mb: totalMB.toFixed(2),
          percentage: ((bytesWritten / totalBytes) * 100).toFixed(0)
        });
      }
      // Pipe the data to the file
      await new Promise<void>((res, rej) => {
        (fileStream as Writable).write(value, (err) => err ? rej(err) : res());
      });
    }
  } catch (err) {
    await cleanup();  // Ensure this always called first when error occurred
    if (err instanceof Error) {
      const newErr: Error & { bytesWritten?: number, totalBytes?: number, remainingBytes?: number } = err;
      // Inject some extra information to the error
      newErr.bytesWritten = bytesWritten;
      newErr.totalBytes = totalBytes;
      newErr.remainingBytes = totalBytes - bytesWritten;
      logger.error(`Download failed at ${style('R', String(bytesWritten))} bytes`);
      throw newErr;
    }
  } finally {
    if (completed && !quiet) {
      // Update the progress bar to 100%
      bar.update(totalBytes, {
        time: updateTime(),
        value_mb: totalMB.toFixed(2),
        total_mb: totalMB.toFixed(2),
        percentage: '100'
      });
    }
    // This will be called either in completion or error
    await cleanup();
    // We need to wait the progress bar to stop before write anything to used stream
    logger.debug(`Total bytes written: ${style('C', String(bytesWritten))}`);

    // Remove hook
    if (hookIndex !== -1) {
      getGlob('__onExit', [] as YTMP3GlobalState["__onExit"])?.splice(hookIndex, 1);
    }
  }

  return file;  // An absolute path of the downloaded file
}
