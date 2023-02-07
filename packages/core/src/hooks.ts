import type { Networkish } from '@ethersproject/networks'
import type { BaseProvider, Web3Provider } from '@ethersproject/providers'
import { createWeb3VueStoreAndActions } from '@web3-vue-org/store'
import type { Actions, Connector, Web3VueState, Web3VueStore } from '@web3-vue-org/types'
import type { ComputedRef, Ref } from 'vue'
import { computed, ref, shallowRef, watchEffect } from 'vue'

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
  const [useStore, actions] = createWeb3VueStoreAndActions()

  const connector = f(actions)

  const stateHooks = getStateHooks(useStore)
  const derivedHooks = getDerivedHooks(stateHooks)
  const augmentedHooks = getAugmentedHooks<T>(connector, stateHooks, derivedHooks)

  return [connector, { ...stateHooks, ...derivedHooks, ...augmentedHooks }, useStore]
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
    return computed(() => initializedConnectors[getIndex(connector.value)][1].useChainId().value)
  }

  function useSelectedAccounts(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].useAccounts().value)
  }

  function useSelectedIsActivating(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].useIsActivating().value)
  }

  function useSelectedAccount(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].useAccount().value)
  }

  function useSelectedIsActive(connector: Ref<Connector>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].useIsActive().value)
  }

  /**
   * @typeParam T - A type argument must only be provided if one or more of the connectors passed to
   * getSelectedConnector is using `connector.customProvider`, in which case it must match every possible type of this
   * property, over all connectors.
   */
  function useSelectedProvider<T extends BaseProvider = Web3Provider>(
    connector: Ref<Connector>,
    network: Ref<Networkish | undefined>
  ): ComputedRef<T | undefined> {
    return computed(
      () => initializedConnectors[getIndex(connector.value)][1].useProvider(network).value
    ) as unknown as ComputedRef<T | undefined>
  }

  function useSelectedENSNames(connector: Ref<Connector>, provider: Ref<BaseProvider | undefined>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].useENSNames(provider).value)
  }

  function useSelectedENSName(connector: Ref<Connector>, provider: Ref<BaseProvider | undefined>) {
    return computed(() => initializedConnectors[getIndex(connector.value)][1].useENSName(provider).value)
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

  function usePriorityConnector() {
    const connector: Ref<Connector> = shallowRef(initializedConnectors[0][0])

    const values = initializedConnectors.map(
      ([, { useIsActive }]: [Connector, Web3VueHooks] | [Connector, Web3VueHooks, Web3VueStore]) => useIsActive()
    )
    values.forEach((value, i) => {
      watchEffect(() => {
        if (value.value) {
          connector.value = initializedConnectors[i][0]
        }
      })
    })

    return connector
  }

  function usePriorityStore() {
    return useSelectedStore(usePriorityConnector())
  }

  function usePriorityChainId() {
    return useSelectedChainId(usePriorityConnector())
  }

  function usePriorityAccounts() {
    return useSelectedAccounts(usePriorityConnector())
  }

  function usePriorityIsActivating() {
    return useSelectedIsActivating(usePriorityConnector())
  }

  function usePriorityAccount() {
    return useSelectedAccount(usePriorityConnector())
  }

  function usePriorityIsActive() {
    return useSelectedIsActive(usePriorityConnector())
  }

  /**
   * @typeParam T - A type argument must only be provided if one or more of the connectors passed to
   * getPriorityConnector is using `connector.customProvider`, in which case it must match every possible type of this
   * property, over all connectors.
   */
  function usePriorityProvider<T extends BaseProvider = Web3Provider>(network: Ref<Networkish | undefined>) {
    return useSelectedProvider<T>(usePriorityConnector(), network)
  }

  function usePriorityENSNames(provider: Ref<BaseProvider | undefined>) {
    return useSelectedENSNames(usePriorityConnector(), provider)
  }

  function usePriorityENSName(provider: Ref<BaseProvider | undefined>) {
    return useSelectedENSName(usePriorityConnector(), provider)
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
    usePriorityConnector,
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
  function useChainId(): ComputedRef<Web3VueState['chainId']> {
    return computed(() => store.state.value.chainId)
  }

  function useAccounts(): ComputedRef<Web3VueState['accounts']> {
    return computed(() => store.state.value.accounts)
  }

  function useIsActivating(): ComputedRef<Web3VueState['activating']> {
    return computed(() => store.state.value.activating)
  }

  return { useChainId, useAccounts, useIsActivating }
}

function getDerivedHooks({ useChainId, useAccounts, useIsActivating }: ReturnType<typeof getStateHooks>) {
  function useAccount(): ComputedRef<string | undefined> {
    const accounts = useAccounts()
    return computed(() => accounts.value?.[0])
  }

  function useIsActive(): ComputedRef<boolean> {
    const chainId = useChainId()
    const activating = useIsActivating()
    const accounts = useAccounts()

    return computed(() =>
      computeIsActive({
        chainId: chainId.value,
        accounts: accounts.value,
        activating: activating.value,
      })
    )
  }

  return { useAccount, useIsActive }
}

/**
 * @returns ENSNames - An array of length `accounts.length` which contains entries which are either all `undefined`,
 * indicated that names cannot be fetched because there's no provider, or they're in the process of being fetched,
 * or `string | null`, depending on whether an ENS name has been set for the account in question or not.
 */
function useENS(
  providerRef: Ref<BaseProvider | undefined>,
  accountsRef: Ref<string[] | undefined> = ref(undefined)
): Ref<undefined[] | (string | null)[]> {
  const ENSNames: Ref<(string | null)[] | undefined[]> = ref(
    new Array<undefined>(accountsRef.value?.length ?? 0).fill(undefined)
  )

  watchEffect((onInvalidate) => {
    const provider = providerRef.value
    const accounts = accountsRef.value ?? []
    if (provider && accounts.length) {
      let stale = false

      Promise.all(accounts.map((account) => provider.lookupAddress(account)))
        .then((names) => {
          if (stale) return
          ENSNames.value = names
        })
        .catch((error) => {
          if (stale) return
          console.debug('Could not fetch ENS names', error)
          ENSNames.value = new Array<null>(accounts.length).fill(null)
        })

      onInvalidate(() => {
        stale = true
      })
    }
  })

  return ENSNames
}

function getAugmentedHooks<T extends Connector>(
  connector: T,
  { useAccounts, useChainId }: ReturnType<typeof getStateHooks>,
  { useAccount, useIsActive }: ReturnType<typeof getDerivedHooks>
) {
  /**
   * Avoid type erasure by returning the most qualified type if not otherwise set.
   * Note that this function's return type is `T | undefined`, but there is a code path
   * that returns a Web3Provider, which could conflict with a user-provided T. So,
   * it's important that users only provide an override for T if they know that
   * `connector.customProvider` is going to be defined and of type T.
   *
   * @typeParam T - A type argument must only be provided if using `connector.customProvider`, in which case it
   * must match the type of this property.
   */
  function useProvider<T extends BaseProvider = Web3Provider>(
    network: Ref<Networkish | undefined>,
    enabled = true
  ): ComputedRef<T | undefined> {
    const isActive = useIsActive()
    const chainId = useChainId()

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

    return computed(() => {
      // to ensure connectors remain fresh, we condition re-renders on loaded, isActive and chainId
      void loaded.value && isActive.value && chainId.value && network.value
      if (enabled) {
        if (connector.customProvider) return connector.customProvider as T
        // see tsdoc note above for return type explanation.
        else if (DynamicProvider && connector.provider)
          return new DynamicProvider(connector.provider, network.value) as unknown as T
      }
    })
  }

  function useENSNames(provider: Ref<BaseProvider | undefined>): ComputedRef<undefined[] | (string | null)[]> {
    const accounts = useAccounts()
    return computed(() => useENS(provider, accounts).value)
  }

  function useENSName(provider: Ref<BaseProvider | undefined>): ComputedRef<undefined | string | null> {
    const account = useAccount()
    const accounts = computed(() => (account.value === undefined ? undefined : [account.value]))
    return computed(() => useENS(provider, accounts).value?.[0])
  }

  return { useProvider, useENSNames, useENSName }
}
