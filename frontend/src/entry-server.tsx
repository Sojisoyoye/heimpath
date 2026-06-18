import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router"
import { renderToString } from "react-dom/server"

import { routeTree } from "./routeTree.gen"

export async function render(url: string): Promise<string> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  })
  const memoryHistory = createMemoryHistory({ initialEntries: [url] })
  const router = createRouter({
    routeTree,
    history: memoryHistory,
    defaultPreloadStaleTime: 0,
  })
  await router.load()
  return renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}
