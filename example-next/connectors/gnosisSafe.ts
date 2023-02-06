import { initializeConnector } from '@web3-vue-org/core'
import { GnosisSafe } from '@web3-vue-org/gnosis-safe'

export const [gnosisSafe, hooks] = initializeConnector<GnosisSafe>((actions) => new GnosisSafe({ actions }))
