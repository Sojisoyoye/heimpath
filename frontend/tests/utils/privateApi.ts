import { AuthService, OpenAPI, UsersService } from "../../src/client"
import { firstSuperuser, firstSuperuserPassword } from "../config"

OpenAPI.BASE = `${process.env.VITE_API_URL}`

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
