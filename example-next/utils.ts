import { CoinbaseWallet } from '@web3-vue/coinbase-wallet'
import { GnosisSafe } from '@web3-vue/gnosis-safe'
import { MetaMask } from '@web3-vue/metamask'
import { Network } from '@web3-vue/network'
import { WalletConnect } from '@web3-vue/walletconnect'
import type { Connector } from '@web3-vue/types'

export function getName(connector: Connector) {
  if (connector instanceof MetaMask) return 'MetaMask'
  if (connector instanceof WalletConnect) return 'WalletConnect'
  if (connector instanceof CoinbaseWallet) return 'Coinbase Wallet'
  if (connector instanceof Network) return 'Network'
  if (connector instanceof GnosisSafe) return 'Gnosis Safe'
  return 'Unknown'
}
