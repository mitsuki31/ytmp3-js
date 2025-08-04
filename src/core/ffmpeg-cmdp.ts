/**
 * @module   core/ffmpeg-cmdp
 * @author   Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license  MIT
 * @since    5.0.0
 */

import fs from 'node:fs';
import childProcess from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import which from 'which';
import { createLogger, isDefined, isNullish, isString, NoneLogger } from '#/utils';
import { getSystemEnv, isDebugMode } from '#/runtime/env';

const logger = isDebugMode() ? createLogger('DEBUG') : NoneLogger;

/**
 * A map of basic audio codecs to their most common container formats.
 *
 * @public
 * @since 5.0.0
 */
export const BASIC_CODECS_MAP = {
  // Lossy codecs
  aac: ['mp4', 'm4a', 'aac'] as const,         // AAC is most often in MP4/M4A, but can be raw AAC
  mp3: ['mp3'] as const,                       // MP3 is almost always in .mp3
  opus: ['webm', 'ogg', 'opus'] as const,      // Opus is in Ogg, WebM, or raw .opus
  vorbis: ['ogg', 'webm'] as const,            // Vorbis is in Ogg or WebM
  amr: ['3gp', 'amr'] as const,                // AMR is in 3GP or raw .amr
  ac3: ['ac3', 'm2ts', 'ts'] as const,         // AC3 is in .ac3, MPEG-TS (.ts/.m2ts)

  // Lossless codecs
  flac: ['flac', 'ogg', 'mkv'] as const,       // FLAC is in .flac, Ogg, or Matroska (.mkv)
  alac: ['m4a', 'mp4', 'alac'] as const,       // ALAC is in M4A/MP4 or raw .alac
  pcm: ['wav', 'aiff', 'caf', 'pcm'] as const, // PCM is in WAV, AIFF, CAF, or raw .pcm
  wav: ['wav'] as const,                       // WAV is a container for PCM
  ulaw: ['wav', 'au', 'pcm'] as const,         // μ-law PCM is in WAV, AU, or raw .pcm
  alaw: ['wav', 'au', 'pcm'] as const,         // A-law PCM is in WAV, AU, or raw .pcm
};

/**
 * A map of basic audio encoders to their FFmpeg encoder names.
 *
 * This also can be used to map extension names to their corresponding encoders.
 *
 * @public
 * @since 5.0.0
 */
export const BASIC_ENCODERS_MAP = {
  // Lossy codecs
  aac: 'aac',              // Built-in FFmpeg AAC encoder (or 'libfdk_aac' if installed)
  mp3: 'libmp3lame',       // Best MP3 encoder; built-in in most ffmpeg builds
  opus: 'libopus',         // Official Opus encoder
  vorbis: 'libvorbis',     // Official Vorbis encoder
  amr: 'libopencore_amrnb',// For AMR-NB (narrowband)
  ac3: 'ac3',              // Native FFmpeg encoder

  // Lossless codecs
  flac: 'flac',            // Native FLAC encoder
  alac: 'alac',            // Native ALAC encoder
  pcm: 'pcm_s16le',        // PCM signed 16-bit little endian (standard)
  wav: 'pcm_s16le',        // WAV usually uses PCM signed 16-bit LE
  ulaw: 'pcm_mulaw',       // μ-law PCM
  alaw: 'pcm_alaw',        // A-law PCM
} as const;


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


/**
 * Returns the default (most common or preferred) container extension for a given audio codec.
 *
 * This function performs a case-insensitive lookup on the {@linkcode BASIC_CODECS_MAP}
 * and returns only the first container extension listed for the codec, which is assumed
 * to be the most suitable or standard container format for that codec.
 * 
 * This is useful when you want to suggest or enforce a default file extension
 * based on the chosen audio codec for output purposes.
 *
 * @param codec - The name of the audio codec (e.g., `"aac"`, `"mp3"`, `"opus"`).
 *                The lookup is case-insensitive.
 * 
 * @returns The primary container extension associated with the codec (e.g., `"mp4"` for `"aac"`),
 *          or `null` if the codec is not recognized or not mapped.
 *
 * @example
 * ```js
 * getContainerFromCodec('aac');      // "mp4"
 * getContainerFromCodec('OPUS');     // "webm"
 * getContainerFromCodec('unknown');  // null
 * ```
 *
 * @public
 * @since 5.0.0
 */
