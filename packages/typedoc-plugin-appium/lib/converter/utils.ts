import {ProjectReflection} from 'typedoc';

export function findParentByName(project: ProjectReflection, name: string) {
  return project.name === name ? project : project.getChildByName(name);
}
