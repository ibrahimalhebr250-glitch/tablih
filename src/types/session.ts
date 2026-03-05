export interface UserProfile {
  id: string;
  phone: string;
  company_name: string;
  display_name: string;
  city: string;
  activity_type: string;
  user_type: 'company' | 'individual' | '';
  created_at: string;
  last_active: string;
}

export interface SessionData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  phone: string;
  user_id: string;
}

export type UserRole = 'buyer' | 'supplier';

export interface AppSession {
  profile: UserProfile;
  roles: UserRole[];
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}
