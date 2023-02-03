import { getAddress } from '@ethersproject/address'
import type { Actions, Web3VueState, Web3VueStateUpdate, Web3VueStore } from '@web3-vue/types'
import { defineStore } from 'pinia'
/**
 * MAX_SAFE_CHAIN_ID is the upper bound limit on what will be accepted for `chainId`
 * `MAX_SAFE_CHAIN_ID = floor( ( 2**53 - 39 ) / 2 ) = 4503599627370476`
 *
 * @see {@link https://github.com/MetaMask/metamask-extension/blob/b6673731e2367e119a5fee9a454dd40bd4968948/shared/constants/network.js#L31}
 */
export const MAX_SAFE_CHAIN_ID = 4503599627370476

function validateChainId(chainId: number): void {
  if (!Number.isInteger(chainId) || chainId <= 0 || chainId > MAX_SAFE_CHAIN_ID) {
    throw new Error(`Invalid chainId ${chainId}`)
  }
}

function validateAccount(account: string): string {
  return getAddress(account)
}

const DEFAULT_STATE = {
  chainId: undefined,
  accounts: undefined,
  activating: false,
}

let storeIndex = 0
export function createWeb3VueStoreAndActions(): [Web3VueStore, Actions] {
  const storeId = `web3-vue-store-${storeIndex++}`
  const store = defineStore<string, Web3VueState>(storeId,{
    state: () => Object.assign({}, DEFAULT_STATE)
  })()

  // flag for tracking updates so we don't clobber data when cancelling activation
  let nullifier = 0

  /**
   * Sets activating to true, indicating that an update is in progress.
   *
   * @returns cancelActivation - A function that cancels the activation by setting activating to false,
   * as long as there haven't been any intervening updates.
   */
  function startActivation(): () => void {
    const nullifierCached = ++nullifier

    store.$patch({ ...DEFAULT_STATE, activating: true })

    // return a function that cancels the activation iff nothing else has happened
    return () => {
      if (nullifier === nullifierCached) store.$patch({ activating: false })
    }
  }

  /**
   * Used to report a `stateUpdate` which is merged with existing state. The first `stateUpdate` that results in chainId
   * and accounts being set will also set activating to false, indicating a successful connection.
   *
   * @param stateUpdate - The state update to report.
   */
  function update(stateUpdate: Web3VueStateUpdate): void {
    // validate chainId statically, independent of existing state
    if (stateUpdate.chainId !== undefined) {
      validateChainId(stateUpdate.chainId)
    }

    // validate accounts statically, independent of existing state
    if (stateUpdate.accounts !== undefined) {
      for (let i = 0; i < stateUpdate.accounts.length; i++) {
        stateUpdate.accounts[i] = validateAccount(stateUpdate.accounts[i])
      }
    }

    nullifier++

    store.$patch((existingState) => {
      // determine the next chainId and accounts
      const chainId = stateUpdate.chainId ?? existingState.chainId
      const accounts = stateUpdate.accounts ?? existingState.accounts

      // ensure that the activating flag is cleared when appropriate
      let activating = existingState.activating
      if (activating && chainId && accounts) {
        activating = false
      }
      existingState.chainId = chainId
      existingState.accounts = accounts
      existingState.activating = activating
    })
  }

  /**
   * Resets connector state back to the default state.
   */
  function resetState(): void {
    nullifier++
    store.$patch({...DEFAULT_STATE})
  }

  return [store, { startActivation, update, resetState }]
}
