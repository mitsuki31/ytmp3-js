/**
 * @module    types/options
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Readable } from 'node:stream';
import type { Innertube } from 'youtubei.js';
import type { AnyClass, AnyFunction } from '#/types/utils';

/**
 * Type represents the expected option type.
 * @internal
 * @since 5.0.0
 */
export type OptionTypeDefinition =
  | 'string' | 'number' | 'boolean' | 'array' | 'function' | 'object' | 'undefined' | typeof Readable | typeof Innertube
  | ('string' | 'number' | 'boolean' | 'array' | 'function' | 'object' | 'undefined' | typeof Readable | typeof Innertube)[];

/**
 * Type represents the default value of an option.
 * @internal
 * @since 5.0.0
 */
export type OptionDefaultValue =
  | string
  | number
  | boolean
  | any[] | Record<string, any> | AnyFunction | AnyClass;

/**
 * Type represents the configuration of expected option.
 * @internal
 * @since 5.0.0
 */
export type OptionConfig =
  | [OptionTypeDefinition, null]
  | [OptionTypeDefinition, (OptionDefaultValue | null)?]
  | [OptionTypeDefinition, (OptionDefaultValue[] | null)?]
  | [OptionTypeDefinition, (OptionDefaultValue | OptionDefaultValue[] | null)?];
