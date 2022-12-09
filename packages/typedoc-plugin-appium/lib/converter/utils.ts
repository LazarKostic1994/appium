import {
  isAsyncMethodDeclarationReflection,
  isParentReflection,
  isReflectionWithReflectedType,
} from '../guards';
import {DeclarationReflection, ProjectReflection, ReflectionKind} from 'typedoc';
import {ParentReflection} from '../model';
import {ClassDeclarationReflection, Guard, KnownMethods} from './types';

export function findParentReflectionByName(
  project: ProjectReflection,
  name: string
): ParentReflection | undefined {
  return project.name === name ? project : findChildByGuard(project, isParentReflection);
}

/**
 * Filters children by a type guard
 * @param refl - Reflection to check
 * @param guard - Type guard function
 * @returns Filtered children, if any
 * @internal
 */

export function filterChildrenByGuard<T extends ParentReflection, G extends DeclarationReflection>(
  refl: T,
  guard: Guard<G>
): G[] {
  return (
    (isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.filter(guard)
      : refl.children?.filter(guard)) ?? ([] as G[])
  );
}

/**
 * Finds a child of a reflection by type guard
 * @param refl - Reflection to check
 * @param guard - Guard function to check child
 * @returns Child if found, `undefined` otherwise
 * @internal
 */
export function findChildByGuard<T extends ParentReflection, G extends ParentReflection>(
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
  const predicate = (child: {name: string}) => child.name === name && guard(child);
  return (
    isReflectionWithReflectedType(refl)
      ? refl.type.declaration.children?.find(predicate)
      : refl.children?.find(predicate)
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
 * Finds _all_ async methods in a class
 * @param classRefl Class reflection
 * @returns Map of method names to method reflections
 */
export function findMethodsInClass(classRefl: ClassDeclarationReflection): KnownMethods {
  return new Map(
    filterChildrenByGuard(classRefl, isAsyncMethodDeclarationReflection).map((method) => [
      method.name,
      method,
    ])
  );
}
