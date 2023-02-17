import type { Actions, Provider, ProviderConnectInfo, ProviderRpcError } from '@web3-vue-org/types'
import { Connector, UnSupportedChainError } from '@web3-vue-org/types'
import 'regenerator-runtime'

type OpenBlockProvider = Provider & {
  isOpenBlock: boolean
  onSDKLoaded: () => void
  isLogin: boolean
}

declare global {
  interface Window {
    openblock?: OpenBlockProvider
  }
}

export class NoOpenBlockError extends Error {
  public constructor() {
    super('OpenBlock not installed')
    this.name = NoOpenBlockError.name
    Object.setPrototypeOf(this, NoOpenBlockError.prototype)
  }
}

function parseChainId(chainId: string) {
  return Number.parseInt(chainId, 16)
}

/**
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface OpenBlockConstructorArgs {
  actions: Actions
  onError?: (error: Error) => void
}

const SUPPORTED_CHAIN_IDS = [1, 56, 128, 250, 137, 43114, 25, 8217, 10, 100, 42161, 42170, 10000, 1666600000, 5, 280]

function detectOpenBlock(): Promise<OpenBlockProvider | undefined> {
  return new Promise((resolve, reject) => {
    import('@openblockhq/dappsdk').then(() => {
      resolve(window.openblock)
    })
  })
}

export class OpenBlock extends Connector {
  /** {@inheritdoc Connector.provider} */
  public declare provider?: OpenBlockProvider
  private eagerConnection?: Promise<void>

  constructor({ actions, onError }: OpenBlockConstructorArgs) {
    super(actions, false, onError)
  }

  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return

    return (this.eagerConnection = detectOpenBlock().then((provider) => {
      if (provider) {
        this.provider = provider

        this.provider.on('connect', ({ chainId }: ProviderConnectInfo): void => {
          this.actions.update({ chainId: parseChainId(chainId) })
        })

        this.provider.on('disconnect', (error: ProviderRpcError): void => {
          // 1013 indicates that OpenBlock is attempting to reestablish the connection
          // https://github.com/MetaMask/providers/releases/tag/v8.0.0
          if (error.code === 1013) {
            console.debug('OpenBlock logged connection error 1013: "Try again later"')
            return
          }
          this.actions.resetState()
          this.onError?.(error)
        })

        this.provider.on('chainChanged', (chainId: string): void => {
          this.actions.update({ chainId: parseChainId(chainId) })
        })

        this.provider.on('accountsChanged', (accounts: string[]): void => {
          if (accounts.length === 0) {
            // handle this edge case by disconnecting
            this.actions.resetState()
          } else {
            this.actions.update({ accounts })
          }
        })
      }
    }))
  }

  /** {@inheritdoc Connector.connectEagerly} */
  public async connectEagerly(): Promise<void> {
    const cancelActivation = this.actions.startActivation()

    try {
      await this.isomorphicInitialize()
      if (!this.provider) return cancelActivation()

      // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
      // chains; they should be requested serially, with accounts first, so that the chainId can settle.
      const accounts = (await this.provider.request({ method: 'eth_accounts' })) as string[]
      if (!accounts.length) throw new Error('No accounts returned')
      const chainId = (await this.provider.request({ method: 'eth_chainId' })) as string
      this.actions.update({ chainId: parseChainId(chainId), accounts, changing: false })
    } catch (error) {
      console.debug('Could not connect eagerly', error)
      // we should be able to use `cancelActivation` here, but on mobile, metamask emits a 'connect'
      // event, meaning that chainId is updated, and cancelActivation doesn't work because an intermediary
      // update has occurred, so we reset state instead
      this.actions.resetState()
    }
  }

  /**
   * Initiates a connection.
   *
   * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
   * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
   * to the chain, if one of two conditions is met: either they already have it added in their extension, or the
   * argument is of type AddEthereumChainParameter, in which case the user will be prompted to add the chain with the
   * specified parameters first, before being prompted to switch.
   */
  protected async _activate(desiredChainIdOrChainParameters?: number): Promise<void> {
    return this.isomorphicInitialize().then(async () => {
      if (!this.provider) throw new NoOpenBlockError()

      if (desiredChainIdOrChainParameters && !SUPPORTED_CHAIN_IDS.includes(desiredChainIdOrChainParameters)) {
        throw new UnSupportedChainError(desiredChainIdOrChainParameters)
      }

      // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
      // chains; they should be requested serially, with accounts first, so that the chainId can settle.
      const accounts = (await this.provider.request({ method: 'eth_requestAccounts' })) as string[]
      const chainId = (await this.provider.request({ method: 'eth_chainId' })) as string
      const receivedChainId = parseChainId(chainId)
      const desiredChainId = desiredChainIdOrChainParameters

      // if there's no desired chain, or it's equal to the received, update
      if (!desiredChainId || receivedChainId === desiredChainId)
        return this.actions.update({ chainId: receivedChainId, accounts, changing: false })

      const desiredChainIdHex = `0x${desiredChainId.toString(16)}`

      // if we're here, we can try to switch networks
      return this.provider
        .request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: desiredChainIdHex }],
        })
        .catch((error: ProviderRpcError) => {
          throw error
        })
        .then(() => this._activate(desiredChainId))
    })
  }

  /**
   * Initiates a connection.
   *
   * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
   * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
   * to the chain, if one of two conditions is met: either they already have it added in their extension, or the
   * argument is of type AddEthereumChainParameter, in which case the user will be prompted to add the chain with the
   * specified parameters first, before being prompted to switch.
   */
  public async activate(desiredChainIdOrChainParameters?: number): Promise<void> {
    return this.startActive(!!this.provider?.isLogin, desiredChainIdOrChainParameters)
  }
}
