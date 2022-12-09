import _ from 'lodash';
import pluralize from 'pluralize';
import {Context, DeclarationReflection, Reflection, ReflectionKind} from 'typedoc';
import {
  isAsyncMethodDeclarationReflection,
  isClassDeclarationReflection,
  isMethodMapDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {CommandInfo, ExecMethodDataSet, ModuleCommands, ParentReflection, RouteMap} from '../model';
import {AppiumConverter} from './converter';
import {convertExecuteMethodMap, convertMethodMap} from './method-map';
import {ClassDeclarationReflection, KnownMethods} from './types';
import {filterChildrenByGuard, findChildByNameAndGuard, findMethodsInClass} from './utils';

/**
 * Name of the static `newMethodMap` property in a Driver
 */
export const NAME_NEW_METHOD_MAP = 'newMethodMap';

/**
 * Name of the static `executeMethodMap` property in a Driver
 */
export const NAME_EXECUTE_METHOD_MAP = 'executeMethodMap';

/**
 * Name of the field in a method map's parameters prop which contains required parameters
 */
export const NAME_REQUIRED = 'required';
/**
 * Name of the field in a method map's parameters prop which contains optional parameters
 */
export const NAME_OPTIONAL = 'optional';
/**
 * Name of the field in an _execute_ method map which contains parameters
 */
export const NAME_PARAMS = 'params';
/**
 * Name of the command in a method map
 */
export const NAME_COMMAND = 'command';

/**
 * Name of the field in a _regular_ method map which contains parameters
 */
export const NAME_PAYLOAD_PARAMS = 'payloadParams';

/**
 * Converts declarations to information about Appium commands
 */

export class ExternalConverter extends AppiumConverter<ModuleCommands> {
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
    super(ctx, log);
    this.log.verbose('Known method count: %d', knownMethods.size);
  }

  findOverridenMethodDef(methodRef: DeclarationReflection): Reflection | undefined {
    if (isAsyncMethodDeclarationReflection(methodRef)) {
      return methodRef.inheritedFrom?.reflection ?? this.knownMethods.get(methodRef.name);
    }
  }

  /**
   * Converts declarations into command information
   *
   * @returns Command info for entire project
   */
  public override convert(): ModuleCommands {
    const ctx = this.ctx;
    const {project} = ctx;
    const projectCommands: ModuleCommands = new Map();

    // convert all modules (or just project if no modules)
    const modules = project.getChildrenByKind(ReflectionKind.Module);
    if (modules.length) {
      for (const mod of modules) {
        this.log.verbose('Converting module %s', mod.name);
        const cmdInfo = this.#convertModuleClasses(mod);
        if (cmdInfo.hasData) {
          projectCommands.set(mod, cmdInfo);
        }
      }
    } else {
      const cmdInfo = this.#convertModuleClasses(project);
      if (cmdInfo.hasData) {
        projectCommands.set(project, cmdInfo);
      }
    }

    if (projectCommands.size) {
      const routeSum = _.sumBy([...projectCommands], ([, info]) => info.routeMap.size);
      const execMethodSum = _.sumBy(
        [...projectCommands],
        ([, info]) => info.execMethodDataSet.size
      );
      this.log.info(
        `Found ${pluralize('command', routeSum, true)} and ${pluralize(
          'execute method',
          execMethodSum,
          true
        )} of %d/${pluralize('module', modules.length, true)}`,
        projectCommands.size
      );
    } else {
      this.log.warn('No commands nor execute methods found in entire project!');
    }

    return projectCommands;
  }

  /**
   * Finds commands in all classes within a project or module
   *
   * Strategy:
   *
   * 1. Given a module or project, find all classes
   * 2. For each class, find all async methods, which _can_ be commands
   * 3. Parse the `newMethodMap` of each class, if any
   * 4. For each method, look for it in either `newMethodMap` or the known methods
   * 5. Handle execute methods
   * @param parent - Project or module
   * @returns Info about the commands in given `parent`
   */
  #convertModuleClasses(parent: ParentReflection) {
    let routes: RouteMap = new Map();
    let executeMethods: ExecMethodDataSet = new Set();

    const classReflections = filterChildrenByGuard(parent, isClassDeclarationReflection);

    for (const classRef of classReflections) {
      this.log.verbose('Converting class %s', classRef.name);

      const methods = findMethodsInClass(classRef);
      this.log.verbose('Found %d interesting methods in class %s', methods.size, classRef.name);

      const newMethodMapRef = findChildByNameAndGuard(
        classRef,
        NAME_NEW_METHOD_MAP,
        isMethodMapDeclarationReflection
      );

      if (!newMethodMapRef) {
        this.log.verbose('No new method map in %s', classRef.name);
      } else {
        const newMethodMap = convertMethodMap.call(
          this,
          newMethodMapRef,
          classRef,
          methods,
          this.knownMethods
        );

        if (newMethodMap.size) {
          routes = new Map([...routes, ...newMethodMap]);
        }
      }

      const executeMethodMap = convertExecuteMethodMap.call(this, classRef, methods);
      if (executeMethodMap.size) {
        executeMethods = new Set([...executeMethods, ...executeMethodMap]);
      }
      this.log.verbose('Converted class %s', classRef.name);
    }

    return new CommandInfo(routes, executeMethods);
  }
}
