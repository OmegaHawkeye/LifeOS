# Nutrition module

Owns meals, nutrition targets, and nutrition progress.

## Units and nutrition values

- Ingredient quantities are positive decimal values with an explicit unit string (for example, `120 g`, `1.5 cup`, or `2 piece`). LifeOS preserves the chosen unit; it does not silently convert units.
- Ingredients are reused by normalized name within one owner's library. A recipe line stores its own quantity, unit, and order.
- Recipe calories and macronutrients are estimates **per serving**. `servings` is the yield for the full recipe.
- A logged recipe meal stores the consumed serving count and a nutrient snapshot calculated from the recipe's per-serving values. Later recipe edits do not rewrite meal history.
- A free-form meal stores the user's entered name and nutrient estimate without a recipe association.
- Daily nutrition targets are owner-wide targets. Micronutrients remain an optional keyed JSON object until a concrete set of measures is required.
