import { createPinia, setActivePinia } from 'pinia'
import { createWeb3VueStoreAndActions, MAX_SAFE_CHAIN_ID } from '.'

describe('#createWeb3VueStoreAndActions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('uninitialized', () => {
    const [useStore] = createWeb3VueStoreAndActions()
    const store = useStore()
    expect(store.$state).toEqual({
      chainId: undefined,
      accounts: undefined,
      activating: false,
      error: undefined,
    })
  })

  describe('#startActivation', () => {
    test('works', () => {
      const [useStore, actions] = createWeb3VueStoreAndActions()
      const store = useStore()
      actions.startActivation()
      expect(store.$state).toEqual({
        chainId: undefined,
        accounts: undefined,
        activating: true,
        error: undefined,
      })
    })

    test('cancellation works', () => {
      const [useStore, actions] = createWeb3VueStoreAndActions()
      const store = useStore()

      const cancelActivation = actions.startActivation()

      cancelActivation()

      expect(store.$state).toEqual({
        chainId: undefined,
        accounts: undefined,
        activating: false,
        error: undefined,
      })
    })
  })

  describe('#update', () => {
    test('throws on bad chainIds', () => {
      const [, actions] = createWeb3VueStoreAndActions()
      for (const chainId of [1.1, 0, MAX_SAFE_CHAIN_ID + 1]) {
        expect(() => actions.update({ chainId })).toThrow(`Invalid chainId ${chainId}`)
      }
    })

    test('throws on bad accounts', () => {
      const [, actions] = createWeb3VueStoreAndActions()
      expect(() => actions.update({ accounts: ['0x000000000000000000000000000000000000000'] })).toThrow()
    })

    test('chainId', () => {
      const [useStore, actions] = createWeb3VueStoreAndActions()
      const store = useStore()

      const chainId = 1
      actions.update({ chainId })
      expect(store.$state).toEqual({
        chainId,
        accounts: undefined,
        activating: false,
        error: undefined,
      })
    })

    describe('accounts', () => {
      test('empty', () => {
        const [useStore, actions] = createWeb3VueStoreAndActions()
        const store = useStore()
        const accounts: string[] = []
        actions.update({ accounts })
        expect(store.$state).toEqual({
          chainId: undefined,
          accounts,
          activating: false,
          error: undefined,
        })
      })

      test('single', () => {
        const [useStore, actions] = createWeb3VueStoreAndActions()
        const store = useStore()
        const accounts = ['0x0000000000000000000000000000000000000000']
        actions.update({ accounts })
        expect(store.$state).toEqual({
          chainId: undefined,
          accounts,
          activating: false,
          error: undefined,
        })
      })

      test('multiple', () => {
        const [useStore, actions] = createWeb3VueStoreAndActions()
        const store = useStore()

        const accounts = ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000001']
        actions.update({ accounts })
        expect(store.$state).toEqual({
          chainId: undefined,
          accounts,
          activating: false,
          error: undefined,
        })
      })
    })

    test('both', () => {
      const [useStore, actions] = createWeb3VueStoreAndActions()
      const store = useStore()
      const chainId = 1
      const accounts: string[] = []
      actions.update({ chainId, accounts })
      expect(store.$state).toEqual({
        chainId,
        accounts,
        activating: false,
        error: undefined,
      })
    })

    test('chainId does not unset activating', () => {
      const [useStore, actions] = createWeb3VueStoreAndActions()
      const store = useStore()

      const chainId = 1
      actions.startActivation()
      actions.update({ chainId })
      expect(store.$state).toEqual({
        chainId,
        accounts: undefined,
        activating: true,
        error: undefined,
      })
    })

    test('accounts does not unset activating', () => {
      const [useStore, actions] = createWeb3VueStoreAndActions()
      const store = useStore()

      const accounts: string[] = []
      actions.startActivation()
      actions.update({ accounts })
      expect(store.$state).toEqual({
        chainId: undefined,
        accounts,
        activating: true,
        error: undefined,
      })
    })

    test('unsets activating', () => {
      const [useStore, actions] = createWeb3VueStoreAndActions()
      const store = useStore()

      const chainId = 1
      const accounts: string[] = []
      actions.startActivation()
      actions.update({ chainId, accounts })
      expect(store.$state).toEqual({
        chainId,
        accounts,
        activating: false,
        error: undefined,
      })
    })
  })
})
