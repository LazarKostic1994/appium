import {expect} from 'chai';
import {createSandbox, SinonSandbox} from 'sinon';
import {Context} from 'typedoc';
import {
  BaseMethodsConverter,
  BaseDriverConverter,
  KnownMethods,
  NAME_TYPES_MODULE,
  NAME_BUILTIN_COMMAND_MODULE,
} from '../../../lib/converter';
import {AppiumPluginLogger} from '../../../lib/logger';
import {ModuleCommands} from '../../../lib/model';
import {initConverter} from '../helpers';

describe('BaseDriverConverter', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should instantiate a BaseDriverConverter', function () {
      const knownMethods: KnownMethods = new Map();
      const ctx = sandbox.createStubInstance(Context);
      const log = sandbox.createStubInstance(AppiumPluginLogger);
      expect(new BaseDriverConverter(ctx, log, knownMethods)).to.be.an.instanceof(
        BaseDriverConverter
      );
    });
  });

  describe('instance method', function () {
    describe('convert()', function () {
      beforeEach(async function () {
        this.timeout('5s');
      });

      it(`should find commands in ${NAME_BUILTIN_COMMAND_MODULE}`, async function () {
        const converter = await initConverter(BaseDriverConverter, NAME_BUILTIN_COMMAND_MODULE, [
          new Map(),
        ]);
        expect(converter.convert().size).to.be.above(0);
      });

      it(`should only work with ${NAME_BUILTIN_COMMAND_MODULE}`, async function () {
        const converter = await initConverter(BaseDriverConverter, '@appium/fake-plugin', [
          new Map(),
        ]);
        expect(converter.convert()).to.be.empty;
      });
    });
  });
});
