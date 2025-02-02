/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import {ENGINE} from '../engine';
import {Tile, TileAttrs, TileInputs} from '../kernel_names';
import {NamedAttrMap} from '../kernel_registry';
import {Tensor} from '../tensor';
import {NamedTensorMap} from '../tensor_types';
import {convertToTensor} from '../tensor_util_env';
import {Rank, ShapeMap, TensorLike} from '../types';
import {assertNonNegativeIntegerDimensions} from '../util_base';

import {clone} from './clone';
import {op} from './operation';
import {reshape} from './reshape';

/**
 * Broadcast an array to a compatible shape NumPy-style.
 *
 * The tensor's shape is compared to the broadcast shape from end to beginning.
 * Ones are prepended to the tensor's shape until it has the same length as
 * the broadcast shape. If input.shape[i]==shape[i], the (i+1)-th axis is
 * already broadcast-compatible. If input.shape[i]==1 and shape[i]==N, then
 * the input tensor is tiled N times along that axis (using tf.tile).
 *
 * @param input The tensor that is to be broadcasted.
 * @param shape The input is to be broadcast to this shape.
 *
 * @doc {heading: 'Tensors', subheading: 'Transformations'}
 */
function broadcastTo_<R extends Rank>(
    x: Tensor|TensorLike, shape: ShapeMap[R]): Tensor<R> {
  let input = convertToTensor(x, 'broadcastTo', 'x');
  const xShape = input.shape;

  assertNonNegativeIntegerDimensions(shape);

  if (shape.length < input.rank) {
    throw new Error(`broadcastTo(): shape.length=${shape.length} < input.rank=${
        input.rank}.`);
  }

  if (shape.length > input.rank) {
    const newShape = input.shape.slice();
    while (newShape.length < shape.length) {
      newShape.unshift(1);
    }
    input = reshape(input, newShape);
  }

  const inputShape = input.shape;
  const reps: number[] = Array.from(shape);
  for (let i = shape.length - 1; i >= 0; i--) {
    if (inputShape[i] === shape[i]) {
      reps[i] = 1;
    } else if (input.shape[i] !== 1) {
      throw new Error(
          `broadcastTo(): [${xShape}] cannot be broadcast to [${shape}].`);
    }
  }
  const axes = reps.map((n, i) => n > 1 ? i : -1).filter(i => i >= 0);

  if (axes.length === 0) {
    return clone(input) as Tensor<R>;
  }

  // TODO call broadcastTo kernel directly once backends implement broadcstTo
  const inputs: TileInputs = {x: input};
  const attrs: TileAttrs = {reps};
  return ENGINE.runKernel(
      Tile, inputs as unknown as NamedTensorMap,
      attrs as unknown as NamedAttrMap);
}

export const broadcastTo = op({broadcastTo_});
