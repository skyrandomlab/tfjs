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
import {MaxPool3D, MaxPool3DAttrs, MaxPool3DInputs} from '../kernel_names';
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
 * Computes the 3D max pooling.
 *
 * ```js
 * const x = tf.tensor5d([1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 2, 2, 1]);
 * const result = tf.maxPool3d(x, 2, 1, 'valid');
 * result.print();
 * ```
 *
 * @param x The input tensor, of rank 5 or rank 4 of shape
 *     `[batch, depth, height, width, inChannels]`.
 * @param filterSize The filter size:
 *     `[filterDepth, filterHeight, filterWidth]`.
 *     If `filterSize` is a single number,
 *     then `filterDepth == filterHeight == filterWidth`.
 * @param strides The strides of the pooling:
 *     `[strideDepth, strideHeight, strideWidth]`.
 *     If `strides` is a single number,
 *     then `strideDepth == strideHeight == strideWidth`.
 * @param pad The type of padding algorithm.
 *    - `same` and stride 1: output will be of same size as input,
 *       regardless of filter size.
 *    - `valid`: output will be smaller than input if filter is larger
 *       than 1*1x1.
 *    - For more info, see this guide:
 *     [https://www.tensorflow.org/api_docs/python/tf/nn/convolution](
 *          https://www.tensorflow.org/api_docs/python/tf/nn/convolution)
 * @param dimRoundingMode A string from: 'ceil', 'round', 'floor'. If none is
 *     provided, it will default to truncate.
 * @param dataFormat An optional string from: "NDHWC", "NCDHW". Defaults to
 *     "NDHWC". Specify the data format of the input and output data. With the
 *     default format "NDHWC", the data is stored in the order of: [batch,
 *     depth, height, width, channels]. Only "NDHWC" is currently supported.
 * @doc {heading: 'Operations', subheading: 'Convolution'}
 */
function maxPool3d_<T extends Tensor4D|Tensor5D>(
    x: T|TensorLike, filterSize: [number, number, number]|number = [1, 1, 1],
    strides: [number, number, number]|number, pad: 'valid'|'same'|number,
    dimRoundingMode?: 'floor'|'round'|'ceil',
    dataFormat: 'NDHWC'|'NCDHW' = 'NDHWC'): T {
  const $x = convertToTensor(x, 'x', 'maxPool3d');

  let x5D = $x as Tensor5D;
  let reshapedTo5D = false;
  if ($x.rank === 4) {
    reshapedTo5D = true;
    x5D = reshape($x, [1, $x.shape[0], $x.shape[1], $x.shape[2], $x.shape[3]]);
  }

  util.assert(
      x5D.rank === 5,
      () => `Error in maxPool3d: x must be rank 5 but got rank ${x5D.rank}.`);
  util.assert(
      dataFormat === 'NDHWC',
      () => `Error in maxPool3d: Only NDHWC is currently supported, ` +
          `but got dataFormat of ${dataFormat}`);
  checkPadOnDimRoundingMode('maxPool3d', pad, dimRoundingMode);
  const inputs: MaxPool3DInputs = {x: x5D};
  const attrs:
      MaxPool3DAttrs = {filterSize, strides, pad, dimRoundingMode, dataFormat};

  // tslint:disable-next-line: no-unnecessary-type-assertion
  const res = ENGINE.runKernel(
                  MaxPool3D, inputs as unknown as NamedTensorMap,
                  attrs as unknown as NamedAttrMap) as T;

  if (reshapedTo5D) {
    return reshape(
               res, [res.shape[1], res.shape[2], res.shape[3], res.shape[4]]) as
        T;
  }

  return res;
}

export const maxPool3d = op({maxPool3d_});
