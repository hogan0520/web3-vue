<script setup lang="ts">
import Card from "@/components/Card.vue";
import { hooks, coinbaseWallet } from '@/connectors/coinbaseWallet'
import { ref} from "vue";
import type {Ref} from 'vue'

const error: Ref<Error | undefined> = ref(undefined)

const chainId = hooks.chainId
const accounts = hooks.accounts
const isActivating = hooks.isActivating

const isActive = hooks.isActive

const provider = hooks.provider
const ENSNames = hooks.ENSNames

coinbaseWallet.connectEagerly().catch(() => {
  console.debug('Failed to connect eagerly to coinbaseWallet')
})

function setError(e: Error) {
  error.value = e
}
</script>

<template>
  <Card
      :connector="coinbaseWallet"
      :chainId="chainId"
      :isActivating="isActivating"
      :isActive="isActive"
      :accounts="accounts"
      :provider="provider"
      :ENSNames="ENSNames"
      :error="error"
      :set-error="setError"
  />
</template>

