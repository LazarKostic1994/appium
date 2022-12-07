/**
 * Converts code parsed by TypeDoc into a data structure describing the commands and execute methods, which will later be used to create new {@linkcode DeclarationReflection} instances in the TypeDoc context.
 *
 * The logic in this module is highly dependent on Appium's extension API, and is further dependent on specific usages of TS types.  Anything that will be parsed successfully by this module must use a `const` type alias in TS parlance.  For example:
 *
 * ```ts
 * const METHOD_MAP = {
 *   '/status': {
 *     GET: {command: 'getStatus'}
 *   },
 *   // ...
 * } as const; // <-- required
 * ```
 * @module
 */

import {Context, DeclarationReflection, ReflectionKind} from 'typedoc';
import {isReflectionWithReflectedType} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {ModuleCommands} from '../model';
import {AppiumTypesConverter} from './appium-types';
import {BaseDriverConverter} from './base-driver';
import {ExternalConverter} from './external';
import {DeclarationReflectionWithReflectedType, Guard} from './types';

/**
 * Converts declarations into information about the commands found within
 * @param ctx - Current TypeDoc context
 * @param log - Logger
 * @returns All commands found in the project
 */
export function convertCommands(ctx: Context, log: AppiumPluginLogger): ModuleCommands {
  const typesConverter = new AppiumTypesConverter(ctx, log);
  const knownCommands = typesConverter.convert();
  const baseDriverConverter = new BaseDriverConverter(ctx, knownCommands, log);
  const baseDriverCommands = baseDriverConverter.convert();
  const externalConverter = new ExternalConverter(ctx, knownCommands, log);
  const externalCommands = externalConverter.convert();

  return new Map([...baseDriverCommands, ...externalCommands]);
}
