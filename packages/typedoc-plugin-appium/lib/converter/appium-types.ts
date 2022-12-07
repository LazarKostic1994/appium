import {Context, ProjectReflection, ReflectionKind} from 'typedoc';
import {
  isAppiumTypesReflection,
  isAsyncMethodDeclarationReflection,
  isExternalDriverDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {ParentReflection} from '../model';
import {KnownMethods} from './types';

export const NAME_TYPES_MODULE = '@appium/types';

export const NAME_EXTERNAL_DRIVER = 'ExternalDriver';

export class AppiumTypesConverter {
  #log: AppiumPluginLogger;

  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(protected ctx: Context, log: AppiumPluginLogger) {
    this.#log = log.createChildLogger('converter');
  }

  public convertKnownMethods(module: ParentReflection): KnownMethods {
    const externalDriver = module.getChildByName(NAME_EXTERNAL_DRIVER);
    if (isExternalDriverDeclarationReflection(externalDriver)) {
      const methodRefs = externalDriver.getChildrenByKind(ReflectionKind.Method);
      const methods = methodRefs.filter((method) => {
        return isAsyncMethodDeclarationReflection(method);
      });
      return new Map(methods.map((method) => [method.name, method]));
    }
    return new Map();
  }

  public convert(): KnownMethods {
    const {project} = this.ctx;
    let knownMethods: KnownMethods = new Map();

    const typesModule = findParentByName(project, NAME_TYPES_MODULE);
    if (typesModule && isAppiumTypesReflection(typesModule)) {
      this.#log.verbose('Found %s', NAME_TYPES_MODULE);
      knownMethods = this.convertKnownMethods(typesModule);
    } else {
      this.#log.verbose('Did not find %s', NAME_TYPES_MODULE);
    }
    return knownMethods;
  }
}

function findParentByName(project: ProjectReflection, name: string) {
  return project.name === name ? project : project.getChildByName(name);
}
