import { initializeConnector } from '@web3-vue-org/core'
import { WalletConnect } from '@web3-vue-org/walletconnect'
import { URLS } from '../chains'

export const [walletConnect, hooks] = initializeConnector<WalletConnect>(
  (actions) =>
    new WalletConnect({
      actions,
      options: {
        rpc: URLS,
      },
    })
)
