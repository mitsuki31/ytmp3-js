/**
 * @module    core/internal/session
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { Innertube } from 'youtubei.js';
import { type Logger, isNullish } from '#/utils/index.js';

/**
 * Resolves an Innertube session to use from the provided session or the global one.
 *
 * This function prioritizes the provided session over the global session.
 * However, if both sessions are `null`, it returns `null`.
 *
 * @param session - The provided Innertube session.
 * @param logger - The logger instance for logging debug messages.
 * @returns The retrieved Innertube session or `null` if no session is available.
 *
 * @internal
 * @since 5.0.0
 */
export function resolveSession(globalSession: Innertube | null, session: Innertube | null, logger: Logger): Innertube | null;
export function resolveSession(globalSession: null, session: null, logger: Logger): null;
export function resolveSession(globalSession: Innertube, session: null, logger: Logger): Innertube;
export function resolveSession(globalSession: null, session: Innertube, logger: Logger): Innertube;
export function resolveSession(globalSession: Innertube | null, session: Innertube | null, logger: Logger): Innertube | null {
  // Return null early if both provided and global sessions are null
  if (isNullish(session) && isNullish(globalSession)) return null;

  if (session instanceof Innertube) {
    // Prioritize the provided session, even if the global is available
    logger.debug('Using provided Innertube session...');
    return session;
  } else if (globalSession instanceof Innertube) {
    // Here we can use the global session if the provided one is not available
    logger.debug('Using global Innertube session...');
    return globalSession;
  }

  // Otherwise return null
  logger.debug('No Innertube session provided.');
  return null;
}
