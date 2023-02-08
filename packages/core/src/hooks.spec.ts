import { Web3Provider } from '@ethersproject/providers'
import type { Actions } from '@web3-vue-org/types'
import { Connector } from '@web3-vue-org/types'
import EventEmitter from 'events'
import { setActivePinia, createPinia } from 'pinia'
import { shallowRef } from 'vue'
import type { Web3VueHooks, Web3VuePriorityHooks, Web3VueSelectedHooks } from './hooks'
import { getPriorityConnector, getSelectedConnector, initializeConnector } from './hooks'

class MockProvider extends EventEmitter {
  request = jest.fn()
}

class MockConnector extends Connector {
  provider = new MockProvider()

  constructor(actions: Actions) {
    super(actions)
  }
  public activate() {
    this.actions.startActivation()
  }
  public update(...args: Parameters<Actions['update']>) {
    this.actions.update(...args)
  }
}

class MockConnector2 extends MockConnector {}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('#initializeConnector', () => {
  let connector: MockConnector
  let hooks: Web3VueHooks

  beforeEach(() => {
    ;[connector, hooks] = initializeConnector((actions) => new MockConnector(actions))
  })

  test('#useChainId', () => {
    const result = hooks.chainId
    expect(result.value).toBe(undefined)

    connector.update({ chainId: 1 })
    expect(result.value).toBe(1)
  })

  describe('#useAccounts', () => {
    test('empty', () => {
      const result = hooks.accounts
      expect(result.value).toBe(undefined)

      connector.update({ accounts: [] })
      expect(result.value).toEqual([])
    })

    test('single', () => {
      const result = hooks.accounts
      expect(result.value).toBe(undefined)

      connector.update({ accounts: ['0x0000000000000000000000000000000000000000'] })
      expect(result.value).toEqual(['0x0000000000000000000000000000000000000000'])
    })

    test('multiple', () => {
      const result = hooks.accounts
      expect(result.value).toBe(undefined)

      connector.update({
        accounts: ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000001'],
      })

      expect(result.value).toEqual([
        '0x0000000000000000000000000000000000000000',
        '0x0000000000000000000000000000000000000001',
      ])
    })
  })

  test('#useIsActivating', () => {
    const result = hooks.isActivating
    expect(result.value).toBe(false)

    connector.activate()
    expect(result.value).toEqual(true)
  })

  test('#useIsActive', () => {
    const result = hooks.isActive
    expect(result.value).toBe(false)

    connector.update({ chainId: 1, accounts: [] })
    expect(result.value).toEqual(true)
  })

  describe('#useProvider', () => {
    test('lazy loads Web3Provider and rerenders', async () => {
      connector.update({ chainId: 1, accounts: [] })

      const result = hooks.provider
      expect(result.value).toBeInstanceOf(Web3Provider)
    })
  })
})

describe('#getSelectedConnector', () => {
  let connector: MockConnector
  let hooks: Web3VueHooks

  let connector2: MockConnector
  let hooks2: Web3VueHooks

  let selectedConnectorHooks: Web3VueSelectedHooks

  beforeEach(() => {
    ;[connector, hooks] = initializeConnector((actions) => new MockConnector(actions))
    ;[connector2, hooks2] = initializeConnector((actions) => new MockConnector2(actions))

    selectedConnectorHooks = getSelectedConnector([connector, hooks], [connector2, hooks2])
  })

  test('isActive is false for connector', () => {
    const result = selectedConnectorHooks.useSelectedIsActive(shallowRef(connector))

    expect(result.value).toBe(false)
  })

  test('isActive is false for connector2', () => {
    const result = selectedConnectorHooks.useSelectedIsActive(shallowRef(connector2))

    expect(result.value).toBe(false)
  })

  test('connector active', () => {
    connector.update({ chainId: 1, accounts: [] })
    const { value: isActive } = selectedConnectorHooks.useSelectedIsActive(shallowRef(connector))
    const { value: isActive2 } = selectedConnectorHooks.useSelectedIsActive(shallowRef(connector2))

    expect(isActive).toBe(true)
    expect(isActive2).toBe(false)
  })

  test('connector2 active', () => {
    connector2.update({ chainId: 1, accounts: [] })
    const { value: isActive } = selectedConnectorHooks.useSelectedIsActive(shallowRef(connector))
    const { value: isActive2 } = selectedConnectorHooks.useSelectedIsActive(shallowRef(connector2))

    expect(isActive).toBe(false)
    expect(isActive2).toBe(true)
  })
})

describe('#getPriorityConnector', () => {
  let connector: MockConnector
  let hooks: Web3VueHooks

  let connector2: MockConnector
  let hooks2: Web3VueHooks

  let priorityConnectorHooks: Web3VuePriorityHooks

  beforeEach(() => {
    ;[connector, hooks] = initializeConnector((actions) => new MockConnector(actions))
    ;[connector2, hooks2] = initializeConnector((actions) => new MockConnector2(actions))

    priorityConnectorHooks = getPriorityConnector([connector, hooks], [connector2, hooks2])
  })

  test('returns first connector if both are uninitialized', () => {
    const { value: priorityConnector } = priorityConnectorHooks.priorityConnector

    expect(priorityConnector).toBeInstanceOf(MockConnector)
    expect(priorityConnector).not.toBeInstanceOf(MockConnector2)
  })

  test('returns first connector if it is initialized', () => {
    connector.update({ chainId: 1, accounts: [] })
    const { value: priorityConnector } = priorityConnectorHooks.priorityConnector

    const { value: isActive } = priorityConnectorHooks.usePriorityIsActive()
    expect(isActive).toBe(true)

    expect(priorityConnector).toBeInstanceOf(MockConnector)
    expect(priorityConnector).not.toBeInstanceOf(MockConnector2)
  })

  test('returns second connector if it is initialized', () => {
    connector2.update({ chainId: 1, accounts: [] })
    const priorityConnector = priorityConnectorHooks.priorityConnector

    const isActive = priorityConnectorHooks.usePriorityIsActive()

    expect(priorityConnector.value).toBeInstanceOf(MockConnector2)
    expect(isActive.value).toBe(true)
  })

  test('returns connector switch', () => {
    connector2.update({ chainId: 1, accounts: [] })
    const priorityConnector = priorityConnectorHooks.priorityConnector

    expect(priorityConnector.value).toBeInstanceOf(MockConnector2)

    connector.update({ chainId: 1, accounts: [] })

    expect(priorityConnector.value).toBeInstanceOf(MockConnector)
  })
})
