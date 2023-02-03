import { initializeConnector } from '@web3-vue/core'
import { MetaMask } from '@web3-vue/metamask'

export const [metaMask, hooks] = initializeConnector<MetaMask>((actions) => new MetaMask({ actions }))
