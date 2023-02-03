import type { Networkish } from '@ethersproject/networks'
import type { BaseProvider, Web3Provider } from '@ethersproject/providers'
import type { Connector, Web3VueStore } from '@web3-vue-org/types'
import { computed, defineComponent, provide } from 'vue'
import type { PropType } from 'vue'
import type { Web3VueHooks, Web3VuePriorityHooks } from './hooks'
import { getPriorityConnector } from './hooks'

/**
 * @typeParam T - A type argument must only be provided if one or more of the connectors passed to Web3VueProvider
 * is using `connector.customProvider`, in which case it must match every possible type of this
 * property, over all connectors.
 */
export type Web3ContextType<T extends BaseProvider = Web3Provider> = {
  connector: Connector
  chainId: ReturnType<Web3VuePriorityHooks['useSelectedChainId']>
  accounts: ReturnType<Web3VuePriorityHooks['useSelectedAccounts']>
  isActivating: ReturnType<Web3VuePriorityHooks['useSelectedIsActivating']>
  account: ReturnType<Web3VuePriorityHooks['useSelectedAccount']>
  isActive: ReturnType<Web3VuePriorityHooks['useSelectedIsActive']>
  provider: T | undefined
  ENSNames: ReturnType<Web3VuePriorityHooks['useSelectedENSNames']>
  ENSName: ReturnType<Web3VuePriorityHooks['useSelectedENSName']>
  hooks: ReturnType<typeof getPriorityConnector>
}

export const Web3VueProviderProps = {
  connectors: {
    type: Array as PropType<[Connector, Web3VueHooks][] | [Connector, Web3VueHooks, Web3VueStore][]>,
    required: true,
  },
  connectorOverride: { type: Object as PropType<Connector>, required: false },
  network: { type: Object as PropType<Networkish>, required: false },
  lookupENS: {
    type: Boolean,
    required: false,
  },
} as const

export const Web3VueProvider = defineComponent({
  name: 'Web3VueProvider',
  props: Web3VueProviderProps,
  setup(props, { slots }) {
    const cachedConnectors = computed(() => props.connectors)
    const network = computed(() => props.network)

    // because we're calling `getPriorityConnector` with these connectors, we need to ensure that they're not changing in place
    if (
      !props.connectors ||
      props.connectors.length != cachedConnectors.value.length ||
      props.connectors.some((connector, i) => {
        const cachedConnector = cachedConnectors.value[i]
        // because a "connector" is actually an array, we want to be sure to only perform an equality check on the actual Connector
        // class instance, to see if they're the same object
        return connector[0] !== cachedConnector[0]
      })
    )
      throw new Error(
        'The connectors prop passed to Web3VueProvider must be referentially static. If connectors is changing, try providing a key prop to Web3VueProvider that changes every time connectors changes.'
      )

    const hooks = getPriorityConnector(...props.connectors)
    const {
      usePriorityConnector,
      useSelectedChainId,
      useSelectedAccounts,
      useSelectedIsActivating,
      useSelectedAccount,
      useSelectedIsActive,
      useSelectedProvider,
      useSelectedENSNames,
      useSelectedENSName,
    } = hooks

    const priorityConnector = usePriorityConnector()
    const connector = computed(() => props.connectorOverride ?? priorityConnector.value)

    const chainId = useSelectedChainId(connector)
    const accounts = useSelectedAccounts(connector)
    const isActivating = useSelectedIsActivating(connector)
    const account = useSelectedAccount(connector)
    const isActive = useSelectedIsActive(connector)
    // note that we've omitted a <T extends BaseProvider = Web3Provider> generic type
    // in Web3VueProvider, and thus can't pass T through to useSelectedProvider below.
    // this is because if we did so, the type of provider would include T, but that would
    // conflict because Web3Context can't take a generic. however, this isn't particularly
    // important, because useWeb3Vue (below) is manually typed
    const provider = useSelectedProvider(connector, network)
    const ENSNames = useSelectedENSNames(
      connector,
      computed(() => (props.lookupENS ? provider.value : undefined))
    )
    const ENSName = useSelectedENSName(
      connector,
      computed(() => (props.lookupENS ? provider.value : undefined))
    )

    provide('connector', connector)
    provide('chainId', chainId)
    provide('accounts', accounts)
    provide('isActivating', isActivating)
    provide('account', account)
    provide('isActive', isActive)
    provide('provider', provider)
    provide('ENSNames', ENSNames)
    provide('ENSName', ENSName)
    provide('hooks', hooks)
  },
  render() {
    const { $slots } = this
    const children = $slots.default?.()
    return <div class={'web3-vue-org-provider'}>{children}</div>
  },
})
