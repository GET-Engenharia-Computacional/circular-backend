import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AuthUser, UserType } from './auth.service';

export const Roles = (...roles: UserType[]) => SetMetadata('roles', roles);
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserType[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    return !roles || (!!user && roles.includes(user.userType));
  }
}
