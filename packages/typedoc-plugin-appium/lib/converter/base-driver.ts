import {isBaseDriverDeclarationReflection} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {CommandInfo, ModuleCommands} from '../model';
import {ExternalConverter} from './external';
import {BaseDriverDeclarationReflection, KnownMethods} from './types';
import {Context} from 'typedoc';
import {findParentByName} from './utils';

/**
 * Name of the module which contains the builtin method map
 */
export const NAME_BUILTIN_COMMAND_MODULE = '@appium/base-driver';

export class BaseDriverConverter extends ExternalConverter {
  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(ctx: Context, log: AppiumPluginLogger, knownMethods: KnownMethods) {
    super(ctx, log.createChildLogger('base-driver'), knownMethods);
  }

  public override convert(): ModuleCommands {
    const {project} = this.ctx;
    const baseDriverCommands: ModuleCommands = new Map();
    // handle baseDriver if it's present
    const baseDriver = findParentByName(project, NAME_BUILTIN_COMMAND_MODULE);
    if (baseDriver && isBaseDriverDeclarationReflection(baseDriver)) {
      this.log.verbose('Found %s', NAME_BUILTIN_COMMAND_MODULE);
      baseDriverCommands.set(baseDriver, this.convertBaseDriver(baseDriver));
    } else {
      this.log.verbose('Did not find %s', NAME_BUILTIN_COMMAND_MODULE);
    }
    return baseDriverCommands;
  }

  protected convertBaseDriver(baseDriver: BaseDriverDeclarationReflection): CommandInfo {
    const baseDriverRoutes = this.convertMethodMap(baseDriver);
    if (!baseDriverRoutes.size) {
      throw new TypeError(`Could not find any commands in BaseDriver!?`);
    }

    // no execute commands in BaseDriver
    return new CommandInfo(baseDriverRoutes);
  }
}
