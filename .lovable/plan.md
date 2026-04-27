## Goal

Inside each category section (e.g. Tatlılar), group products by their `subCategoryName` and render each group under a smaller subheading (e.g. "Şerbetli", "Sütlü"). The category tab bar stays exactly as it is — one tab per parent category. Products without a subcategory render directly under the category, before any subgroups.

## Why the user thought Tatlılar wasn't showing

Categories with subcategories DO render today, but every product is dumped into one flat grid under the category title. When a category has only subcategorized products and no visual grouping, it visually looks the same as the others and the subcategory information silently disappears. The user expected the subcategories to appear as labeled groups.

## Scope

Apply consistently to all 5 themes that render category sections:
- `src/components/menu/MenuPage.tsx` (theme 1)
- `src/themes/theme-2/MenuPage.tsx`
- `src/themes/theme-3/MenuPage.tsx`
- `src/themes/theme-4/MenuPage.tsx`
- `src/themes/theme-5/MenuPage.tsx`

No changes to `useRestaurant.ts` category grouping, no changes to `CategoryTabs`, no changes to `useInfiniteProducts` slicing logic.

## Implementation

1. **New helper** `src/lib/groupBySubcategory.ts`:
   - Input: a `Product[]` (already sorted by `sortOrder`).
   - Output: an ordered array `[{ subId: string|null, subName: string|null, subSortOrder: number, products: Product[] }, ...]`.
   - Rules:
     - Products with `subCategoryId == null` go into one leading bucket with `subName: null`.
     - Other products are grouped by `subCategoryId`; group order is by `subCategorySortOrder` ascending, ties broken by `subCategoryName`.
     - Inside each group, preserve incoming product order.
   - Defensive: coerce `subCategoryName` with `String(... ?? "")` and treat empty strings as null.

2. **Render change in each theme's MenuPage**: where the category section currently does

   ```
   <h2>{category.name} ({count})</h2>
   <div class="grid ...">{category.products.map(ProductCard)}</div>
   ```

   replace with:

   ```
   <h2>{category.name} ({category.products.length})</h2>
   {groups.map(group => (
     <div key={group.subId ?? "__none__"} className="mb-6">
       {group.subName && (
         <h3 className="theme-appropriate subheading classes">
           {group.subName}
           <span className="opacity-70 text-xs ml-2">({group.products.length})</span>
         </h3>
       )}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
         {group.products.map(p => <ProductCard ... />)}
       </div>
     </div>
   ))}
   ```

   The category-level count stays as the total of all products (same as today), so users see the full count at the top.

3. **Subheading styling per theme** (kept lightweight, no new design tokens):
   - Theme 1 / 3 / 4: `text-base font-semibold text-foreground/80 mb-3 mt-2 flex items-center`
   - Theme 2: match the existing serif/display family used for category titles, one size smaller
   - Theme 5: match its existing accent style, one size smaller than the category title

   Each theme keeps its own existing typography classes — pulled from how their `<h2>` category title is currently styled, then dropped one tier.

4. **Infinite scroll compatibility**: `slicedCategories` already returns categories with a possibly-truncated `products` array. We simply group whatever products are present in that array. As more products load, new subgroups appear naturally and existing ones grow. No changes needed to `useInfiniteProducts`.

5. **Search compatibility**: when `searchQuery` is active, the category's products are already filtered by the existing `filteredCategories` logic. Subgroups render only for matching products; empty subgroups are skipped automatically because they have zero items.

6. **Scroll-spy / category refs**: unchanged. The `categoryRefs` still attach to the outer `<section>` per category, so clicking a tab still scrolls to the parent category. Subheadings are not individually navigable.

## Out of scope

- No new tabs, no nested tab UI.
- No changes to `Category` type in `useRestaurant.ts`.
- No backend or data shape changes.
- No memory updates needed (this is a render-layer enhancement, not a new architectural rule).

## Risk

Low. Pure render-layer change, additive, gracefully degrades for categories with no subcategories (single ungrouped grid, same as today).
