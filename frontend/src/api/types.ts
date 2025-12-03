export interface User {
  id: number
  phone: string
  email?: string
  name: string
  role: 'admin' | 'salon_owner' | 'master' | 'client'
  is_active: boolean
  created_at: string
}

export interface Salon {
  id: number
  owner_id: number
  name: string
  description?: string
  address: string
  phone: string
  latitude?: number
  longitude?: number
  rating: number
  reviews_count: number
  logo_url?: string
  external_photo_url?: string
  is_verified: boolean
  is_active: boolean
  created_at: string
}

export interface Service {
  id: number
  salon_id: number
  title: string
  description?: string
  price: number
  duration_minutes: number
  category?: string
  is_active: boolean
  created_at: string
}

export interface Master {
  id: number
  salon_id: number
  name: string
  phone?: string
  description?: string
  specialization?: string
  experience_years: number
  rating: number
  reviews_count: number
  avatar_url?: string
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: number
  client_id: number
  salon_id: number
  master_id: number
  service_id: number
  start_at: string
  end_at: string
  status: 'pending' | 'confirmed' | 'cancelled_by_client' | 'cancelled_by_salon' | 'completed' | 'no_show'
  price: number
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
  payment_method?: string
  client_notes?: string
  salon_notes?: string
  created_at: string
}

// Nested types for BookingDetailed
export interface BookingServiceInfo {
  id: number
  title: string
  duration_minutes: number
  category?: string
}

export interface BookingMasterInfo {
  id: number
  name: string
  specialization?: string
  avatar_url?: string
}

export interface BookingSalonInfo {
  id: number
  name: string
  address: string
  phone: string
}

// BookingDetailed extends Booking with nested objects
export interface BookingDetailed extends Booking {
  service?: BookingServiceInfo
  master?: BookingMasterInfo
  salon?: BookingSalonInfo
}

export interface Review {
  id: number
  booking_id: number
  client_id: number
  salon_id: number
  master_id: number
  rating: number
  comment?: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}
