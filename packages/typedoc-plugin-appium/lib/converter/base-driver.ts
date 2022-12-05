import {isBaseDriverDeclarationReflection} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {CommandInfo, ModuleCommands} from '../model';
import {AppiumConverter} from './converter';
import {BaseDriverDeclarationReflection} from './types';
import {Context} from 'typedoc';

/**
 * Name of the module which contains the builtin method map
 */
export const NAME_BUILTIN_COMMAND_MODULE = '@appium/base-driver';

export class BaseDriverConverter extends AppiumConverter {
  #log: AppiumPluginLogger;

  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(ctx: Context, log: AppiumPluginLogger) {
    super(ctx, log);
    this.#log = log.createChildLogger('converter');
  }
  protected convertBaseDriver(baseDriver: BaseDriverDeclarationReflection): CommandInfo {
    const baseDriverRoutes = this.convertMethodMap(baseDriver);
    if (!baseDriverRoutes.size) {
      throw new TypeError(`Could not find any commands in BaseDriver!?`);
    }

    // no execute commands in BaseDriver
    return new CommandInfo(baseDriverRoutes);
  }

  public override convert(): ModuleCommands {
    const {project} = this.ctx;
    const baseDriverCommands: ModuleCommands = new Map();
    // handle baseDriver if it's present
    const baseDriver = project.getChildByName(NAME_BUILTIN_COMMAND_MODULE);
    if (baseDriver && isBaseDriverDeclarationReflection(baseDriver)) {
      this.#log.verbose('Found %s', NAME_BUILTIN_COMMAND_MODULE);
      baseDriverCommands.set(baseDriver, this.convertBaseDriver(baseDriver));
    } else {
      this.#log.verbose('Did not find %s', NAME_BUILTIN_COMMAND_MODULE);
    }
    return baseDriverCommands;
  }
}
