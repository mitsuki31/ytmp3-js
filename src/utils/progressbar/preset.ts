/**
 * @module    utils/progressbar/preset
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { type Preset, Presets } from 'cli-progress';
import { style } from '#colors';

export default {
  format: `::|${style('C', '{bar}')}| {value_mb}/{total_mb}MiB | ${style('BG', '{percentage}%')}`,
  barCompleteChar: Presets.shades_classic.barCompleteChar,
  barIncompleteChar: Presets.shades_classic.barIncompleteChar,
} as Preset;
