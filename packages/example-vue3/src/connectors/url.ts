import { initializeConnector } from '@web3-vue-org/core'
import { Url } from '@web3-vue-org/url'
import { URLS } from '../chains'

export const [url, hooks] = initializeConnector<Url>((actions) => new Url({ actions, url: URLS[1][0] }))
