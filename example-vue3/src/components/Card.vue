<script setup lang="ts">
import {CoinbaseWallet} from "@web3-vue-org/coinbase-wallet";
import type {Web3VueHooks} from "@web3-vue-org/core";
import {MetaMask} from "@web3-vue-org/metamask";
import {Network} from "@web3-vue-org/network";
import {WalletConnect} from "@web3-vue-org/walletconnect";
import {computed} from "vue";
import {getName} from "@/utils";
import ChainId from "@/components/ChainId.vue";
import Accounts from "@/components/Accounts.vue";
import ConnectWithSelect from "@/components/ConnectWithSelect.vue";

interface Props {
  connector: MetaMask | WalletConnect | CoinbaseWallet | Network
  chainId: Web3VueHooks['chainId']['value']
  isActivating: Web3VueHooks['isActivating']['value']
  isActive: Web3VueHooks['isActive']['value']
  error: Error | undefined
  setError: (error: Error | undefined) => void
  ENSNames: Web3VueHooks['ENSNames']['value']
  provider?: Web3VueHooks['provider']['value']
  accounts?: string[]
}

const props = defineProps<Props>()
const connector = computed(() =>props.connector)
const error = computed(() => props.error)
const isActivating = computed(() => props.isActivating)
const isActive = computed(() => props.isActive)
const chainId = computed(() => props.chainId)
const accounts = computed(() => props.accounts)
</script>

<template>
  <div class="card">
    <b>{{getName(connector)}}</b>
    <div style="margin-bottom: 1rem">
      <div v-if="error">🔴 {{error.name ?? 'Error'}} {{error.message ? `: ${error.message}` : ''}}</div>
      <div v-else-if="isActivating">🟡 Connecting</div>
      <div v-else-if="isActive">🟢 Connected</div>
      <div v-else>⚪️ Disconnected</div>
  </div>
    <ChainId v-if="chainId" :chain-id="chainId"></ChainId>
    <div style="margin-bottom: 1rem">
  <Accounts :accounts="accounts" :provider="provider" :ENSNames="ENSNames" />
      <ConnectWithSelect :chain-id="chainId" :connector="connector" :error="error" :is-activating="isActivating" :is-active="isActive" :set-error="setError"></ConnectWithSelect>
  </div>
  </div>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 20rem;
  padding: 1rem;
  margin: 1rem;
  overflow: auto;
  border: 1px solid;
  border-radius: 1rem;
}
</style>
