import _ from 'lodash';
import {DeclarationReflection, ReflectionKind, Comment, LiteralType} from 'typedoc';
import {
  isRoutePropDeclarationReflection,
  isHTTPMethodDeclarationReflection,
  isCommandPropDeclarationReflection,
  isExecMethodDefParamsPropDeclarationReflection,
  isMethodDefParamNamesDeclarationReflection,
  isExecMethodDefReflection,
} from '../guards';
import {RouteMap, CommandMap, AllowedHttpMethod, ExecMethodDataSet} from '../model';
import {AppiumConverter} from './converter';
import {NAME_OPTIONAL, NAME_REQUIRED} from './external';
import {
  MethodMapDeclarationReflection,
  KnownMethods,
  MethodDefParamsPropDeclarationReflection,
} from './types';
import {
  filterChildrenByGuard,
  filterChildrenByKind,
  findChildByGuard,
  findChildByNameAndGuard,
} from './utils';

/**
 * Finds "optional" params in a method definition
 * @param methodDefRefl - Reflection of a method definition
 * @returns List of optional parameters
 */
function convertOptionalCommandParams(
  methodDefRefl?: MethodDefParamsPropDeclarationReflection
): string[] {
  return convertCommandParams(NAME_OPTIONAL, methodDefRefl);
}

/**
 * Finds names of parameters of a command in a method def
 * @param propName Either required or optional params
 * @param refl Parent reflection (`params` prop of method def)
 * @returns List of parameter names
 */
function convertCommandParams(
  propName: typeof NAME_OPTIONAL | typeof NAME_REQUIRED,
  refl?: MethodDefParamsPropDeclarationReflection
): string[] {
  if (!refl) {
    return [];
  }

  const props = findChildByNameAndGuard(refl, propName, isMethodDefParamNamesDeclarationReflection);

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
 * Finds "required" params in a method definition
 * @param methodDefRefl - Reflection of a method definition
 * @returns List of required parameters
 */
function convertRequiredCommandParams(
  methodDefRefl?: MethodDefParamsPropDeclarationReflection
): string[] {
  return convertCommandParams(NAME_REQUIRED, methodDefRefl);
}

/**
 * Extracts information about `MethodMap` objects
 * @param parentRef - Some reflection we want to inspect. Could refer to a module or a class
 * @returns Lookup of routes to {@linkcode CommandMap} objects
 */
export function convertMethodMap<T>(
  this: AppiumConverter<T>,
  methodMapRef: MethodMapDeclarationReflection,
  parentRef: DeclarationReflection,
  methods: KnownMethods,
  knownMethods: KnownMethods = new Map()
): RouteMap {
  const routes: RouteMap = new Map();

  const methodsNotInMethodMap = new Set(methods.keys());
  const routeProps = filterChildrenByKind(methodMapRef, ReflectionKind.Property);

  if (!routeProps.length) {
    this.log.warn('No routes found in MethodMap of class %s; skipping', parentRef.name);
    return routes;
  }

  for (const routeProp of routeProps) {
    const {originalName: route} = routeProp;

    if (!isRoutePropDeclarationReflection(routeProp)) {
      this.log.warn('Empty route in %s.%s', parentRef.name, route);
      continue;
    }

    const httpMethodProps = filterChildrenByGuard(routeProp, isHTTPMethodDeclarationReflection);

    if (!httpMethodProps.length) {
      this.log.warn('No HTTP methods found in route %s.%s', parentRef.name, route);
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
        this.log.warn('Empty command name found in %s.%s.%s', parentRef.name, route, httpMethod);
        continue;
      }

      const command = String(commandProp.type.value);

      let comment: Comment | undefined;

      const method = methods.get(command);

      if (method) {
        this.log.verbose(`Found method matching command ${command}`);
        methodsNotInMethodMap.delete(command);
        if (method.comment) {
          // use the comment on the method implementation itself
          comment = method.comment;
        } else {
          // use the comment from the method's parent class, or failing that, `ExternalDriver`
          comment = method.inheritedFrom?.reflection?.comment ?? knownMethods.get(command)?.comment;
        }
      } else {
        // use the comment from the `MethodMap` or failing that, `ExternalDriver`
        comment = mapComment ?? knownMethods.get(command)?.comment;
      }

      const payloadParamsProp = findChildByGuard(
        httpMethodProp,
        isExecMethodDefParamsPropDeclarationReflection
      );
      const requiredParams = convertRequiredCommandParams(payloadParamsProp);
      const optionalParams = convertOptionalCommandParams(payloadParamsProp);

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

  for (const method of methodsNotInMethodMap) {
    if (knownMethods.get(method)) {
      this.log.info('Found method %s from known methods', method);
    }
  }

  return routes;
}

/**
 * Gathers info about an `executeMethodMap` prop in a driver
 * @param refl A class which may contain an `executeMethodMap` static property
 * @returns List of "execute commands", if any
 */
export function convertExecuteMethodMap<T>(
  this: AppiumConverter<T>,
  refl: DeclarationReflection,
  methods: KnownMethods
): ExecMethodDataSet {
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
      this.log.warn('Execute method map in %s has no "command" property for %s', refl.name, script);
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
    const requiredParams = convertRequiredCommandParams(paramsProp);
    const optionalParams = convertOptionalCommandParams(paramsProp);
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
