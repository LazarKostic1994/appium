import pluralize from 'pluralize';
import _ from 'lodash';
import {
  Comment,
  Context,
  DeclarationReflection,
  LiteralType,
  Reflection,
  ReflectionKind,
} from 'typedoc';
import {
  isAsyncMethodDeclarationReflection,
  isBaseDriverDeclarationReflection,
  isCommandPropDeclarationReflection,
  isExecMethodDefParamsPropDeclarationReflection,
  isExecMethodDefReflection,
  isHTTPMethodDeclarationReflection,
  isMethodDefParamNamesDeclarationReflection,
  isMethodMapDeclarationReflection,
  isReflectionWithReflectedType,
  isRoutePropDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {
  AllowedHttpMethod,
  CommandInfo,
  CommandMap,
  ExecMethodDataSet,
  ModuleCommands,
  ParentReflection,
  RouteMap,
} from '../model';
import {AppiumConverter} from './converter';
import {Guard, KnownMethods, MethodDefParamsPropDeclarationReflection} from './types';

/**
 * Name of the static `newMethodMap` property in a Driver
 */
export const NAME_NEW_METHOD_MAP = 'newMethodMap';

/**
 * Name of the static `executeMethodMap` property in a Driver
 */
export const NAME_EXECUTE_METHOD_MAP = 'executeMethodMap';

/**
 * Name of the builtin method map in `@appium/base-driver`
 */
export const NAME_METHOD_MAP = 'METHOD_MAP';

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
  }

  findOverridenMethodDef(methodRef: DeclarationReflection): Reflection | undefined {
    if (isAsyncMethodDeclarationReflection(methodRef)) {
      return (
        methodRef.inheritedFrom?.reflection ?? this.knownMethods.get(methodRef.name) ?? methodRef
      );
    }
  }

  /**
   * Converts declarations into command information
   *
   * @returns Command info for entire project
   */
  public convert(): ModuleCommands {
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
   * Extracts information about `MethodMap` objects
   * @param refl - Some reflection we want to inspect. Could refer to a module or a class
   * @returns Lookup of routes to {@linkcode CommandMap} objects
   */
  protected convertMethodMap(
    refl: DeclarationReflection,
    methods: KnownMethods = new Map()
  ): RouteMap {
    const routes: RouteMap = new Map();

    const methodMap = isBaseDriverDeclarationReflection(refl)
      ? refl.getChildByName(NAME_METHOD_MAP)
      : refl.getChildByName(NAME_NEW_METHOD_MAP);

    const matchedMethods = new Set();
    if (methodMap) {
      if (!isMethodMapDeclarationReflection(methodMap)) {
        // this is not unusual
        this.log.verbose('No method map found in class %s; skipping', refl.name);
        return routes;
      }

      const routeProps = filterChildrenByKind(methodMap, ReflectionKind.Property);

      if (!routeProps.length) {
        this.log.warn('No routes found in MethodMap of class %s; skipping', refl.name);
        return routes;
      }

      for (const routeProp of routeProps) {
        const {originalName: route} = routeProp;

        if (!isRoutePropDeclarationReflection(routeProp)) {
          this.log.warn('Empty route in %s.%s', refl.name, route);
          continue;
        }

        const httpMethodProps = filterChildrenByGuard(routeProp, isHTTPMethodDeclarationReflection);

        if (!httpMethodProps.length) {
          this.log.warn('No HTTP methods found in route %s.%s', refl.name, route);
          continue;
        }

        for (const httpMethodProp of httpMethodProps) {
          const {comment: mapComment, name: httpMethod} = httpMethodProp;

          const commandProp = findChildByGuard(httpMethodProp, isCommandPropDeclarationReflection);

          // commandProp is optional.
          if (!commandProp) {
            continue;
          }

          if (!_.isString(commandProp.type.value) || _.isEmpty(commandProp.type.value)) {
            this.log.warn('Empty command name found in %s.%s.%s', refl.name, route, httpMethod);
            continue;
          }

          const command = String(commandProp.type.value);

          let comment: Comment | undefined;

          const method = methods.get(command);

          if (method) {
            this.log.verbose(`Found method matching command ${command}`);
            if (method.comment) {
              // use the comment on the method implementation itself
              comment = method.comment;
            } else {
              // use the comment from the method's parent class, or failing that, `ExternalDriver`
              comment =
                method.inheritedFrom?.reflection?.comment ??
                this.knownMethods.get(command)?.comment;
            }
          } else {
            // use the comment from the `MethodMap` or failing that, `ExternalDriver`
            comment = mapComment ?? this.knownMethods.get(command)?.comment;
          }

          if (methods.has(command) || this.knownMethods.has(command)) {
            this.log.verbose('Matched command %s', command);
            matchedMethods.add(command);
          }

          const payloadParamsProp = findChildByGuard(
            httpMethodProp,
            isExecMethodDefParamsPropDeclarationReflection
          );
          const requiredParams = this.#convertRequiredCommandParams(payloadParamsProp);
          const optionalParams = this.#convertOptionalCommandParams(payloadParamsProp);

          const commandMap: CommandMap = routes.get(route) ?? new Map();

          commandMap.set(command, {
            command,
            requiredParams,
            optionalParams,
            httpMethod: httpMethod as AllowedHttpMethod,
            route,
            comment,
          });

          routes.set(route, commandMap);
        }
      }
    }

    for (const [name, method] of Object.entries(methods)) {
      if (!matchedMethods.has(name)) {
        this.log.warn(`Found known method not in map: ${name}`);
      }
    }

    return routes;
  }

  protected findMethodsInClass(classRefl: DeclarationReflection): KnownMethods {
    return new Map(
      classRefl
        .getChildrenByKind(ReflectionKind.Method)
        .filter((ref) => Boolean(this.findOverridenMethodDef(ref)))
        .map((method) => [method.name, method])
    );
  }

  /**
   * Finds names of parameters of a command in a method def
   * @param propName Either required or optional params
   * @param refl Parent reflection (`params` prop of method def)
   * @returns List of parameter names
   */
  #convertCommandParams(
    propName: typeof NAME_OPTIONAL | typeof NAME_REQUIRED,
    refl?: MethodDefParamsPropDeclarationReflection
  ): string[] {
    if (!refl) {
      return [];
    }

    const props = findChildByNameAndGuard(
      refl,
      propName,
      isMethodDefParamNamesDeclarationReflection
    );

    if (!props) {
      return [];
    }

    return props.type.target.elements.reduce((names, el: LiteralType) => {
      const stringValue = String(el.value);
      if (stringValue) {
        names.push(stringValue);
      }
      return names;
    }, [] as string[]);
  }

  /**
   * Gathers info about an `executeMethodMap` prop in a driver
   * @param refl A class which may contain an `executeMethodMap` static property
   * @returns List of "execute commands", if any
   */
  #convertExecuteMethodMap(refl: DeclarationReflection, methods: KnownMethods): ExecMethodDataSet {
    const executeMethodMap = findChildByGuard(refl, isExecMethodDefReflection);

    const commandRefs: ExecMethodDataSet = new Set();
    if (!executeMethodMap) {
      // no execute commands in this class
      return commandRefs;
    }

    const newMethodProps = filterChildrenByKind(executeMethodMap, ReflectionKind.Property);
    for (const newMethodProp of newMethodProps) {
      const {comment, originalName: script} = newMethodProp;

      const commandProp = findChildByGuard(newMethodProp, isCommandPropDeclarationReflection);

      if (!commandProp) {
        // this is unusual
        this.log.warn(
          'Execute method map in %s has no "command" property for %s',
          refl.name,
          script
        );
        continue;
      }

      if (!_.isString(commandProp.type.value) || _.isEmpty(commandProp.type.value)) {
        this.log.warn(
          'Execute method map in %s has an empty or invalid "command" property for %s',
          refl.name,
          script
        );
        continue;
      }
      const command = String(commandProp.type.value);

      const paramsProp = findChildByGuard(
        newMethodProp,
        isExecMethodDefParamsPropDeclarationReflection
      );
      const requiredParams = this.#convertRequiredCommandParams(paramsProp);
      const optionalParams = this.#convertOptionalCommandParams(paramsProp);
      commandRefs.add({
        command,
        requiredParams,
        optionalParams,
        script,
        comment,
      });
    }
    return commandRefs;
  }

  /**
   * Finds commands in all classes within a project or module
   * @param parent - Project or module
   * @returns Info about the commands in given `parent`
   */
  #convertModuleClasses(parent: ParentReflection) {
    let routes: RouteMap = new Map();
    let executeMethods: ExecMethodDataSet = new Set();

    const classReflections = parent.getChildrenByKind(ReflectionKind.Class);

    for (const classRefl of classReflections) {
      this.log.verbose('Converting class %s', classRefl.name);

      const methods = this.findMethodsInClass(classRefl);

      const newMethodMap = this.convertMethodMap(classRefl, methods);

      if (newMethodMap.size) {
        routes = new Map([...routes, ...newMethodMap]);
      }

      const executeMethodMap = this.#convertExecuteMethodMap(classRefl, methods);
      if (executeMethodMap.size) {
        executeMethods = new Set([...executeMethods, ...executeMethodMap]);
      }
      this.log.verbose('Converted class %s', classRefl.name);
    }

    return new CommandInfo(routes, executeMethods);
  }

  /**
   * Finds "optional" params in a method definition
   * @param methodDefRefl - Reflection of a method definition
   * @returns List of optional parameters
   */
  #convertOptionalCommandParams(
    methodDefRefl?: MethodDefParamsPropDeclarationReflection
  ): string[] {
    return this.#convertCommandParams(NAME_OPTIONAL, methodDefRefl);
  }

  /**
   * Finds "required" params in a method definition
   * @param methodDefRefl - Reflection of a method definition
   * @returns List of required parameters
   */
  #convertRequiredCommandParams(
    methodDefRefl?: MethodDefParamsPropDeclarationReflection
  ): string[] {
    return this.#convertCommandParams(NAME_REQUIRED, methodDefRefl);
  }
}

