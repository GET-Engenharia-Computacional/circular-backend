import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post(['auth/register', 'register'])
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @Post(['auth/login', 'login'])
  async login(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    let input = body;
    if (authorization?.startsWith('Basic ')) {
      const encoded = authorization.slice(6);
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
        throw new UnauthorizedException('Invalid Basic credentials');
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const colon = decoded.indexOf(':');
      if (colon < 1) throw new UnauthorizedException('Invalid Basic credentials');
      input = { registrationNumber: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
    }
    const dto = await new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }).transform(input, { type: 'body', metatype: LoginDto });
    return this.auth.login(dto as LoginDto);
  }
}
