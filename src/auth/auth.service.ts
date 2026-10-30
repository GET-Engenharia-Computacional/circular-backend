import { sessionTtlSeconds } from '../config';
import { randomUUID } from 'node:crypto';
import { mysqlCode } from '../database/mysql';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './auth.dto';

export type UserType = 'admin' | 'driver' | 'passenger';
export interface AuthUser {
  id: string;
  registrationNumber: string;
  userType: UserType;
}
interface UserRow {
  id: string;
  registration_number: string;
  password_hash: string;
  is_active: boolean;
  user_type: UserType;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DataSource,
    private readonly jwt: JwtService,
  ) {}
  async register(dto: RegisterDto) {
    if (dto.password !== dto.passwordConfirmation)
      throw new BadRequestException('Passwords must match');
    if (Buffer.byteLength(dto.password, 'utf8') > 72)
      throw new BadRequestException('Password exceeds 72 bytes');
    const hash = await bcrypt.hash(dto.password, 12);
    try {
      const id = randomUUID();
      const passenger = dto.accountType === 'passenger';
      await this.db.query(
        `INSERT INTO users(id,registration_number,password_hash,user_type_id,is_active)
        VALUES (?,?,?,(SELECT id FROM user_types WHERE name=?),?)`,
        [id, dto.registrationNumber, hash, passenger ? 'passenger' : 'driver', passenger],
      );
      return {
        id,
        isActive: passenger,
        message: passenger
          ? 'Conta criada. Entre para participar do fórum.'
          : 'Cadastro pendente de ativação pelo administrador.',
      };
    } catch (error) {
      if (mysqlCode(error) === 'ER_DUP_ENTRY')
        throw new ConflictException('Registration number already exists');
      throw error;
    }
  }
  async login(dto: LoginDto) {
    const [row]: UserRow[] = await this.db.query(
      `SELECT u.*,t.name AS user_type FROM users u JOIN user_types t ON t.id=u.user_type_id WHERE registration_number=?`,
      [dto.registrationNumber],
    );
    if (!row || !row.is_active || !(await bcrypt.compare(dto.password, row.password_hash)))
      throw new UnauthorizedException('Invalid credentials or inactive account');
    const token = await this.jwt.signAsync({
      sub: row.id,
      registrationNumber: row.registration_number,
      userType: row.user_type,
    });
    return { token, accessToken: token, userType: row.user_type, expiresIn: sessionTtlSeconds };
  }
  async activeUser(id: string): Promise<AuthUser> {
    const [row]: UserRow[] = await this.db.query(
      `SELECT u.*,t.name AS user_type FROM users u JOIN user_types t ON t.id=u.user_type_id WHERE u.id=? AND u.is_active=true`,
      [id],
    );
    if (!row) throw new UnauthorizedException('Inactive or unknown user');
    return { id: row.id, registrationNumber: row.registration_number, userType: row.user_type };
  }
  async confirmAdminPassword(id: string, password: string): Promise<void> {
    const [row]: UserRow[] = await this.db.query(
      `SELECT u.password_hash FROM users u JOIN user_types t ON t.id=u.user_type_id
       WHERE u.id=? AND u.is_active=true AND t.name='admin'`,
      [id],
    );
    if (!row || !(await bcrypt.compare(password, row.password_hash)))
      throw new BadRequestException('Senha do administrador incorreta.');
  }
  async verifyToken(token: string): Promise<AuthUser> {
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string }>(token);
      if (typeof claims.sub !== 'string' || !/^[0-9a-f-]{36}$/i.test(claims.sub))
        throw new Error('Invalid subject');
      return await this.activeUser(claims.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
