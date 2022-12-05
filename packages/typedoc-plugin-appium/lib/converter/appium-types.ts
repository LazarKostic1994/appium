import {Context, DeclarationReflection, ProjectReflection} from 'typedoc';
import {isAppiumTypesReflection} from '../guards';
import {AppiumPluginLogger} from '../logger';

export const NAME_TYPES_MODULE = '@appium/types';

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

  public convertKnownMethods(): void {}

  public convert(): KnownMethods {
    const {project} = this.ctx;
    const knownMethods: KnownMethods = new Set();

    const typesModule = findParentByName(project, NAME_TYPES_MODULE);
    if (typesModule && isAppiumTypesReflection(typesModule)) {
      this.#log.verbose('Found %s', NAME_TYPES_MODULE);
    } else {
      this.#log.verbose('Did not find %s', NAME_TYPES_MODULE);
    }
    return knownMethods;
  }
}

function findParentByName(project: ProjectReflection, name: string) {
  return project.name === name ? project : project.getChildByName(name);
}

export type KnownMethods = Set<DeclarationReflection>;
