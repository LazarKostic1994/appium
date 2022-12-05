import pkgDir from 'pkg-dir';
import {expect} from 'chai';
import path from 'node:path';
import readPkg from 'read-pkg';
import {Application, LogLevel, TSConfigReader} from 'typedoc';
import ts from 'typescript';

export const TSConfigs = {
  Types: require.resolve('@appium/types/tsconfig.json'),
} as const;

export async function getEntryPoint(pkgName: string): Promise<string> {
  const cwd = await pkgDir(require.resolve(pkgName));
  if (!cwd) {
    throw new TypeError(`Could not find package ${pkgName}!`);
  }
  const pkg = await readPkg({cwd});
  return path.join(cwd, pkg.typedoc?.entryPoint ?? pkg.main);
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
