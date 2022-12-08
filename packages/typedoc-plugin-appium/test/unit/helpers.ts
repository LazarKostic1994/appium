import {expect} from 'chai';
import assert from 'node:assert';
import path from 'node:path';
import pkgDir from 'pkg-dir';
import readPkg from 'read-pkg';
import {Constructor} from 'type-fest';
import {Application, Context, Converter, LogLevel, TSConfigReader} from 'typedoc';
import ts from 'typescript';
import {AppiumConverter} from '../../lib/converter';
import {AppiumPluginLogger} from '../../lib/logger';

export const TSConfigs = {
  Types: require.resolve('@appium/types/tsconfig.json'),
} as const;

export async function getEntryPoint(pkgName: string): Promise<string> {
  const cwd = await pkgDir(require.resolve(pkgName));
  if (!cwd) {
    throw new TypeError(`Could not find package ${pkgName}!`);
  }
  const pkg = await readPkg({cwd});
  assert(pkg.typedoc.entryPoint, `Could not find entry point for ${pkgName}!`);
  return path.join(cwd, pkg.typedoc.entryPoint);
}

export function getTypedocApp(pkgName: string, entryPoints: string[] = []): Application {
  const app = new Application();
  app.options.addReader(new TSConfigReader());
  const tsconfig = require.resolve(`${pkgName}/tsconfig.json`);
  app.bootstrap({
    excludeExternals: true,
    tsconfig,
    // @ts-ignore
    validation: true,
    plugin: ['none'],
    logLevel: LogLevel.Verbose,
    entryPoints,
  });
  // appiumTypeDocPlugin(app);
  return app;
}

export function getConverterProgram(app: Application): ts.Program {
  const program = ts.createProgram(app.options.getFileNames(), app.options.getCompilerOptions());

  const errors = ts.getPreEmitDiagnostics(program);
  expect(errors).to.be.empty;

  return program;
}
type ExtraParams<F> = F extends (ctx: Context, log: AppiumPluginLogger, ...rest: infer R) => any
  ? R
  : never;
export async function initConverter<T, C extends AppiumConverter<T>, A extends any = any>(
  cls: Constructor<C, [Context, AppiumPluginLogger, ...A[]]>,
  pkgName: string,
  extraArgs: A[] = []
): Promise<C> {
  const entryPoint = await getEntryPoint(pkgName);
  const app = getTypedocApp(pkgName, [entryPoint]);
  const program = getConverterProgram(app);
  const sourceFile = program.getSourceFile(entryPoint);
  assert(sourceFile, `Could not find source file ${entryPoint}!`);
  return await new Promise((resolve) => {
    app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (ctx: Context) => {
      const log = new AppiumPluginLogger(app.logger, 'appium-test');
      resolve(new cls(ctx, log, ...extraArgs));
    });
    app.converter.convert([
      {
        displayName: 'convert-test',
        program,
        sourceFile,
      },
    ]);
  });
}
