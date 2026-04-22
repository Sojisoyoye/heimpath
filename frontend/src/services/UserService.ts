/**
 * User Service
 * Handles avatar upload and removal API calls
 */

import { OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type { UserPublic } from "@/models/user"
import { PATHS } from "./common/Paths"
import { transformKeys } from "./common/transformKeys"

/******************************************************************************
                              Service
******************************************************************************/

class UserServiceClass {
  /** Upload or replace the current user's avatar. */
  async uploadAvatar(file: File): Promise<UserPublic> {
    const response = await request<Record<string, unknown>>(OpenAPI, {
      method: "PUT",
      url: PATHS.USERS.AVATAR,
      formData: { file },
      mediaType: "multipart/form-data",
    })
    return transformKeys<UserPublic>(response)
  }

  /** Remove the current user's avatar. */
  async removeAvatar(): Promise<void> {
    await request(OpenAPI, {
      method: "DELETE",
      url: PATHS.USERS.AVATAR,
    })
  }
}

export const UserService = new UserServiceClass()
