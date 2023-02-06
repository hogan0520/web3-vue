import { initializeConnector } from '@web3-vue-org/core'
import { Network } from '@web3-vue-org/network'
import { URLS } from '../chains'

export const [network, hooks] = initializeConnector<Network>((actions) => new Network({ actions, urlMap: URLS }))
