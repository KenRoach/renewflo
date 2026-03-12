import { FastifyRequest } from 'fastify';
import { ForbiddenError } from './errors.js';

type OrgType = 'var' | 'operator' | 'delivery_partner';
type Role = 'admin' | 'member' | 'viewer';

export function requireOrgType(...allowed: OrgType[]) {
  return (request: FastifyRequest) => {
    if (!allowed.includes(request.user.orgType as OrgType)) {
      throw new ForbiddenError(`Access denied for org type '${request.user.orgType}'`);
    }
  };
}

export function requireRole(...allowed: Role[]) {
  return (request: FastifyRequest) => {
    if (!allowed.includes(request.user.role as Role)) {
      throw new ForbiddenError(`Access denied for role '${request.user.role}'`);
    }
  };
}
