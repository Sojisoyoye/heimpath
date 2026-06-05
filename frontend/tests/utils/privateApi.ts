import { AuthService, OpenAPI, UsersService } from "../../src/client"
import { firstSuperuser, firstSuperuserPassword } from "../config"

// Node.js direct backend calls (not through the Vite proxy). BACKEND_URL is a
// non-VITE env var so it does not appear in the browser client bundle.
OpenAPI.BASE = process.env.BACKEND_URL ?? "http://localhost:8000"

export const createUser = async ({
  email,
  password,
}: {
  email: string
  password: string
}) => {
  const tokenResponse = await AuthService.login({
    requestBody: {
      email: firstSuperuser,
      password: firstSuperuserPassword,
    },
  })

  const previousToken = OpenAPI.TOKEN
  OpenAPI.TOKEN = tokenResponse.access_token
  try {
    return await UsersService.createUser({
      requestBody: {
        email,
        password,
        email_verified: true,
        full_name: "Test User",
      },
    })
  } finally {
    OpenAPI.TOKEN = previousToken
  }
}
