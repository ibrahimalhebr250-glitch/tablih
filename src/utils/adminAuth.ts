export function getAdminEmail(): string | null {
  try {
    const adminData = sessionStorage.getItem('adminStaffData');
    if (!adminData) return null;
    const parsed = JSON.parse(adminData);
    return parsed.email || null;
  } catch (e) {
    console.error('Error parsing admin data:', e);
    return null;
  }
}
