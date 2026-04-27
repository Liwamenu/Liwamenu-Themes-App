import { Product } from "@/types/restaurant";

export interface SubcategoryGroup {
  subId: string | null;
  subName: string | null;
  subSortOrder: number;
  products: Product[];
}

/**
 * Groups a flat product array by `subCategoryId`. Products without a subcategory
 * are returned in a single leading bucket (subName = null). Groups with a real
 * subcategory are sorted by `subCategorySortOrder`, then `subCategoryName`.
 * Order of products inside each group is preserved (caller sorts upstream).
 */
export function groupBySubcategory(products: Product[]): SubcategoryGroup[] {
  const noSub: Product[] = [];
  const map = new Map<string, SubcategoryGroup>();

  for (const p of products) {
    const rawName = String(p.subCategoryName ?? "").trim();
    const id = p.subCategoryId;
    if (!id || !rawName) {
      noSub.push(p);
      continue;
    }
    let group = map.get(id);
    if (!group) {
      group = {
        subId: id,
        subName: rawName,
        subSortOrder: typeof p.subCategorySortOrder === "number" ? p.subCategorySortOrder : 0,
        products: [],
      };
      map.set(id, group);
    }
    group.products.push(p);
  }

  const subGroups = Array.from(map.values()).sort((a, b) => {
    if (a.subSortOrder !== b.subSortOrder) return a.subSortOrder - b.subSortOrder;
    return String(a.subName ?? "").localeCompare(String(b.subName ?? ""));
  });

  const result: SubcategoryGroup[] = [];
  if (noSub.length > 0) {
    result.push({ subId: null, subName: null, subSortOrder: -1, products: noSub });
  }
  return result.concat(subGroups);
}