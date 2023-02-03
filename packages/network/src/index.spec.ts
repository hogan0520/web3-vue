import { createWeb3VueStoreAndActions } from '@web3-vue-org/store'
import type { Actions, Web3VueStore } from '@web3-vue-org/types'
import { setActivePinia, createPinia } from 'pinia'
import { Network } from './'

export class MockJsonRpcProvider {
  public chainId?: string

  public getNetwork() {
    return Promise.resolve({ chainId: this.chainId === undefined ? undefined : Number.parseInt(this.chainId, 16) })
  }
}

jest.mock('@ethersproject/providers', () => ({
  JsonRpcProvider: MockJsonRpcProvider,
  FallbackProvider: class MockFallbackProvider extends MockJsonRpcProvider {},
}))

const chainId = '0x1'
const accounts: string[] = []

describe('Network', () => {
  let store: Web3VueStore
  let connector: Network
  let mockConnector: MockJsonRpcProvider

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('single url', () => {
    beforeEach(() => {
      let actions: Actions
      ;[store, actions] = createWeb3VueStoreAndActions()
      connector = new Network({ actions, urlMap: { 1: 'https://mock.url' } })
    })

    test('is un-initialized', async () => {
      expect(store.$state).toEqual({
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

        expect(store.$state).toEqual({
          chainId: Number.parseInt(chainId, 16),
          accounts,
          activating: false,
          error: undefined,
        })
      })
    })
  })

  describe('array of urls', () => {
    beforeEach(async () => {
      let actions: Actions
      ;[store, actions] = createWeb3VueStoreAndActions()
      connector = new Network({
        actions,
        urlMap: { 1: ['https://1.mock.url', 'https://2.mock.url'] },
      })
    })

    beforeEach(async () => {
      // testing hack to ensure the provider is set
      await connector.activate()
      mockConnector = connector.customProvider as unknown as MockJsonRpcProvider
      mockConnector.chainId = chainId
    })

    test('#activate', async () => {
      await connector.activate()

      expect(store.$state).toEqual({
        chainId: Number.parseInt(chainId, 16),
        accounts,
        activating: false,
        error: undefined,
      })
    })
  })

  describe('multiple chains', () => {
    beforeEach(async () => {
      let actions: Actions
      ;[store, actions] = createWeb3VueStoreAndActions()
      connector = new Network({
        actions,
        urlMap: { 1: 'https://mainnet.mock.url', 2: 'https://testnet.mock.url' },
      })
    })

    describe('#activate', () => {
      test('chainId = 1', async () => {
        // testing hack to ensure the provider is set
        await connector.activate()
        mockConnector = connector.customProvider as unknown as MockJsonRpcProvider
        mockConnector.chainId = chainId
        await connector.activate()

        expect(store.$state).toEqual({
          chainId: 1,
          accounts,
          activating: false,
          error: undefined,
        })
      })

      test('chainId = 2', async () => {
        // testing hack to ensure the provider is set
        await connector.activate(2)
        mockConnector = connector.customProvider as unknown as MockJsonRpcProvider
        mockConnector.chainId = '0x2'
        await connector.activate(2)

        expect(store.$state).toEqual({
          chainId: 2,
          accounts,
          activating: false,
          error: undefined,
        })
      })
    })
  })
})
