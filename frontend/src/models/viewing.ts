export interface ChecklistItem {
  id: string
  label: string
  checked: boolean
  notes: string
}

export interface ChecklistCategory {
  id: string
  label: string
  items: ChecklistItem[]
}

export interface PropertyViewing {
  id: string
  userId: string
  journeyId: string | null
  address: string
  viewedAt: string | null
  notes: string | null
  checklistData: ChecklistCategory[]
  createdAt: string
  updatedAt: string
}

export interface PropertyViewingCreate {
  address: string
  journeyId?: string
  viewedAt?: string
}

export interface PropertyViewingUpdate {
  address?: string
  viewedAt?: string | null
  notes?: string | null
  checklistData?: ChecklistCategory[]
}

export interface PropertyViewingListResponse {
  data: PropertyViewing[]
  count: number
}