/**
 * Finds a child of a reflection by name and type guard
 * @param refl - Reflection to check
 * @param name - Name of child
 * @param guard - Guard function to check child
 * @returns Child if found, `undefined` otherwise
 * @internal
 */
export function findChildByNameAndGuard<
  T extends DeclarationReflection,
  G extends DeclarationReflection
>(refl: T, name: string, guard: Guard<G>): G | undefined {
  return (
    isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.find((child) => child.name === name && guard(child))
      : refl.children?.find((child) => child.name === name && guard(child))
  ) as G | undefined;
}

/**
 * Finds a child of a reflection by type guard
 * @param refl - Reflection to check
 * @param guard - Guard function to check child
 * @returns Child if found, `undefined` otherwise
 * @internal
 */
export function findChildByGuard<T extends DeclarationReflection, G extends DeclarationReflection>(
  refl: T,
  guard: Guard<G>
): G | undefined {
  return (
    isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.find(guard)
      : refl.children?.find(guard)
  ) as G | undefined;
}

/**
 * Filters children of a reflection by kind and whether they are of type {@linkcode DeclarationReflectionWithReflectedType}
 * @param refl - Reflection to check
 * @param kind - Kind of child
 * @returns Filtered children, if any
 * @internal
 */
export function filterChildrenByKind<T extends DeclarationReflection>(
  refl: T,
  kind: ReflectionKind
): DeclarationReflection[] {
  return (
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.getChildrenByKind(kind)
      : refl.getChildrenByKind(kind)) ?? ([] as DeclarationReflection[])
  );
}

/**
 * Filters children by a type guard
 * @param refl - Reflection to check
 * @param guard - Type guard function
 * @returns Filtered children, if any
 * @internal
 */
export function filterChildrenByGuard<
  T extends DeclarationReflection,
  G extends DeclarationReflection
>(refl: T, guard: Guard<G>): G[] {
  return (
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.filter(guard)
      : refl.children?.filter(guard)) ?? ([] as G[])
  );
}
