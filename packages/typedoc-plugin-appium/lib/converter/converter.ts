import {Context} from 'typedoc';
import {AppiumPluginLogger} from '../logger';

export abstract class AppiumConverter<T> {
  constructor(protected ctx: Context, protected log: AppiumPluginLogger) {}

  abstract convert(): T;
}
