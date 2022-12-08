import {expect} from 'chai';
import {createSandbox, SinonSandbox} from 'sinon';
import {Context} from 'typedoc';
import {BaseMethodsConverter, KnownMethods, NAME_TYPES_MODULE} from '../../../lib/converter';
import {AppiumPluginLogger} from '../../../lib/logger';
import {initConverter} from '../helpers';

describe('BaseMethodsConverter', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should instantiate a BaseMethodsConverter', function () {
      const ctx = sandbox.createStubInstance(Context);
      const log = sandbox.createStubInstance(AppiumPluginLogger);
      expect(new BaseMethodsConverter(ctx, log)).to.be.an.instanceof(BaseMethodsConverter);
    });
  });

  describe('instance method', function () {
    describe('convert()', function () {
      it(`should find ExternalDriver's method declarations in ${NAME_TYPES_MODULE}`, async function () {
        const converter = await initConverter(BaseMethodsConverter, NAME_TYPES_MODULE);
        expect(converter.convert().size).to.be.above(0);
      });

      it(`should only work with ${NAME_TYPES_MODULE}`, async function () {
        const converter = await initConverter(BaseMethodsConverter, '@appium/fake-plugin');
        expect(converter.convert()).to.be.empty;
      });
    });
  });
});
