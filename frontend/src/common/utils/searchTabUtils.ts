/**
 * Shared utilities for tab + search query URL state
 * Used by /laws, /glossary, and /articles list pages
 */

type TabQuerySearch = { tab?: string; q?: string }

/** TanStack Router validateSearch option for pages with tab + query params. */
function validateSearchTabQuery(
  search: Record<string, unknown>,
): TabQuerySearch {
  return {
    tab: typeof search.tab === "string" ? search.tab : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }
}

/** Derives the active tab from URL params, defaulting to search when q is present. */
function getActiveTab(tab?: string, q?: string): string {
  return tab ?? (q ? "search" : "browse")
}

/** Builds the search params for a tab change navigation. */
function buildTabSearch(value: string, prev: TabQuerySearch): TabQuerySearch {
  return {
    ...prev,
    tab: value,
    q: value === "browse" ? undefined : prev.q,
  }
}

/** Builds the search params for a query change navigation. */
function buildQuerySearch(query: string, prev: TabQuerySearch): TabQuerySearch {
  return { ...prev, q: query || undefined, tab: "search" }
}

export {
  validateSearchTabQuery,
  getActiveTab,
  buildTabSearch,
  buildQuerySearch,
}
