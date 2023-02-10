<script setup lang="ts">
import {CoinbaseWallet} from "@web3-vue-org/coinbase-wallet";
import {Web3VueHooks, Web3VueProvider} from "@web3-vue-org/core";
import {MetaMask} from "@web3-vue-org/metamask";
import {Network} from "@web3-vue-org/network";
import {WalletConnect} from "@web3-vue-org/walletconnect";
import { hooks as metaMaskHooks, metaMask } from '@/connectors/metaMask'
import { hooks as walletConnectHooks, walletConnect } from '@/connectors/walletConnect'
import { hooks as coinbaseWalletHooks, coinbaseWallet } from '@/connectors/coinbaseWallet'
import { hooks as networkHooks, network } from '@/connectors/network'

const connectors: [MetaMask | WalletConnect | CoinbaseWallet | Network, Web3VueHooks][] = [
  [metaMask, metaMaskHooks],
  [walletConnect, walletConnectHooks],
  [coinbaseWallet, coinbaseWalletHooks],
  [network, networkHooks],
]
</script>

<template>
  <Web3VueProvider :connectors="connectors" :lookupENS="true">
    <slot></slot>
  </Web3VueProvider>
</template>