export function getContainerFromCodec(codec: string): string | null {
  const containers = BASIC_CODECS_MAP[codec.toLowerCase() as keyof typeof BASIC_CODECS_MAP];
  return containers ? containers[0] : null;
}

/**
 * Returns the default (primary) container extension associated with a given audio encoder.
 *
 * This function performs a case-insensitive lookup on the provided encoder name
 * (e.g., `"libmp3lame"`, `"aac"`, `"libopus"`) using {@linkcode getExtensionsFromEncoder}.
 * It returns the first container extension in the list, which is considered the most
 * standard or preferred file format for that encoder.
 *
 * This is particularly useful for automatically determining a suitable output
 * file extension when the encoder is selected directly (e.g., when using `-c:a` in FFmpeg).
 *
 * @param encoder - The encoder name as used by FFmpeg (e.g., `"libmp3lame"`, `"aac"`, "libopus").
 *                The comparison is case-insensitive.
 *
 * @returns The default container extension (e.g., `"mp3"` for `"libmp3lame"`),
 *          or `null` if the encoder is unrecognized or not mapped.
 *
 * @example
 * ```js
 * getContainerFromEncoder('libmp3lame');       // "mp3"
 * getContainerFromEncoder('AAC');              // "mp4"
 * getContainerFromEncoder('unknown_encoder');  // null
 * ```
 *
 * @public
 * @since 5.0.0
 */
export function getContainerFromEncoder(encoder: string): string | undefined {
  // Normalize the encoder to lowercase for case-insensitive comparison
  const containers = getExtensionsFromEncoder(encoder.toLowerCase());
  return containers ? containers[0] : undefined;
}

/**
 * Returns the audio encoder name (as used in FFmpeg) for a given file extension.
 *
 * This looks up the extension in the {@linkcode BASIC_CODECS_MAP}, then finds the corresponding
 * encoder from {@linkcode BASIC_ENCODERS_MAP}.
 *
 * @param ext - The file extension, with or without leading dot (e.g., `"mp3"` or `".mp3"`).
 * @returns The encoder name (e.g., `"libmp3lame"`) if found, otherwise `undefined`.
 *
 * @example
 * ```js
 * getEncoderFromExtension('mp3');   // "libmp3lame"
 * getEncoderFromExtension('.m4a');  // "aac"
 * ```
 *
 * @public
 * @since 5.0.0
 */
export function getEncoderFromExtension(ext: string): string | undefined {
  const cleanExt = ext.replace(/^\./, '').toLowerCase();

  for (const [codec, extensions] of Object.entries(BASIC_CODECS_MAP)) {
    if ((extensions as readonly string[]).includes(cleanExt)) {
      return BASIC_ENCODERS_MAP[codec as keyof typeof BASIC_ENCODERS_MAP];
    }
  }

  return undefined;
}

/**
 * Returns the list of file extensions typically associated with a given audio encoder.
 *
 * This reverses the lookup from {@linkcode BASIC_ENCODERS_MAP} to find the codec, then returns
 * the corresponding extension list from {@linkcode BASIC_CODECS_MAP}.
 *
 * @param encoder - The encoder name used in FFmpeg (e.g., `"libmp3lame"`).
 * @returns A readonly array of common file extensions for that encoder, or `undefined` if not found.
 *
 * @example
 * ```js
 * getExtensionsFromEncoder('libopus');     // ["webm", "ogg", "opus"]
 * getExtensionsFromEncoder('libmp3lame');  // ["mp3"]
 * ```
 *
 * @public
 * @since 5.0.0
 */
export function getExtensionsFromEncoder(encoder: string): readonly string[] | undefined {
  const codecEntry = Object.entries(BASIC_ENCODERS_MAP).find(
    ([, enc]) => enc === encoder
  );

  if (!codecEntry) return undefined;

  const [codec] = codecEntry;
  return BASIC_CODECS_MAP[codec as keyof typeof BASIC_CODECS_MAP];
}


