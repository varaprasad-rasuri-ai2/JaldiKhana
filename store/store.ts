import { create } from "zustand";
import type { Recipe } from "@/types";

interface AppState {
  inputText: string;
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  setInputText: (text: string) => void;
  setRecipes: (recipes: Recipe[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

const initialState = {
  inputText: "",
  recipes: [],
  loading: false,
  error: null,
};

export const useStore = create<AppState>((set) => ({
  ...initialState,
  setInputText: (inputText) => set({ inputText, error: null }),
  setRecipes: (recipes) => set({ recipes, error: null, loading: false }),
  setLoading: (loading) => set({ loading, error: loading ? null : undefined }),
  setError: (error) => set({ error, loading: false }),
  clear: () =>
    set({
      inputText: "",
      recipes: [],
      loading: false,
      error: null,
    }),
}));
