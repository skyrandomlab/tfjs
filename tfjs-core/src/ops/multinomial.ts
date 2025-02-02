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
import {Multinomial, MultinomialAttrs, MultinomialInputs} from '../kernel_names';
import {NamedAttrMap} from '../kernel_registry';
import {Tensor1D, Tensor2D} from '../tensor';
import {NamedTensorMap} from '../tensor_types';
import {convertToTensor} from '../tensor_util_env';
import {TensorLike} from '../types';

import {op} from './operation';
import {reshape} from './reshape';

/**
 * Creates a `tf.Tensor` with values drawn from a multinomial distribution.
 *
 * ```js
 * const probs = tf.tensor([.75, .25]);
 * tf.multinomial(probs, 3).print();
 * ```
 *
 * @param logits 1D array with unnormalized log-probabilities, or
 *     2D array of shape `[batchSize, numOutcomes]`. See the `normalized`
 *     parameter.
 * @param numSamples Number of samples to draw for each row slice.
 * @param seed The seed number.
 * @param normalized Whether the provided `logits` are normalized true
 *     probabilities (sum to 1). Defaults to false.
 * @return 1D array of shape `[numSamples]`, or 2D array of shape
 *     `[batchSize, numSamples]`, depending on the rank of the input.
 *
 * @doc {heading: 'Tensors', subheading: 'Random'}
 */
function multinomial_(
    logits: Tensor1D|Tensor2D|TensorLike, numSamples: number, seed?: number,
    normalized = false): Tensor1D|Tensor2D {
  const $logits = convertToTensor(logits, 'logits', 'multinomial');
  const numOutcomes = $logits.size;
  const origRank = $logits.rank;
  if (numOutcomes < 2) {
    throw new Error(
        `Error in multinomial: you need at least 2 outcomes, but got ` +
        `${numOutcomes}.`);
  }
  if (origRank > 2) {
    throw new Error(`Rank of probabilities must be 1 or 2, but is ${origRank}`);
  }
  // TODO(lina128): Investigate correct seed behavior. The code seems not allow
  // setting see to 0.
  seed = seed || Math.random();

  // The kernel only accepts (and returns) rank 2 tensors.
  const logits2D: Tensor2D =
      origRank === 1 ? reshape($logits, [1, -1]) : $logits as Tensor2D;

  const inputs: MultinomialInputs = {logits: logits2D};
  const attrs: MultinomialAttrs = {numSamples, seed, normalized};

  // tslint:disable-next-line: no-unnecessary-type-assertion
  const res = ENGINE.runKernel(
                  Multinomial, inputs as unknown as NamedTensorMap,
                  attrs as unknown as NamedAttrMap) as Tensor2D;

  // tslint:disable-next-line:no-unnecessary-type-assertion
  return origRank === 1 ? reshape(res, [res.size]) as Tensor1D : res;
}

export const multinomial = op({multinomial_});
