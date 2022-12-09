import {expect} from 'chai';
import {createSandbox, SinonSandbox} from 'sinon';
import {Context} from 'typedoc';
import {
  BuiltinExternalDriverConverter,
  ExternalConverter,
  KnownMethods,
  NAME_TYPES_MODULE,
} from '../../../lib/converter';
import {AppiumPluginLogger} from '../../../lib/logger';
import {initConverter} from '../helpers';

const NAME_FAKE_DRIVER_MODULE = '@appium/fake-driver';

describe('ExternalConverter', function () {
  let sandbox: SinonSandbox;

  beforeEach(function () {
    sandbox = createSandbox();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('constructor', function () {
    it('should instantiate a ExternalConverter', function () {
      const knownMethods: KnownMethods = new Map();
      const ctx = sandbox.createStubInstance(Context);
      const log = sandbox.createStubInstance(AppiumPluginLogger);
      expect(new ExternalConverter(ctx, log, knownMethods)).to.be.an.instanceof(ExternalConverter);
    });
  });

  describe('instance method', function () {
    describe('convert()', function () {
      let knownMethods: KnownMethods;

      before(async function () {
        const converter = await initConverter(BuiltinExternalDriverConverter, NAME_TYPES_MODULE);
        knownMethods = converter.convert();
      });
      it(`should find commands in ${NAME_FAKE_DRIVER_MODULE}`, async function () {
        const converter = await initConverter(ExternalConverter, NAME_FAKE_DRIVER_MODULE, [
          knownMethods,
        ]);
        const result = converter.convert();
        expect(result.size).to.be.above(0);
      });

      it(`should only work with an Appium extension`, async function () {
        const converter = await initConverter(ExternalConverter, NAME_TYPES_MODULE, [knownMethods]);
        expect(converter.convert()).to.be.empty;
      });
    });
  });
});
