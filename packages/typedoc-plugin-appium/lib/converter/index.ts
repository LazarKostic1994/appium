/**
 * Converts code parsed by TypeDoc into a data structure describing the commands and execute methods, which will later be used to create new {@linkcode typedoc#DeclarationReflection} instances in the TypeDoc context.
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

import {Context} from 'typedoc';
import {AppiumPluginLogger} from '../logger';
import {ModuleCommands} from '../model';
import {BaseMethodsConverter} from './base-methods';
import {BaseDriverConverter} from './base-driver';
import {ExternalConverter} from './external';

/**
 * Converts declarations into information about the commands found within
 * @param ctx - Current TypeDoc context
 * @param parentLog - Logger
 * @returns All commands found in the project
 */
export function convertCommands(ctx: Context, parentLog: AppiumPluginLogger): ModuleCommands {
  const log = parentLog.createChildLogger('converter');

  const typesConverter = new BaseMethodsConverter(ctx, log);
  const knownCommands = typesConverter.convert();

  const baseDriverConverter = new BaseDriverConverter(ctx, log, knownCommands);
  const baseDriverCommands = baseDriverConverter.convert();

  const externalConverter = new ExternalConverter(ctx, log, knownCommands);
  const externalCommands = externalConverter.convert();

  return new Map([...baseDriverCommands, ...externalCommands]);
}

export * from './base-methods';
export * from './base-driver';
export * from './builder';
export * from './external';
export * from './converter';
export * from './types';
export * from './utils';
