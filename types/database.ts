export type UserRole = "super_admin" | "admin" | "crm_agent" | "advisor";
export type UserStatus = "pending" | "active" | "suspended";
export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled"
  | "rescheduled";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  subscription_expires_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface ServiceAdvisor {
  id: string;
  branch_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  daily_capacity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  plate_number: string | null;
  branch_id: string;
  advisor_id: string;
  appointment_date: string;
  time_slot: string | null;
  status: AppointmentStatus;
  is_ghost: boolean;
  ghost_reason: string | null;
  booked_by: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
