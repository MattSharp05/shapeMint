// Basic Deno test skeleton for material mapping & simple shape of quote response (mocking network would be next step)
// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
import { getShapewaysMaterialId } from '../_shared/material-mapping.ts';

Deno.test('material mapping returns expected id', () => {
  const id = getShapewaysMaterialId('nylon-pa12-sls','white','default-nylonpa12-sls+fullcolor');
  if (id !== '6') throw new Error('Expected materialId 6');
});
