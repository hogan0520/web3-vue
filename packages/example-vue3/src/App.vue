<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import TheWelcome from './components/TheWelcome.vue'
import type {Web3VueHooks, Web3VueProvider} from "@web3-vue-org/core";
import type {WalletConnect} from "@web3-vue-org/walletconnect";
import type {MetaMask} from "@web3-vue-org/metamask";
import type {CoinbaseWallet} from "@web3-vue-org/coinbase-wallet";
import type {Network} from "@web3-vue-org/network";
import {metaMask,  hooks as metaMaskHooks } from "./connectors/metaMask";
import {walletConnect, hooks as walletConnectHooks} from "./connectors/walletConnect";

const connectors: [MetaMask | WalletConnect | CoinbaseWallet | Network, Web3VueHooks][] = [
  [metaMask, metaMaskHooks],
  [walletConnect, walletConnectHooks],
  // [coinbaseWallet, coinbaseWalletHooks],
  // [network, networkHooks],
]
</script>

<template>
  <Web3VueProvider :connectors="connectors">
    <header>
      <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="125" height="125" />

      <div class="wrapper">
        <HelloWorld msg="You did it!" />
      </div>
    </header>

    <main>
      <TheWelcome />
    </main>
  </Web3VueProvider>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
