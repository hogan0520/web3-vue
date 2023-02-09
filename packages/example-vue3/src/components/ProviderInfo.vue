<script setup lang="ts">
import {Web3ContextType} from "@web3-vue-org/core";
import {Connector} from "@web3-vue-org/types";
import {computed, ComputedRef, inject} from "vue";
import {getName} from "@/utils";
import ChainId from "@/components/ChainId.vue";

const chainId = inject<Web3ContextType["chainId"]>('chainId')
const connector = inject<ComputedRef<Connector>>('connector')
const connectorName = computed(() => getName(connector.value))
</script>

<template>
  <div class="provider-info">
    <h2>Connector: {{connectorName}}</h2>
    <ChainId :chain-id="chainId"/>

  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
