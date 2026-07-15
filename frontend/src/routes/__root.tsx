import type { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import ErrorBoundary from "@/components/Common/ErrorBoundary"
import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"

/** Router context shared with every route's `loader` — carries the
 * request-scoped `queryClient` so loaders can call `ensureQueryData`
 * against the same client the component tree reads from (critical for
 * SSR, where each render gets its own QueryClient instance). */
interface IRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<IRouterContext>()({
  component: () => (
    <>
      <HeadContent />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  ),
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
