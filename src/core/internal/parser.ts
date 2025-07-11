/**
 * @module    core/internal/parser
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { getGlob } from '#/runtime/env';
import { STUB_CLASSES_DIR } from '#/utils/constants';
import { DefaultLogger, type Logger } from '#/utils/log';
import { calculateSHA256 } from '#/utils/hash';
import { createDirIfNotExist, logError, style } from '#/utils';

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

/**
 * Generates an auto-generated TypeScript stub class file for missing YouTube.js nodes.
 *
 * This utility function is crucial for debugging and contributing to the
 * [YouTube.js](https://github.com/LuanRT/YouTube.js) library.
 * When the library encounters a new or changed API response structure from YouTube and cannot
 * parse a specific node, it can generates a placeholder class definition. These stub classes
 * help developers identify the exact missing structure and provide a template for reporting
 * the issue and contributing a fix.
 *
 * ### Behavior with Existing Files (SHA256 Check)
 *
 * Before writing, this function will perform these checks:
 *   1. It constructs the full content of the stub class file that *would* be written.
 *   2. It calculates the SHA256 hash of this new content.
 *   3. If a file with the same `className.ts` already exists at the {@link outputDir}:
 *      - It reads the existing file's content and calculates its SHA256 hash.
 *      - **If the hashes match**, it means the existing file is identical to the one
 *        that would be generated. In this case, the function logs a debug message and
 *        **skips writing**, avoiding unnecessary file I/O operations.
 *      - **If the hashes differ**, it indicates that the existing file either has been
 *        modified externally or the new `classDefinition` represents an updated structure.
 *        The function logs a debug message indicating an overwrite and proceeds to
 *        write the new content, effectively updating the stub.
 *   4. If the file does not exist, it proceeds with generating and writing the new file.
 *
 * This robust comparison ensures that stub files are only written or overwritten when their
 * content genuinely changes, providing more reliable behavior and reducing disk writes.
 *
 * @param className - The name of the missing class/node for which to generate the stub.
 *                    This typically corresponds to the name of the missing `Renderer` or `Object`.
 * @param classDefinition - The raw TypeScript/JavaScript string definition of the class,
 *                          often extracted directly from the problematic API response.
 *                          This should be a valid class or interface definition body.
 * @param outputDir - Optional. The directory where the stub class file will be saved.
 *                    Defaults to {@link STUB_CLASSES_DIR}. The directory will be created if it doesn't exist.
 * @param logger - Optional. A custom logger instance to use for logging debug messages.
 *                 If not provided, the function will use the global logger from the environment.
 *
 * @returns A Promise that resolves when the stub class file has been successfully written.
 *          The promise will never reject if there's an error during file system operations
 *          (e.g., permissions, disk full), but will log the error.
 *
 * @internal
 * @since    5.0.0
 */
export async function generateStubClass(
  className: string,
  classDefinition: string,
  outputDir = STUB_CLASSES_DIR,
  logger?: Logger
): Promise<void> {
  const log = logger ?? getGlob('logger');
  const filePath = path.join(outputDir, `${className}.ts`);

  // Construct the full content that *would* be written
  const newContent = [
    '// -----------------------------------------------------------------------',
    `// ! This is an auto-generated stub class for '${className}'.`,
    '// ! It is auto-generated by YTMP3-JS to help retrieve the missing nodes.',
    '// ! Please do not touch or modify this file directly.',
    '// -----------------------------------------------------------------------',
    '// If you want to report it and help us resolve it, please do so at',
    '// <https://github.com/LuanRT/YouTube.js/issues>',
    '',
    classDefinition.trim() + '\n',  // Ensure the class definition ends with a newline
  ].join('\n');
  const newContentHash = calculateSHA256(newContent, 'utf-8');
  log?.debug(`Content hash for ${style('G', className)}: ${style('C', newContentHash)}`);

  if (fs.existsSync(filePath)) {
    const existingContent = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
    const existingContentHash = calculateSHA256(existingContent, 'utf-8');
    log?.debug(`Existing content hash for ${style('G', className)}: ${style('C', existingContentHash)}`);

    // If hashes match, the file content is identical, so skip writing
    if (existingContentHash === newContentHash) {
      log?.debug(`Stub class for ${style('G', className)} already exists and is identical. Skipping generation.`);
      return;
    } else {
      log?.debug(`Stub class for ${style('G', className)} exists but differs. Overwriting.`);
      // If hashes differ, proceed to write (fall through to the write logic below)
    }
  }

  // Ensure the output directory exists
  await createDirIfNotExist(outputDir);

  // Write the stub class to the file
  log?.debug(`Generating stub class for ${style('G', className)} at ${style('Y', filePath)}.`);
  try {
    await fs.promises.writeFile(filePath, newContent, { encoding: 'utf-8' });
    log?.debug(`Stub class for ${style('G', className)} generated successfully.`);
  } catch (err) {
    logError(
      `Failed to write stub class for ${style('G', className)} to ${style('Y', filePath)}: %s`,
      err as Error,
      DefaultLogger  // Use the default logger for error logging, as this will always available logger
    );
    // We do not throw an error here to avoid breaking the flow,
    // but we log the error for debugging purposes.
  }
}
