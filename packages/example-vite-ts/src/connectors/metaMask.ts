import { initializeConnector } from '@web3-vue-org/core'
import { MetaMask } from '@web3-vue-org/metamask'

export const [metaMask, hooks] = initializeConnector<MetaMask>((actions) => new MetaMask({ actions }))
