import type { BaseProvider, Web3Provider } from '@ethersproject/providers'
import { createWeb3VueStoreAndActions } from '@web3-vue-org/store'
import type { Actions, Connector, Web3VueState, Web3VueStore } from '@web3-vue-org/types'
import type { ComputedRef, Ref } from 'vue'
import { computed, markRaw, reactive, ref, watchEffect, watch } from 'vue'

let DynamicProvider: typeof Web3Provider | null | undefined
async function importProvider(): Promise<void> {
  if (DynamicProvider === undefined) {
    try {
      const { Web3Provider } = await import('@ethersproject/providers')
      DynamicProvider = Web3Provider
    } catch {
      console.debug('@ethersproject/providers not available')
      DynamicProvider = null
    }
  }
}

export type Web3VueHooks = ReturnType<typeof getStateHooks> &
  ReturnType<typeof getDerivedHooks> &
  ReturnType<typeof getAugmentedHooks>

export type Web3VueSelectedHooks = ReturnType<typeof getSelectedConnector>

export type Web3VuePriorityHooks = ReturnType<typeof getPriorityConnector>

/**
 * Wraps the initialization of a `connector`. Creates a zustand `store` with `actions` bound to it, and then passes
 * these to the connector as specified in `f`. Also creates a variety of `hooks` bound to this `store`.
 *
 * @typeParam T - The type of the `connector` returned from `f`.
 * @param f - A function which is called with `actions` bound to the returned `store`.
 * @returns [connector, hooks, store] - The initialized connector, a variety of hooks, and a zustand store.
 */
export function initializeConnector<T extends Connector>(f: (actions: Actions) => T): [T, Web3VueHooks, Web3VueStore] {
  const [store, actions] = createWeb3VueStoreAndActions()

  const connector = f(actions)

  const stateHooks = getStateHooks(store)
  const derivedHooks = getDerivedHooks(stateHooks)
  const augmentedHooks = getAugmentedHooks<T>(connector, stateHooks, derivedHooks)

  return [connector, { ...stateHooks, ...derivedHooks, ...augmentedHooks }, store]
}

function computeIsActive({ chainId, accounts, activating }: Web3VueState) {
  return Boolean(chainId && accounts && !activating)
}

/**
 * Creates a variety of convenience `hooks` that return data associated with a particular passed connector.
 *
 * @param initializedConnectors - Two or more [connector, hooks(, useStore)] arrays, as returned from initializeConnector.
 * @returns hooks - A variety of convenience hooks that wrap the hooks returned from initializeConnector.
 */
export function getSelectedConnector(
  ...initializedConnectors: [Connector, Web3VueHooks][] | [Connector, Web3VueHooks, Web3VueStore][]
) {
  function getIndex(connector: Connector) {
    const index = initializedConnectors.findIndex(
      ([initializedConnector]: [Connector, Web3VueHooks] | [Connector, Web3VueHooks, Web3VueStore]) =>
        connector === initializedConnector
    )
    if (index === -1) throw new Error('Connector not found')
    return index
  }

  function useSelectedStore(connector: Ref<Connector>) {
    const store = computed(() => initializedConnectors[getIndex(connector.value)]?.[2] as Web3VueStore)
    if (!store.value) throw new Error('Stores not passed')
    return store
  }

  // the following code calls hooks in a map a lot, which violates the eslint rule.
  // this is ok, though, because initializedConnectors never changes, so the same hooks are called each time
  function useSelectedChainId(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].chainId.value)
  }

  function useSelectedAccounts(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].accounts.value)
  }

  function useSelectedIsActivating(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].isActivating.value)
  }

  function useSelectedAccount(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].account.value)
  }

  function useSelectedIsActive(connector: Ref<Connector>) {
    return computed(() => {
      return initializedConnectors[getIndex(connector.value)][1].isActive.value
    })
  }

  /**
   * @typeParam T - A type argument must only be provided if one or more of the connectors passed to
   * getSelectedConnector is using `connector.customProvider`, in which case it must match every possible type of this
   * property, over all connectors.
   */
  function useSelectedProvider<T extends BaseProvider = Web3Provider>(
    connector: Ref<Connector>
  ): ComputedRef<T | undefined> {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].provider.value) as unknown as ComputedRef<
      T | undefined
    >
  }

  function useSelectedENSNames(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].ENSNames.value)
  }

  function useSelectedENSName(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].ENSName.value)
  }

  return {
    useSelectedStore,
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedIsActivating,
    useSelectedAccount,
    useSelectedIsActive,
    useSelectedProvider,
    useSelectedENSNames,
    useSelectedENSName,
  }
}

/**
 * Creates a variety of convenience `hooks` that return data associated with the first of the `initializedConnectors`
 * that is active.
 *
 * @param initializedConnectors - Two or more [connector, hooks(, store)] arrays, as returned from initializeConnector.
 * @returns hooks - A variety of convenience hooks that wrap the hooks returned from initializeConnector.
 */
