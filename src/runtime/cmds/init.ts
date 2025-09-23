import { type Argv } from 'yargs';

import { URLUtils } from '#/utils/index.js';
import { isNonNullish } from '#/vendor/type-utils.js';
import { ArgumentParserError, IDValidationError, URLValidationError } from '#error';
import { TITLES, help, version, copyright, printConfig } from '#runtime/cli_conf/misc.js';

// Other builders
import audioConvBuilder from './builders/audioconv.js';

export const command = '$0 [target..]';
export const describe = 'Download YouTube audio from specified URLs or IDs, or from a file';

export function builder(yargs: Argv): Argv {
  yargs
    .positional('target', {
      description: 'One or more YouTube video URLs or IDs to download',
      type: 'string',
      array: true,
      required: false,
      conflicts: ['f']  // Conflict with --file / --batch option
    })
    .option('f', {
      alias: ['file', 'batch'],
      description: 'Path to a file containing URLs or IDs (one per line)',
      type: 'string',
      nargs: 1,
      normalize: true,
      group: TITLES.main
    })
    .option('cwd', {
      description: 'Working directory to perform operations in',
      type: 'string',
      default: '.',
      nargs: 1,
      normalize: true,
      group: TITLES.main
    })
    .option('o', {
      alias: ['out-dir', 'outDir'],
      description: 'Directory to save the downloaded files',
      type: 'string',
      default: '.',
      nargs: 1,
      normalize: true,
      group: TITLES.main
    })
    .option('c', {
      alias: 'config',
      description: 'Path to a custom configuration file',
      type: 'string',
      nargs: 1,
      normalize: true,
      group: TITLES.main
    })
    .option('q', {
      alias: ['quiet'],
      description: 'Suppress non-error messages',
      type: 'boolean',
      default: false,
      group: TITLES.main
    })
    .option('cache', {
      description: 'Use and store the video info cache',
      type: 'boolean',
      default: true,
      group: TITLES.main
    });

  // Need to call this first before misc options
  audioConvBuilder(yargs);

  yargs
    .option(help._, help)
    .option(version._, version)
    .option(copyright._, copyright)
    .option(printConfig._, printConfig)
  ;
  return yargs;
}

export function handler(yargs: Awaited<Argv["argv"]>) {
  if ((Array.isArray(yargs.URL) && yargs.URL.length > 0) && isNonNullish(yargs.file)) {
    throw new ArgumentParserError('Cannot use --file option with positional argument');
  }

  if (Array.isArray(yargs.URL)) {
    return (yargs.URL as string[]).forEach(url => {
      let isValid = false;
      let isUrl = false;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        isUrl = true;
        isValid = URLUtils.validateUrl(url, true);
      }
      isValid = URLUtils.validateId(url);

      if (!isValid) {
        throw new (isUrl ? URLValidationError : IDValidationError)(
          `Given YouTube video ${isUrl ? 'URL' : 'ID'} is invalid: ${url}`
        );
      }
    });
  }
}
