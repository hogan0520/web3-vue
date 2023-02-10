import { initializeConnector } from '@web3-vue-org/core'
import { Empty, EMPTY } from '@web3-vue-org/empty'

export const [empty, hooks] = initializeConnector<Empty>(() => EMPTY)