export function getPriorityConnector(
  ...initializedConnectors: [Connector, Web3VueHooks][] | [Connector, Web3VueHooks, Web3VueStore][]
) {
  const {
    useSelectedStore,
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedIsActivating,
    useSelectedAccount,
    useSelectedIsActive,
    useSelectedProvider,
    useSelectedENSNames,
    useSelectedENSName,
  } = getSelectedConnector(...initializedConnectors)

  const priorityConnectorIndex = computed(() => {
    const values = initializedConnectors.map(
      ([, { isActive }]: [Connector, Web3VueHooks] | [Connector, Web3VueHooks, Web3VueStore]) => isActive.value
    )
    return Math.max(
      values.findIndex((v) => v === true),
      0
    )
  })

  const priorityConnector = computed(() => {
    return initializedConnectors[priorityConnectorIndex.value]
  })

  const connector = computed(() => priorityConnector.value[0])

  function usePriorityStore() {
    return computed(() => priorityConnector.value[2])
  }

  function usePriorityChainId() {
    return computed(() => priorityConnector.value[1].chainId.value)
  }

  function usePriorityAccounts() {
    return computed(() => priorityConnector.value[1].accounts.value)
  }

  function usePriorityIsActivating() {
    return computed(() => priorityConnector.value[1].isActivating.value)
  }

  function usePriorityAccount() {
    return computed(() => priorityConnector.value[1].account.value)
  }

  function usePriorityIsActive() {
    return computed(() => priorityConnector.value[1].isActive.value)
  }

  /**
   * @typeParam T - A type argument must only be provided if one or more of the connectors passed to
   * getPriorityConnector is using `connector.customProvider`, in which case it must match every possible type of this
   * property, over all connectors.
   */
  function usePriorityProvider() {
    return computed(() => priorityConnector.value[1].provider.value)
  }

  function usePriorityENSNames() {
    return computed(() => priorityConnector.value[1].ENSNames.value)
  }

  function usePriorityENSName() {
    return computed(() => priorityConnector.value[1].ENSName.value)
  }

  return {
    priorityConnector: connector,
    useSelectedStore,
    useSelectedChainId,
    useSelectedAccounts,
    useSelectedIsActivating,
    useSelectedAccount,
    useSelectedIsActive,
    useSelectedProvider,
    useSelectedENSNames,
    useSelectedENSName,
    usePriorityStore,
    usePriorityChainId,
    usePriorityAccounts,
    usePriorityIsActivating,
    usePriorityAccount,
    usePriorityIsActive,
    usePriorityProvider,
    usePriorityENSNames,
    usePriorityENSName,
  }
}

function getStateHooks(store: Web3VueStore) {
  const chainId: ComputedRef<Web3VueState['chainId']> = computed(() => store.state.value.chainId)

  const accounts: ComputedRef<Web3VueState['accounts']> = computed(() => store.state.value.accounts)

  const isActivating: ComputedRef<Web3VueState['activating']> = computed(() => store.state.value.activating)

  return { chainId, accounts, isActivating }
}

function getDerivedHooks({ chainId, accounts, isActivating }: ReturnType<typeof getStateHooks>) {
  const account: ComputedRef<string | null> = computed(() => (accounts.value?.[0] ? accounts.value[0] : null))
  const isActive: ComputedRef<boolean> = computed(() =>
    computeIsActive({
      chainId: chainId.value,
      accounts: accounts.value,
      activating: isActivating.value,
    })
  )

  return { account, isActive }
}

/**
 * @returns ENSNames - An array of length `accounts.length` which contains entries which are either all `undefined`,
 * indicated that names cannot be fetched because there's no provider, or they're in the process of being fetched,
 * or `string | null`, depending on whether an ENS name has been set for the account in question or not.
 */
async function useENS(provider: BaseProvider, accounts: string[]): Promise<undefined[] | (string | null)[]> {
  if (accounts.length) {
    try {
      return await Promise.all(accounts.map((account) => provider.lookupAddress(account)))
    } catch (e) {
      console.debug('Could not fetch ENS names', e)
      return Promise.resolve(new Array<null>(accounts.length).fill(null))
    }
  }

  return Promise.resolve([])
}

function getAugmentedHooks<T extends Connector>(
  connector: T,
  { accounts, chainId }: ReturnType<typeof getStateHooks>,
  { account, isActive }: ReturnType<typeof getDerivedHooks>
) {
  const loaded = ref(DynamicProvider !== undefined)
  // ensure that Provider is going to be available when loaded if @ethersproject/providers is installed
  watchEffect((onInvalidate) => {
    if (loaded.value) return
    let stale = false
    void importProvider().then(() => {
      if (stale) return
      loaded.value = true
    })
    onInvalidate(() => {
      stale = true
    })
  })

  const provider: ComputedRef<Web3Provider | undefined> = computed(() => {
    void loaded.value && isActive.value && chainId.value

    if (connector.customProvider) {
      return connector.customProvider as Web3Provider | undefined
    } else if (DynamicProvider && connector.provider) {
      return markRaw(new DynamicProvider(connector.provider, chainId.value))
    } else {
      return undefined
    }
  })

  const ensNames: Record<string, string | undefined | null> = reactive({})
  watch(
    [provider, accounts],
    ([newProvider, newAccounts], [], onCleanup) => {
      let stale = false
      if (newProvider && newAccounts) {
        useENS(newProvider, newAccounts).then((names) => {
          if (stale) return
          names.forEach((name, i) => {
            ensNames[newAccounts[i]] = name
          })
        })

        onCleanup(() => {
          stale = true
          for (const ensNamesKey in ensNames) {
            delete ensNames[ensNamesKey]
          }
        })
      }
    },
    { immediate: true }
  )

  const ENSNames: ComputedRef<(string | null | undefined)[]> = computed(() => Object.values(ensNames))

  const ENSName: ComputedRef<undefined | string | null> = computed(() => {
    return account.value ? ensNames[account.value] : undefined
  })

  return { provider, ENSName, ENSNames }
}
