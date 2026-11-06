import { useEffect, useReducer } from 'react';
import { dt } from '../services/runtime';
import type { ShopState } from '../types';
export function useShop(): ShopState {
  const [, refresh] = useReducer((n:number) => n + 1, 0);
  useEffect(() => {
    const update = () => refresh();
    document.addEventListener('dt:change', update);
    return () => document.removeEventListener('dt:change', update);
  }, []);
  return dt.store.get();
}
