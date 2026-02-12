export interface Recipe {
  title: string;
  time: string;
  ingredients: string[];
  steps: string[];
  tips: string;
}

export type RecipeList = Recipe[];
