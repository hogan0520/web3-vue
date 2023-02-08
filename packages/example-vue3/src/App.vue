<script setup lang="ts">
import MetaMaskCard from "@/components/connectorCards/MetaMaskCard.vue";
import ProviderExample from "@/components/ProviderExample.vue";
import WalletConnectCard from "@/components/connectorCards/WalletConnectCard.vue";
</script>

<template>
  <ProviderExample></ProviderExample>
  <div style="display: flex; flex-wrap: wrap; font-family: 'sans-serif';">
    <MetaMaskCard />
    <WalletConnectCard />
  </div>
</template>

<style scoped>

</style>
