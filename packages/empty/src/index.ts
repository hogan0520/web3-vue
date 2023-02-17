import { Connector } from '@web3-vue-org/types'

export class Empty extends Connector {
  /**
   * No-op. May be called if it simplifies application code.
   */
  public activate() {
    void 0
  }

  protected _activate(): Promise<void> {
    return Promise.resolve(undefined)
  }
}

// @ts-expect-error actions aren't validated and are only used to set a protected property, so this is ok
export const EMPTY = new Empty()
