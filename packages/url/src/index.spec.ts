import { createWeb3VueStoreAndActions } from '@web3-vue-org/store'
import type { Actions, Web3VueStore } from '@web3-vue-org/types'
import { setActivePinia, createPinia } from 'pinia'
import { Url } from '.'
import { MockJsonRpcProvider } from '../../network/src/index.spec'

jest.mock('@ethersproject/providers', () => ({
  JsonRpcProvider: MockJsonRpcProvider,
}))

const chainId = '0x1'
const accounts: string[] = []

describe('Url', () => {
  let store: Web3VueStore
  let connector: Url
  let mockConnector: MockJsonRpcProvider

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('works', () => {
    beforeEach(() => {
      let actions: Actions
      ;[store, actions] = createWeb3VueStoreAndActions()
      connector = new Url({ actions, url: 'https://mock.url' })
    })

    test('is un-initialized', async () => {
      expect(store.getState()).toEqual({
        chainId: undefined,
        accounts: undefined,
        activating: false,
        error: undefined,
      })
    })

    describe('#activate', () => {
      beforeEach(async () => {
        // testing hack to ensure the provider is set
        await connector.activate()
        mockConnector = connector.customProvider as unknown as MockJsonRpcProvider
        mockConnector.chainId = chainId
      })

      test('works', async () => {
        await connector.activate()

        expect(store.getState()).toEqual({
          chainId: Number.parseInt(chainId, 16),
          accounts,
          activating: false,
          error: undefined,
        })
      })
    })
  })
})
