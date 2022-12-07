import ts from 'typescript';
import {AppiumTypesConverter, NAME_TYPES_MODULE} from '../../../lib/converter/appium-types';
import {expect} from 'chai';
import {getConverterProgram, getEntryPoint, getTypedocApp} from '../helpers';
import {Application, Context, Converter} from 'typedoc';
import {THEME_NAME, AppiumTheme} from '../../../lib/theme';
import {AppiumPluginLogger} from '../../../lib/logger';

describe('AppiumTypesConverter', function () {
  it('should be a class', async function () {
    expect(AppiumTypesConverter).to.be.a('function');
  });

  describe('instance method', function () {
    let program: ts.Program;
    let app: Application;
    let sourceFile: ts.SourceFile;

    beforeEach(async function () {
      this.timeout('5s');
      const entryPoint = await getEntryPoint(NAME_TYPES_MODULE);
      app = getTypedocApp(NAME_TYPES_MODULE, [entryPoint]);
      program = getConverterProgram(app);
      const file = program.getSourceFile(entryPoint);
      expect(file).to.be.a.string;
      sourceFile = file as ts.SourceFile;
    });

    describe('convert()', function () {
      it('should find stuff in types', async function () {
        this.timeout('10s');
        const converter = await new Promise<AppiumTypesConverter>((resolve) => {
          app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (ctx: Context) => {
            const log = new AppiumPluginLogger(app.logger, 'appium-test');
            resolve(new AppiumTypesConverter(ctx, log));
          });
          app.converter.convert([
            {
              displayName: 'test',
              program,
              sourceFile,
            },
          ]);
        });

        expect(converter.convert().size).to.be.above(0);
      });
    });
  });
});
