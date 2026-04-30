/**
 * Hook for tab + search query URL navigation
 * Used by /laws, /glossary, and /articles list pages
 */

import { useNavigate } from "@tanstack/react-router"

import { buildQuerySearch, buildTabSearch, getActiveTab } from "@/common/utils"

type TabQuerySearch = { tab?: string; q?: string }

/** Manages URL-driven tab and search query state for content list pages. */
function useTabQueryNavigation(
  to: "/laws" | "/glossary" | "/articles",
  { tab, q }: TabQuerySearch,
) {
  const navigate = useNavigate()

  const activeTab = getActiveTab(tab, q)

  const handleTabChange = (value: string) => {
    navigate({
      to,
      search: (prev: TabQuerySearch) => buildTabSearch(value, prev),
    })
  }

  const handleQueryChange = (query: string) => {
    navigate({
      to,
      search: (prev: TabQuerySearch) => buildQuerySearch(query, prev),
      replace: true,
    })
  }

  return { activeTab, handleTabChange, handleQueryChange }
}

export { useTabQueryNavigation }
