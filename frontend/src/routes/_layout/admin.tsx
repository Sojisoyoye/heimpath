import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Suspense } from "react"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import ArticlesAdmin from "@/components/Admin/ArticlesAdmin"
import { columns, type UserTableData } from "@/components/Admin/columns"
import GlossaryAdmin from "@/components/Admin/GlossaryAdmin"
import LawsAdmin from "@/components/Admin/LawsAdmin"
import ProfessionalsAdmin from "@/components/Admin/ProfessionalsAdmin"
import { DataTable } from "@/components/Common/DataTable"
import PendingUsers from "@/components/Pending/PendingUsers"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import useAuth from "@/hooks/useAuth"

function getUsersQueryOptions() {
  return {
    queryFn: () => UsersService.readUsers({ skip: 0, limit: 100 }),
    queryKey: ["users"],
  }
}

function AdminErrorFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-lg font-semibold">Failed to load admin panel</p>
      <p className="text-sm text-muted-foreground">
        Please refresh the page. If the problem persists, contact support.
      </p>
    </div>
  )
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  errorComponent: AdminErrorFallback,
  beforeLoad: async () => {
    let user: UserPublic
    try {
      user = await UsersService.readUserMe()
    } catch {
      throw redirect({ to: "/dashboard" })
    }
    if (!user.is_superuser) {
      throw redirect({ to: "/dashboard" })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Admin - HeimPath",
      },
    ],
  }),
})

function UsersTableContent() {
  const { user: currentUser } = useAuth()
  const { data: users } = useSuspenseQuery(getUsersQueryOptions())

  const tableData: UserTableData[] = users.data.map((user: UserPublic) => ({
    ...user,
    isCurrentUser: currentUser?.id === user.id,
  }))

  return <DataTable columns={columns} data={tableData} />
}

function UsersTable() {
  return (
    <Suspense fallback={<PendingUsers />}>
      <UsersTableContent />
    </Suspense>
  )
}

function Admin() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
        <p className="text-muted-foreground">Manage users and content</p>
      </div>
      <Tabs defaultValue="users">
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="laws">Laws</TabsTrigger>
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="professionals">Professionals</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">User Accounts</h2>
            <AddUser />
          </div>
          <UsersTable />
        </TabsContent>

        <TabsContent value="laws" className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">Legal Knowledge Base</h2>
          <LawsAdmin />
        </TabsContent>

        <TabsContent value="glossary" className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">Glossary Terms</h2>
          <GlossaryAdmin />
        </TabsContent>

        <TabsContent value="articles" className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">Content Library</h2>
          <ArticlesAdmin />
        </TabsContent>

        <TabsContent value="professionals" className="mt-6">
          <h2 className="mb-4 text-lg font-semibold">
            Professionals Directory
          </h2>
          <ProfessionalsAdmin />
        </TabsContent>
      </Tabs>
    </div>
  )
}
