import { CoinbaseWallet } from '@web3-vue-org/coinbase-wallet'
import { initializeConnector } from '@web3-vue-org/core'
import { URLS } from '../chains'

export const [coinbaseWallet, hooks] = initializeConnector<CoinbaseWallet>(
  (actions) =>
    new CoinbaseWallet({
      actions,
      options: {
        url: URLS[1][0],
        appName: 'web3-vue-org',
      },
    })
)
