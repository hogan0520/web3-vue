import {reactive} from "vue";

type SetStateInternal<T> = {
    _(
        partial: T | Partial<T> | { _(state: T): T | Partial<T> }['_'],
        replace?: boolean | undefined
    ): void
}['_']

export interface StoreApi<T extends Object> {
    setState: SetStateInternal<T>
    getState: () => T
}

export function defineStore<T extends object>(): (initialData: T) => StoreApi<T> {
    return (initialData) => {
        const state = reactive(initialData)
        const setState: StoreApi<T>['setState'] = (partial, replace) => {
            const nextState =
                typeof partial === 'function'
                    ? (partial as (state: T) => T)(state as T)
                    : partial
            if (!Object.is(nextState, state)) {
                if (replace ?? typeof nextState !== 'object' ) {
                    for (const stateKey in state) {
                        delete state[stateKey]
                    }
                }
                for (const nextStateKey in nextState) {
                    (state as T)[nextStateKey] = nextState[nextStateKey]
                }
            }
        }

        const getState: StoreApi<T>['getState'] = () => state as T

        return {setState, getState}
    }
}
