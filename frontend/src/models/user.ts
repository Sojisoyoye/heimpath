/**
 * User domain models
 * TypeScript interfaces for user entities
 */

export type SubscriptionTier = "free" | "premium" | "enterprise"

export interface UserPublic {
  id: string
  email: string
  fullName: string
  citizenship?: string
  isActive: boolean
  isSuperuser: boolean
  emailVerified: boolean
  subscriptionTier: SubscriptionTier
  createdAt: string
  updatedAt: string
}

export interface UserCreate {
  email: string
  password: string
  fullName: string
  citizenship?: string
}

export interface UserUpdate {
  email?: string
  fullName?: string
  citizenship?: string
  password?: string
}

export interface UserPasswordChange {
  currentPassword: string
  newPassword: string
}

export interface UserDataExport {
  user: UserPublic
  journeys: unknown[]
  bookmarks: unknown[]
  calculations: unknown[]
  exportedAt: string
}
