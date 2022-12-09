import {
  isBaseDriverDeclarationReflection,
  isClassDeclarationReflection,
  isMethodMapDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {CommandInfo, ModuleCommands} from '../model';
import {BaseDriverDeclarationReflection, KnownMethods} from './types';
import {Context} from 'typedoc';
import {findChildByNameAndGuard, findMethodsInClass, findParentReflectionByName} from './utils';
import {AppiumConverter} from './converter';
import {convertMethodMap} from './method-map';

/**
 * Name of the builtin method map in `@appium/base-driver`
 */
export const NAME_METHOD_MAP = 'METHOD_MAP';

export const NAME_BASE_DRIVER_CLASS = 'BaseDriver';

/**
 * Name of the module which contains the builtin method map
 */
export const NAME_BUILTIN_COMMAND_MODULE = '@appium/base-driver';

export class BuiltinMethodMapConverter extends AppiumConverter<ModuleCommands> {
  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(
    ctx: Context,
    log: AppiumPluginLogger,
    protected readonly knownMethods: KnownMethods
  ) {
    super(ctx, log.createChildLogger('builtin-method-map'));
  }

  public override convert(): ModuleCommands {
    const {project} = this.ctx;
    const baseDriverCommands: ModuleCommands = new Map();
    let methods: KnownMethods = new Map();

    const baseDriverRef = findParentReflectionByName(project, NAME_BUILTIN_COMMAND_MODULE);

    if (!isBaseDriverDeclarationReflection(baseDriverRef)) {
      this.log.verbose('Did not find %s', NAME_BUILTIN_COMMAND_MODULE);
      return baseDriverCommands;
    }

    this.log.verbose('Found %s', NAME_BUILTIN_COMMAND_MODULE);

    // we need base driver class to find methods implemented in it
    const baseDriverClassRef = findChildByNameAndGuard(
      baseDriverRef,
      NAME_BASE_DRIVER_CLASS,
      isClassDeclarationReflection
    );
    if (!baseDriverClassRef) {
      this.log.error(
        'Could not find %s in %s',
        NAME_BASE_DRIVER_CLASS,
        NAME_BUILTIN_COMMAND_MODULE
      );
    } else {
      methods = findMethodsInClass(baseDriverClassRef);
    }

    const methodMap = baseDriverRef.getChildByName(NAME_METHOD_MAP);

    if (!isMethodMapDeclarationReflection(methodMap)) {
      this.log.error('Could not find %s in %s', NAME_METHOD_MAP, NAME_BUILTIN_COMMAND_MODULE);
      return baseDriverCommands;
    }

    const baseDriverRoutes = convertMethodMap.call(this, methodMap, baseDriverRef, methods);

    if (!baseDriverRoutes.size) {
      this.log.error('Could not find any commands in %s!?', NAME_BUILTIN_COMMAND_MODULE);
      return baseDriverCommands;
    }

    baseDriverCommands.set(baseDriverRef, new CommandInfo(baseDriverRoutes));

    return baseDriverCommands;
  }
}
