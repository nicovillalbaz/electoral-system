import { forbidden } from "../http/errors";

export function requireRole(roles: string[]) {
  return async (req: any) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) throw forbidden();
  };
}
