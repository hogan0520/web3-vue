<script setup lang="ts">
import {CHAINS} from "@/chains";
import {computed} from "vue";

interface Props {
  chainId: number
}

const props = defineProps<Props>()
const name = computed(() => props.chainId ? CHAINS[props.chainId]?.name : undefined)
</script>

<template>
  <div v-if="name">Chain: <b>{{name}} ({{chainId}})</b></div>
  <div v-else>ChainId: <b>{{chainId}}</b></div>
</template>

