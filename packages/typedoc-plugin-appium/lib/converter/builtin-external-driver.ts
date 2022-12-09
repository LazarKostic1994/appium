import {Context, ReflectionKind} from 'typedoc';
import {
  isAppiumTypesReflection,
  isAsyncMethodDeclarationReflection,
  isExternalDriverDeclarationReflection,
} from '../guards';
import {AppiumPluginLogger} from '../logger';
import {AppiumConverter} from './converter';
import {AppiumTypesReflection, AsyncMethodDeclarationReflection, KnownMethods} from './types';
import {findParentReflectionByName} from './utils';

export const NAME_TYPES_MODULE = '@appium/types';

export const NAME_EXTERNAL_DRIVER = 'ExternalDriver';

export class BuiltinExternalDriverConverter extends AppiumConverter<KnownMethods> {
  /**
   * Creates a child logger for this instance
   * @param ctx Typedoc Context
   * @param log Logger
   */
  constructor(protected ctx: Context, log: AppiumPluginLogger) {
    super(ctx, log.createChildLogger('builtin-external-driver'));
  }

  public convertMethodDeclarations(refl: AppiumTypesReflection): KnownMethods {
    const externalDriver = refl.getChildByName(NAME_EXTERNAL_DRIVER);
    let methods: KnownMethods = new Map();

    if (!isExternalDriverDeclarationReflection(externalDriver)) {
      this.log.warn('Could not find %s in %s', NAME_EXTERNAL_DRIVER, NAME_TYPES_MODULE);
      return methods;
    }

    const methodRefs = externalDriver.getChildrenByKind(ReflectionKind.Method);

    if (!methodRefs.length) {
      this.log.warn('No methods found in %s', NAME_EXTERNAL_DRIVER);
      return methods;
    }

    methods = new Map(
      methodRefs.reduce(
        (methods, method) =>
          isAsyncMethodDeclarationReflection(method)
            ? [...methods, [method.name, method]]
            : methods,
        [] as [string, AsyncMethodDeclarationReflection][]
      )
    );

    this.log.verbose('Found %d method declarations in %s', methods.size, NAME_EXTERNAL_DRIVER);

    return methods;
  }

  public convert(): KnownMethods {
    const {project} = this.ctx;
    let methods: KnownMethods = new Map();

    const typesModule = findParentReflectionByName(project, NAME_TYPES_MODULE);
    if (!isAppiumTypesReflection(typesModule)) {
      this.log.warn('Invalid or missing %s', NAME_TYPES_MODULE);
      return methods;
    }

    methods = this.convertMethodDeclarations(typesModule);

    this.log.verbose('Found %s', NAME_TYPES_MODULE);

    return methods;
  }
}
