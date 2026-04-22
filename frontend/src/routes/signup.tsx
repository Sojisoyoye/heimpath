import { zodResolver } from "@hookform/resolvers/zod"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { CheckCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { RESIDENCY_STATUS_OPTIONS } from "@/common/constants"
import { AuthLayout } from "@/components/Common/AuthLayout"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"

/******************************************************************************
                              Constants
******************************************************************************/

const formSchema = z
  .object({
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Please enter a valid email address" }),
    full_name: z.string().min(1, { message: "Full name is required" }),
    citizenship: z.string().optional(),
    password: z
      .string()
      .min(1, { message: "Password is required" })
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" }),
    confirm_password: z
      .string()
      .min(1, { message: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  })

type FormData = z.infer<typeof formSchema>

/******************************************************************************
                              Route
******************************************************************************/

export const Route = createFileRoute("/signup")({
  component: SignUp,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: (search.redirect as string) || undefined,
  }),
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/dashboard" })
    }
  },
  head: () => ({
    meta: [
      { title: "Sign Up - HeimPath" },
      {
        name: "description",
        content:
          "Create a free HeimPath account to start your guided German property buying journey with personalised steps and financial tools.",
      },
    ],
  }),
})

/******************************************************************************
                              Components
******************************************************************************/

/** Shown after successful registration. */
function RegistrationSuccess({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
        <CheckCircle className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click
          the link to activate your account.
        </p>
      </div>
      <RouterLink
        to="/login"
        className="mt-2 inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white hover:bg-blue-700"
      >
        Go to sign in
      </RouterLink>
    </div>
  )
}

/** Default component. Sign up page. */
function SignUp() {
  const { redirect: redirectTo } = Route.useSearch()
  const { signUpMutation } = useAuth(redirectTo)
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      citizenship: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit = (data: FormData) => {
    if (signUpMutation.isPending) return

    // Exclude confirm_password from submission data
    const { confirm_password: _, ...submitData } = data
    signUpMutation.mutate(submitData)
  }

  if (signUpMutation.isSuccess) {
    return (
      <AuthLayout>
        <RegistrationSuccess email={form.getValues("email")} />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-muted-foreground">
              Start your German property journey today
            </p>
          </div>

          <div className="grid gap-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="full-name-input"
                      placeholder="John Doe"
                      type="text"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="email-input"
                      placeholder="you@example.com"
                      type="email"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="citizenship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Residency Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="citizenship-select">
                        <SelectValue placeholder="Select your status (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESIDENCY_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Helps us personalize your property journey
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      data-testid="password-input"
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Min 8 characters with uppercase and number
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      data-testid="confirm-password-input"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <LoadingButton
              type="submit"
              className="w-full"
              loading={signUpMutation.isPending}
            >
              Create Account
            </LoadingButton>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <a
              href="/terms"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Privacy Policy
            </a>
          </p>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <RouterLink
              to="/login"
              className="font-medium text-foreground underline underline-offset-4 hover:text-blue-600"
            >
              Sign in
            </RouterLink>
          </div>
        </form>
      </Form>
    </AuthLayout>
  )
}

/******************************************************************************
                              Export
******************************************************************************/

export default SignUp
