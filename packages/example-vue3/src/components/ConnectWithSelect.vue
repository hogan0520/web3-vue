<script setup lang="ts">
import {CHAINS, getAddChainParameters} from "@/chains";
import {CoinbaseWallet} from "@web3-vue-org/coinbase-wallet";
import {Web3VueHooks} from "@web3-vue-org/core";
import {MetaMask} from "@web3-vue-org/metamask";
import {Network} from "@web3-vue-org/network";
import {WalletConnect} from "@web3-vue-org/walletconnect";
import {ref} from "vue";

interface Props {
  connector: MetaMask | WalletConnect | CoinbaseWallet | Network
  chainId: Web3VueHooks['chainId']['value']
  isActivating: Web3VueHooks['isActivating']['value']
  isActive: Web3VueHooks['isActive']['value']
  error: Error | undefined
  setError: (error: Error | undefined) => void
}

const props = defineProps<Props>()

const chainIds =  Object.keys(CHAINS).map((chainId) => Number(chainId))

const desiredChainId = ref(props.connector instanceof Network ? 1 : -1)

function onClick() {

}

function onDeactivate() {
  if (props.connector?.deactivate) {
  props.connector.deactivate()
  } else {
props.connector.resetState()
  }
}

function onConnect() {
  if (props.isActivating) {
    return
  }
  if (props.connector instanceof WalletConnect || props.connector instanceof Network) {
    props.connector
        .activate(desiredChainId.value === -1 ? undefined : desiredChainId.value)
        .then(() => props.setError(undefined))
        .catch(props.setError)
  } else {
    props.connector
        .activate(desiredChainId.value === -1 ? undefined : getAddChainParameters(desiredChainId.value))
        .then(() => props.setError(undefined))
        .catch(props.setError)
  }
}

function switchChain(id: number) {
  desiredChainId.value = id
  // if we're already connected to the desired chain, return
  if (id === props.chainId) {
    props.setError(undefined)
    return
  }

  // if they want to connect to the default chain and we're already connected, return
  if (id === -1 && props.chainId > 0) {
    props.setError(undefined)
    return
  }

  if (props.connector instanceof WalletConnect || props.connector instanceof Network) {
    props.connector
        .activate(id === -1 ? undefined : id)
        .then(() => props.setError(undefined))
        .catch(props.setError)
  } else {
    props.connector
        .activate(id === -1 ? undefined : getAddChainParameters(id))
        .then(() => props.setError(undefined))
        .catch(props.setError)
  }
}
</script>

<template>
  <div style="display: flex;flex-direction: column" >
    <select
        :value="chainId"
        @change="(event) => switchChain(Number(event.target.value))"
    >
    <option :value="-1">Default Chain</option>

    <option v-for="chainId in chainIds" :key="chainId" :value="chainId">
      {{CHAINS[chainId]?.name ?? chainId }}
    </option>
    </select>
    <div style="margin-bottom: 1rem"></div>
    <button v-if="error" @click="onClick">Try Again</button>
    <button v-else-if="isActive" @click="onDeactivate">Disconnect</button>
    <button v-else @click="onConnect">Connect</button>
  </div>
</template>