async function getVersion(execPath: string, timeout = 5 * 1000): Promise<string | null> {
  logger.debug(`Getting ${execPath} version...`);
  const execFile = promisify(childProcess.execFile);
  const baseFile = path.basename(execPath, process.platform === 'win32' ? '.exe' : undefined);
  const versionRegex = new RegExp(`^${baseFile}\\sver(sion)?\\s((\\w+)?[0-9.-]+(\\w+)?)\\s.+`);

  const stdout: string = (await execFile(execPath, ['-version'], {
    encoding: 'utf8', windowsHide: true, timeout
  })).stdout;

  if (stdout) {
    const firstLine = stdout.split('\n')[0];
    const match = firstLine.match(versionRegex);
    const version = match ? match[2] : null;
    logger.debug(`${execPath} version: ${version}`);
    return version;
  }

  logger.debug(`Failed to get ${execPath} version`);
  return null;
}

async function getFfmpegOrFfprobe({ file, envName, timeout }: {
  file: "ffmpeg" | "ffprobe";
  envName?: string;
  timeout?: number;
}): Promise<[string, string] | null> {
  logger.debug(`Getting ${file} path from system environment...`)
  const envPath = getSystemEnv(envName ?? `${file.toUpperCase()}_PATH`);
  let toolPath: string | undefined;
  let toolVersion: string | undefined;

  // Check if the environment variable is set and valid
  if (isDefined(envPath)) {
    logger.debug(`Found ${file} path from system environment: ${envPath}`);
    toolPath = envPath.trim();
    try {
      // Check if the specified path exists and is executable
      // On Windows, the X_OK flag always true whenever the file is readable
      await fs.promises.access(toolPath, fs.constants.F_OK | fs.constants.X_OK);

      // Get the version of the tool at the specified path
      toolVersion = await getVersion(toolPath, timeout) ?? undefined;
    } catch (err) {
      // If the path is not valid or not executable, log the error
      logger.error(`Error accessing ${file} at ${envPath}:`, (err as Error).message);
      throw err;
    }
  } else {
    toolPath = await which(file);
    if (toolPath) {
      toolVersion = await getVersion(toolPath, timeout) ?? undefined;
    }
  }

  return !(toolPath && toolVersion) ? null : [toolPath, toolVersion];
}

/**
 * Gets the path and version of the FFmpeg executable.
 *
 * First, it will check the `FFMPEG_PATH` environment variable. If that refers to
 * an executable file, it will use that path. If the environment variable is not set,
 * it will attempts to search for the `ffmpeg` executable in the system's `PATH`.
 *
 * @param options - The options for getting the FFmpeg executable.
 * @param options.timeout - The timeout in milliseconds to wait for child process to get the version.
 *                          Defaults to 5000 ms (5 seconds).
 * @returns A promise that resolves to a tuple containing the path (`0`) and version (`1`) of FFmpeg,
 *          or `null` if FFmpeg is not found.
 *
 * @public
 * @since 5.0.0
 */
export async function getFfmpeg({ timeout }: {
  /** The timeout in milliseconds to wait for child process to get the version */
  timeout?: number;
} = {}) {
  return getFfmpegOrFfprobe({ file: 'ffmpeg', envName: 'FFMPEG_PATH', timeout });
}

/**
 * Gets the path and version of the FFprobe executable.
 *
 * First, it will check the `FFPROBE_PATH` environment variable. If that refers to
 * an executable file, it will use that path. If the environment variable is not set,
 * it will attempts to search for the `ffprobe` executable in the system's `PATH`.
 *
 * @param options - The options for getting the FFprobe executable.
 * @param options.timeout - The timeout in milliseconds to wait for child process to get the version.
 *                          Defaults to 5000 ms (5 seconds).
 * @returns A promise that resolves to a tuple containing the path (`0`) and version (`1`) of FFprobe,
 *          or `null` if FFprobe is not found.
 *
 * @public
 * @since 5.0.0
 */
export async function getFfprobe({ timeout }: {
  /** The timeout in milliseconds to wait for child process to get the version */
  timeout?: number;
} = {}) {
  return getFfmpegOrFfprobe({ file: 'ffprobe', envName: 'FFPROBE_PATH', timeout });
}

