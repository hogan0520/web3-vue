import type {
  Actions,
  AddEthereumChainParameter,
  Provider,
  ProviderConnectInfo,
  ProviderRpcError,
  WatchAssetParameters,
} from '@web3-vue-org/types'
import { Connector } from '@web3-vue-org/types'

type BitKeepProvider = Provider & {
  isBitKeep?: boolean
  isConnected?: () => boolean
  disconnect: () => Promise<void>
  get chainId(): string
  get accounts(): string[]
}

declare global {
  interface Window {
    bitkeep?: {
      ethereum: BitKeepProvider
    }
  }
}

export class NoBitKeepError extends Error {
  public constructor() {
    super('BitKeep not installed')
    this.name = NoBitKeepError.name
    Object.setPrototypeOf(this, NoBitKeepError.prototype)
  }
}

function parseChainId(chainId: string) {
  return Number.parseInt(chainId, 16)
}

/**
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface BitKeepConstructorArgs {
  actions: Actions
  onError?: (error: Error) => void
}

export class BitKeep extends Connector {
  /** {@inheritdoc Connector.provider} */
  public declare provider?: BitKeepProvider
  private eagerConnection?: Promise<void>

  constructor({ actions, onError }: BitKeepConstructorArgs) {
    super(actions, true, onError)
  }

  private onConnect = ({ chainId }: ProviderConnectInfo): void => {
    this.actions.update({ chainId: parseChainId(chainId) })
  }

  private onDisconnect = (error: ProviderRpcError): void => {
    // 1013 indicates that BitKeep is attempting to reestablish the connection
    // https://github.com/MetaMask/providers/releases/tag/v8.0.0
    if (error.code === 1013) {
      console.debug('BitKeep logged connection error 1013: "Try again later"')
      return
    }
    this.actions.resetState()
    this.onError?.(error)
  }

  private onChainChanged = (chainId: string): void => {
    this.actions.update({ chainId: parseChainId(chainId) })
  }

  private onAccountsChanged = (accounts: string[]): void => {
    if (accounts.length === 0) {
      // handle this edge case by disconnecting
      this.actions.resetState()
    } else {
      this.actions.update({ accounts })
    }
  }

  private async isomorphicInitialize(): Promise<void> {
    if (this.eagerConnection) return

    return (this.eagerConnection = Promise.resolve(window.bitkeep?.ethereum).then((provider) => {
      if (provider) {
        this.provider = provider as BitKeepProvider

        this.provider.on('connect', this.onConnect)

        this.provider.on('disconnect', this.onDisconnect)

        this.provider.on('chainChanged', this.onChainChanged)

        this.provider.on('accountsChanged', this.onAccountsChanged)
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
  protected async _activate(desiredChainIdOrChainParameters?: number | AddEthereumChainParameter): Promise<void> {
    return this.isomorphicInitialize().then(async () => {
      if (!this.provider) throw new NoBitKeepError()

      // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
      // chains; they should be requested serially, with accounts first, so that the chainId can settle.
      const accounts = (await this.provider.request({ method: 'eth_requestAccounts' })) as string[]
      const chainId = (await this.provider.request({ method: 'eth_chainId' })) as string
      const receivedChainId = parseChainId(chainId)
      const desiredChainId =
        typeof desiredChainIdOrChainParameters === 'number'
          ? desiredChainIdOrChainParameters
          : desiredChainIdOrChainParameters?.chainId

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
          if (error.code === 4902 && typeof desiredChainIdOrChainParameters !== 'number') {
            if (!this.provider) throw new Error('No provider')
            // if we're here, we can try to add a new network
            return this.provider.request({
              method: 'wallet_addEthereumChain',
              params: [{ ...desiredChainIdOrChainParameters, chainId: desiredChainIdHex }],
            })
          }

          throw error
        })
        .then(() => this._activate(desiredChainId))
    })
  }

  public async activate(desiredChainIdOrChainParameters?: number | AddEthereumChainParameter): Promise<void> {
    return this.startActive(!!this.provider?.isConnected?.(), desiredChainIdOrChainParameters)
  }

  public async deactivate(): Promise<void> {
    this.provider?.off('disconnect', this.onDisconnect)
    this.provider?.off('chainChanged', this.onChainChanged)
    this.provider?.off('accountsChanged', this.onAccountsChanged)
    // we don't unregister the display_uri handler because the walletconnect types/inheritances are really broken.
    // it doesn't matter, anyway, as the connector object is destroyed
    await this.provider?.disconnect()
    this.provider = undefined
    this.eagerConnection = undefined
    this.actions.resetState()
  }

  public async watchAsset({ address, symbol, decimals, image }: WatchAssetParameters): Promise<true> {
    if (!this.provider) throw new Error('No provider')

    return this.provider
      .request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20', // Initially only supports ERC20, but eventually more!
          options: {
            address, // The address that the token is at.
            symbol, // A ticker symbol or shorthand, up to 5 chars.
            decimals, // The number of decimals in the token
            image, // A string url of the token logo
          },
        },
      })
      .then((success) => {
        if (!success) throw new Error('Rejected')
        return true
      })
  }
}
