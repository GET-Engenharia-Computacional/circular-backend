import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthService, AuthUser } from './auth.service';

@Injectable()
export class AdminPasswordGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user, body } = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser; body?: { password?: unknown } }>();
    if (user?.userType !== 'admin') throw new ForbiddenException();
    if (
      typeof body?.password !== 'string' ||
      !body.password ||
      Buffer.byteLength(body.password, 'utf8') > 72
    )
      throw new BadRequestException('Informe sua senha de administrador para excluir.');
    await this.auth.confirmAdminPassword(user.id, body.password);
    return true;
  }
}
