<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import {Web3VueHooks, Web3VueProvider} from '@web3-vue-org/core'
import {WalletConnect} from "@web3-vue-org/walletconnect";
import {MetaMask} from "@web3-vue-org/metamask";
import {CoinbaseWallet} from "@web3-vue-org/coinbase-wallet";
import {Network} from "@web3-vue-org/network";
import {coinbaseWallet, hooks as coinbaseWalletHooks } from "./connectors/coinbaseWallet";
import {metaMask,  hooks as metaMaskHooks } from "./connectors/metaMask";
import {walletConnect, hooks as walletConnectHooks} from "./connectors/walletConnect";

const connectors: [MetaMask | WalletConnect | CoinbaseWallet | Network, Web3VueHooks][] = [
  [metaMask, metaMaskHooks],
  [walletConnect, walletConnectHooks],
  [coinbaseWallet, coinbaseWalletHooks],
  // [network, networkHooks],
]
</script>

<template>
  <Web3VueProvider :connectors="connectors">
    <div>
      <a href="https://vitejs.dev" target="_blank">
        <img src="/vite.svg" class="logo" alt="Vite logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <HelloWorld msg="Vite + Vue" />
  </Web3VueProvider>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
