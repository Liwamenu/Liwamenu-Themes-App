/**
 * Theme 1 — Default restaurant menu theme
 * 
 * This is the entry point for theme-1.
 * All theme-specific components live in src/components/menu/
 * Shared hooks, types, and utilities are imported from src/hooks/, src/types/, src/lib/
 * 
 * To create a new theme:
 * 1. Create src/themes/theme-N/index.tsx
 * 2. Build your own UI components (can reuse shared hooks)
 * 3. Register in src/themes/ThemeRouter.tsx
 */

export { MenuPage as default } from "@/components/menu/MenuPage";
