import assert from 'node:assert';

import options from '../../lib/utils/options.js';
const { resolve } = options;

describe('module:options', function () {
  const testMessages = {
    resolve: [
      'should resolve options with correct types',
      'should apply default values for missing properties',
      'should reject invalid types and use default values',
      'should validate array type correctly',
      'should validate function type correctly',
      'should reject class constructors for function type',
      'should validate instance of a class correctly',
      'should reject incorrect class instance types',
      'should handle multiple expected types correctly',
      'should fallback when multiple expected types do not match'
    ]
  };

  describe('#resolve|#resolveOptions', function () {
    it(testMessages.resolve[0], function () {
      const input = { a: 42, b: 'hello', c: [1, 2, 3] };
      const expected = {
        a: ['number', 0],
        b: ['string', 'default'],
        c: ['array', []],
      };

      const result = resolve(input, expected);
      assert.deepStrictEqual(result, { a: 42, b: 'hello', c: [1, 2, 3] });
    });

    it(testMessages.resolve[1], function () {
      const input = { a: 10 };
      const expected = {
        a: ['number', 0],
        b: ['string', 'default'],
      };

      const result = resolve(input, expected);
      assert.deepStrictEqual(result, { a: 10, b: 'default' });
    });

    it(testMessages.resolve[2], function () {
      const input = { a: 'not a number', b: 50 };
      const expected = {
        a: ['number', 100],
        b: ['string', 'default'],
      };

      const result = resolve(input, expected);
      assert.deepStrictEqual(result, { a: 100, b: 'default' });
    });

    it(testMessages.resolve[3], function () {
      const input = { arr: 'not an array' };
      const expected = { arr: ['array', []] };

      const result = resolve(input, expected);
      assert.deepStrictEqual(result, { arr: [] });
    });

    it(testMessages.resolve[4], function () {
      const input = { func: function () {} };
      const expected = { func: ['function', null] };

      const result = resolve(input, expected);
      assert.strictEqual(typeof result.func, 'function');
    });

    it(testMessages.resolve[5], function () {
      class TestClass {}
      const input = { func: TestClass };
      const expected = { func: ['function', null] };

      const result = resolve(input, expected);
      assert.strictEqual(result.func, null);
    });

    it(testMessages.resolve[6], function () {
      class CustomClass {}
      const input = { instance: new CustomClass() };
      const expected = { instance: [CustomClass, null] };

      const result = resolve(input, expected);
      assert.ok(result.instance instanceof CustomClass);
    });

    it(testMessages.resolve[7], function () {
      class ClassA {}
      class ClassB {}
      const input = { instance: new ClassA() };
      const expected = { instance: [ClassB, null] };

      const result = resolve(input, expected);
      assert.strictEqual(result.instance, null);
    });

    it(testMessages.resolve[8], function () {
      const input = { value: 42 };
      const expected = { value: [['number', 'string'], 'fallback'] };

      const result = resolve(input, expected);
      assert.strictEqual(result.value, 42);
    });

    it(testMessages.resolve[9], function () {
      const input = { value: true };
      const expected = { value: [['number', 'string'], 'fallback'] };

      const result = resolve(input, expected);
      assert.strictEqual(result.value, 'fallback');
    });
  });
});
