<script setup lang="ts">
import {Web3VueHooks} from "@web3-vue-org/core";
import type {Ref} from 'vue'
import {computed, ref, watchEffect} from "vue";
import type { BigNumber } from '@ethersproject/bignumber'
import { formatEther } from '@ethersproject/units'

interface Props {
  ENSNames: Web3VueHooks['ENSNames']['value']
  provider?: Web3VueHooks['provider']['value']
  accounts?: string[]
}

const props = defineProps<Props>()
const provider = computed(() => props.provider)
const accounts = computed(() => props.accounts)
const balances: Ref<BigNumber[] | undefined> = ref(undefined)

watchEffect(onCleanup => {
  if(provider.value && accounts.value?.length) {
    let stale = false
    void Promise.all(accounts.value!.map((account) => provider.value!.getBalance(account))).then((values) => {
      if (stale) return
      balances.value =  values
    })

    onCleanup(() => {
      stale = true
balances.value = undefined
    })
  }
})
</script>

<template>
  <div v-if="accounts">
    Accounts:
    <b>
      <template v-if="accounts.length === 0">None</template>
      <template v-else>
        <ul v-for="(account, i) in accounts" :key="account">
          {{ENSNames?.[i] ?? account}}
          {{balances?.[i] ? ` (Ξ${formatEther(balances[i])})` : null}}
        </ul>
      </template>
    </b>
  </div>
</template>

