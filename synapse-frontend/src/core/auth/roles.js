export const ROLES = {
  PATIENT: 'patient',
  DOCTOR: 'doctor',
  PHARMACIST: 'pharmacist',
};

/** Where each supported role lands after login. Keep in sync with each module's `basePath`. */
export const ROLE_HOME = {
  [ROLES.PATIENT]: '/patient',
  [ROLES.DOCTOR]: '/doctor',
  [ROLES.PHARMACIST]: '/pharmacist',
};

export function homePathForRole(role) {
  return ROLE_HOME[role] ?? '/login';
}
