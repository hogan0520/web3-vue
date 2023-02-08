import { computed, ComputedRef, Ref, shallowRef } from 'vue'

type SetStateInternal<T> = {
  _(partial: T | Partial<T> | { _(state: T): T | Partial<T> }['_'], replace?: boolean | undefined): void
}['_']

export interface StoreApi<T extends object> {
  setState: SetStateInternal<T>
  getState: () => T
  state: ComputedRef<T>
}

export function defineStore<T extends object>(): (initialData: T) => StoreApi<T> {
  return (initialData) => {
    const state: Ref<T> = shallowRef(initialData)
    const setState: StoreApi<T>['setState'] = (partial, replace) => {
      const nextState = typeof partial === 'function' ? (partial as (state: T) => T)(state.value) : partial
      if (!Object.is(nextState, state.value)) {
        if (replace ?? typeof nextState !== 'object') {
          state.value = nextState as T
        } else {
          state.value = Object.assign({}, state.value, nextState)
        }
      }
    }

    const getState: StoreApi<T>['getState'] = () => state.value

    return { setState, getState, state: computed(() => state.value) }
  }
}
