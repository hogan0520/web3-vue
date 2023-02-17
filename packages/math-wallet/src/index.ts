import type {
  Actions,
  AddEthereumChainParameter,
  Provider,
  ProviderConnectInfo,
  ProviderRpcError,
} from '@web3-vue-org/types'
import { Connector } from '@web3-vue-org/types'

type MathWalletProvider = Provider & {
  isMathWallet?: boolean
  isConnected?: () => boolean
  wallet_addEthereumChain: (data: { params: [any] }) => void
  get chainId(): string
}

declare global {
  interface Window {
    ethereum?: MathWalletProvider
  }
}

export class NoMathWalletError extends Error {
  public constructor() {
    super('MathWallet not installed')
    this.name = NoMathWalletError.name
    Object.setPrototypeOf(this, NoMathWalletError.prototype)
  }
}

export class NoMathAddressError extends Error {
  public constructor() {
    super('Invalid wallet address on chain in Math Wallet')
    this.name = NoMathAddressError.name
    Object.setPrototypeOf(this, NoMathAddressError.prototype)
  }
}

function parseChainId(chainId: string) {
  return Number.parseInt(chainId, 16)
}

/**
 * @param onError - Handler to report errors thrown from eventListeners.
 */
export interface MathWalletConstructorArgs {
  actions: Actions
  onError?: (error: Error) => void
}

export class MathWallet extends Connector {
  /** {@inheritdoc Connector.provider} */
  public declare provider?: MathWalletProvider
  private eagerConnection?: Promise<void>

  constructor({ actions, onError }: MathWalletConstructorArgs) {
    super(actions, true, onError)
  }

  private onConnect = ({ chainId }: ProviderConnectInfo): void => {
    this.actions.update({ chainId: parseChainId(chainId) })
  }

  private onDisconnect = (error: ProviderRpcError): void => {
    // 1013 indicates that Coin98 is attempting to reestablish the connection
    // https://github.com/MetaMask/providers/releases/tag/v8.0.0
    if (error.code === 1013) {
      console.debug('MathWallet logged connection error 1013: "Try again later"')
      return
    }
    this.actions.resetState()
    this.onError?.(error)
  }

  private onChainChanged = (chainId: string): void => {
    if (chainId === '0') {
      this.resetState()
      return
    }
    this.actions.update({ chainId: Number.parseInt(chainId) })
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

    return (this.eagerConnection = Promise.resolve(window.ethereum).then((provider) => {
      if (provider && provider.isMathWallet) {
        this.provider = provider as MathWalletProvider

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
   * @param times activate 方法被循环调用的次数
   */
  private async _activate(
    desiredChainIdOrChainParameters?: number | AddEthereumChainParameter,
    times = 0
  ): Promise<void> {
    return this.isomorphicInitialize()
      .then(async () => {
        if (!this.provider) throw new NoMathWalletError()

        const desiredChainId =
          typeof desiredChainIdOrChainParameters === 'number'
            ? desiredChainIdOrChainParameters
            : desiredChainIdOrChainParameters?.chainId
        try {
          // 如果是第二次请求，等待500ms，以便于切换成功
          if (times > 0) {
            await new Promise((resolve) => {
              setTimeout(() => resolve(undefined), 500)
            })
          }
          // Wallets may resolve eth_chainId and hang on eth_accounts pending user interaction, which may include changing
          // chains; they should be requested serially, with accounts first, so that the chainId can settle.
          const accounts = (await this.provider.request({ method: 'eth_requestAccounts' })) as string[]
          const chainId = (await this.provider.request({ method: 'eth_chainId' })) as string
          const receivedChainId = parseChainId(chainId)
          // if there's no desired chain, or it's equal to the received, update
          if (!desiredChainId || receivedChainId === desiredChainId) {
            return this.actions.update({ chainId: receivedChainId, accounts, changing: false })
          }
        } catch (e: any) {
          // 如果不是account缺失，或者重试次数过高，则报错
          if (e.message !== 'Please create or import undefined account first' || times > 2) {
            throw e
          }
        }

        if (!desiredChainId) return

        const desiredChainIdHex = `0x${desiredChainId.toString(16)}`

        // if we're here, we can try to switch networks
        // 如果用户是循环调用，证明已经进行过切换网络操作，此时将直接进行下一次循环
        return (
          times > 0
            ? Promise.resolve()
            : this.provider
                .request({
                  method: 'wallet_switchEthereumChain',
                  params: [{ chainId: desiredChainIdHex }],
                })
                .catch((error: ProviderRpcError) => {
                  if (error.message === 'Invalid Network' && typeof desiredChainIdOrChainParameters !== 'number') {
                    if (!this.provider) throw new Error('No provider')
                    // if we're here, we can try to add a new network
                    this.provider.wallet_addEthereumChain({
                      params: [{ ...desiredChainIdOrChainParameters, chainId: desiredChainIdHex }],
                    })
                    return 'addedWallet'
                  }

                  throw error
                })
        ).then((value) => {
          this._activate(desiredChainId, times + 1)
        })
      })
      .catch((error) => {
        if (error.message === 'Please create or import undefined account first') {
          this.onError?.(new NoMathAddressError())
        }
        throw error
      })
  }

  public async activate(desiredChainIdOrChainParameters?: number | AddEthereumChainParameter) {
    let cancelActivation: () => void
    if (!this.provider?.isConnected?.()) cancelActivation = this.actions.startActivation()
    this.actions.update({ changing: true })
    return this._activate(desiredChainIdOrChainParameters)
      .catch((e) => {
        cancelActivation?.()
        this.resetState()
        throw e
      })
      .finally(() => this.actions.update({ changing: false }))
  }
}
