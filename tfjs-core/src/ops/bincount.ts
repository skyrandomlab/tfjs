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
import {Bincount, BincountAttrs, BincountInputs} from '../kernel_names';
import {NamedAttrMap} from '../kernel_registry';
import {Tensor1D} from '../tensor';
import {NamedTensorMap} from '../tensor_types';
import {convertToTensor} from '../tensor_util_env';
import {TensorLike} from '../types';
import * as util from '../util';

import {op} from './operation';

/**
 * Outputs a vector with length `size` and the same dtype as `weights`.
 *
 * If `weights` are empty, then index `i` stores the number of times the value
 * `i` is counted in `x`. If `weights` are non-empty, then index `i` stores the
 * sum of the value in `weights` at each index where the corresponding value in
 * `x` is `i`.
 *
 * Values in `x` outside of the range [0, size) are ignored.
 *
 * @param x The input int tensor, rank 1.
 * @param weights The weights tensor, must have the same shape as x, or a
 *     length-0 Tensor, in which case it acts as all weights equal to 1.
 * @param size Non-negative integer.
 *
 * @doc {heading: 'Operations', subheading: 'Reduction'}
 */
function bincount_<T extends Tensor1D>(
    x: T|TensorLike, weights: T|TensorLike, size: number): T {
  const $x = convertToTensor(x, 'x', 'bincount');
  const $weights = convertToTensor(weights, 'weights', 'bincount');

  util.assert(
      $x.dtype === 'int32',
      () => `Error in bincount: input ` +
          `dtype must be int32, but got ${$x.dtype}`);
  util.assert(size >= 0, () => `size must be non-negative, but got ${size}.`);
  util.assert(
      $weights.size === $x.size || $weights.size === 0,
      () => `Error in bincount: weights must have the same size as input or` +
          `0-length, but got input shape: ${$x.shape}, weights shape: ` +
          `${$weights.shape}.`);

  const inputs: BincountInputs = {x: $x, weights: $weights};
  const attrs: BincountAttrs = {size};

  return ENGINE.runKernel(
      Bincount, inputs as unknown as NamedTensorMap,
      attrs as unknown as NamedAttrMap);
}

export const bincount = op({bincount_});
