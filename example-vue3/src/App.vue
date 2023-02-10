<script setup lang="ts">
import MetaMaskCard from "@/components/connectorCards/MetaMaskCard.vue";
import ProviderExample from "@/components/ProviderExample.vue";
import WalletConnectCard from "@/components/connectorCards/WalletConnectCard.vue";
import CoinbaseWalletCard from "@/components/connectorCards/CoinbaseWalletCard.vue";
import ProviderInfo from "@/components/ProviderInfo.vue";
</script>

<template>
  <ProviderExample>
    <ProviderInfo/>
  </ProviderExample>
  <div style="display: flex; flex-wrap: wrap; font-family: 'sans-serif';">
    <MetaMaskCard />
    <WalletConnectCard />
    <CoinbaseWalletCard/>
  </div>
</template>

<style scoped>

</style>
