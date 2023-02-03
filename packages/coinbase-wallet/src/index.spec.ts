import { createWeb3VueStoreAndActions } from '@web3-vue-org/store'
import type { Actions, Web3VueStore } from '@web3-vue-org/types'
import { setActivePinia, createPinia } from 'pinia'
import { CoinbaseWallet } from '.'
import { MockEIP1193Provider } from '../../eip1193/src/mock'

jest.mock(
  '@coinbase/wallet-sdk',
  () =>
    class MockCoinbaseWallet {
      makeWeb3Provider() {
        return new MockEIP1193Provider()
      }
    }
)

const chainId = '0x1'
const accounts: string[] = []

describe('Coinbase Wallet', () => {
  let store: Web3VueStore
  let connector: CoinbaseWallet
  let mockProvider: MockEIP1193Provider

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('connectEagerly = true', () => {
    beforeEach(async () => {
      let actions: Actions
      ;[store, actions] = createWeb3VueStoreAndActions()
      connector = new CoinbaseWallet({
        actions,
        options: {
          appName: 'test',
          url: 'https://mock.url',
        },
      })
      await connector.connectEagerly().catch(() => {})

      mockProvider = connector.provider as unknown as MockEIP1193Provider
      mockProvider.chainId = chainId
      mockProvider.accounts = accounts
    })

    test('#activate', async () => {
      await connector.activate()

      expect(mockProvider.eth_requestAccounts).toHaveBeenCalled()
      expect(mockProvider.eth_accounts).not.toHaveBeenCalled()
      expect(mockProvider.eth_chainId).toHaveBeenCalled()
      expect(mockProvider.eth_chainId.mock.invocationCallOrder[0]).toBeGreaterThan(
        mockProvider.eth_requestAccounts.mock.invocationCallOrder[0]
      )

      expect(store.$state).toEqual({
        chainId: Number.parseInt(chainId, 16),
        accounts,
        activating: false,
      })
    })
  })
})
