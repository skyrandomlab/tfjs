
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
import {AvgPool3DGrad, AvgPool3DGradAttrs, AvgPool3DGradInputs} from '../kernel_names';
import {NamedAttrMap} from '../kernel_registry';
import {Tensor4D, Tensor5D} from '../tensor';
import {NamedTensorMap} from '../tensor_types';
import {convertToTensor} from '../tensor_util_env';
import {TensorLike} from '../types';
import * as util from '../util';

import {checkPadOnDimRoundingMode} from './conv_util';
import {op} from './operation';
import {reshape} from './reshape';

/**
 * Computes the backprop of a 3d avg pool.
 *
 * @param dy The dy error, of rank 5 of shape
 *     [batchSize, depth, height, width, channels].
 * assumed.
 * @param input The original input image, of rank 5 or rank4 of shape
 *     [batchSize, depth, height, width, channels].
 * @param filterSize The filter size:
 *     `[filterDepth, filterHeight, filterWidth]`.
 *     `filterSize` is a single number,
 *     then `filterDepth == filterHeight == filterWidth`.
 * @param strides The strides of the pooling:
 *     `[strideDepth, strideHeight, strideWidth]`. If
 *     `strides` is a single number, then `strideHeight == strideWidth`.
 * @param pad A string from: 'same', 'valid'. The type of padding algorithm
 *     used in the forward prop of the op.
 * @param dimRoundingMode A string from: 'ceil', 'round', 'floor'. If none is
 *     provided, it will default to truncate.
 */
function avgPool3dGrad_<T extends Tensor4D|Tensor5D>(
    dy: T|TensorLike, input: T|TensorLike,
    filterSize: [number, number, number]|number,
    strides: [number, number, number]|number, pad: 'valid'|'same'|number,
    dimRoundingMode?: 'floor'|'round'|'ceil'): T {
  const $dy = convertToTensor(dy, 'dy', 'avgPool3dGrad');
  const $input = convertToTensor(input, 'input', 'avgPool3dGrad');

  let dy5D = $dy as Tensor5D;
  let input5D = $input as Tensor5D;
  let reshapedTo5D = false;

  if ($input.rank === 4) {
    reshapedTo5D = true;
    dy5D = reshape(
        $dy, [1, $dy.shape[0], $dy.shape[1], $dy.shape[2], $dy.shape[3]]);
    input5D = reshape($input, [
      1, $input.shape[0], $input.shape[1], $input.shape[2], $input.shape[3]
    ]);
  }

  util.assert(
      dy5D.rank === 5,
      () => `Error in avgPool3dGrad: dy must be rank 5 but got rank ` +
          `${dy5D.rank}.`);
  util.assert(
      input5D.rank === 5,
      () => `Error in avgPool3dGrad: input must be rank 5 but got rank ` +
          `${input5D.rank}.`);
  checkPadOnDimRoundingMode('avgPool3dGrad', pad, dimRoundingMode);
  const inputs: AvgPool3DGradInputs = {dy: dy5D, input: input5D};
  const attrs: AvgPool3DGradAttrs = {filterSize, strides, pad, dimRoundingMode};

  // tslint:disable-next-line: no-unnecessary-type-assertion
  const res = ENGINE.runKernel(
                  AvgPool3DGrad, inputs as unknown as NamedTensorMap,
                  attrs as unknown as NamedAttrMap) as T;

  if (reshapedTo5D) {
    return reshape(
               res, [res.shape[1], res.shape[2], res.shape[3], res.shape[4]]) as
        T;
  }

  return res;
}

export const avgPool3dGrad = op({avgPool3dGrad_});
