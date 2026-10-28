import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';

describe('Authentication', () => {
  const query = jest.fn();
  const signAsync = jest.fn().mockResolvedValue('signed-token');
  const auth = new AuthService(
    { query } as unknown as DataSource,
    { signAsync } as unknown as JwtService,
  );
  beforeEach(() => {
    query.mockReset();
    signAsync.mockClear();
  });
  it('blocks inactive accounts even with the correct password', async () => {
    query.mockResolvedValue([
      { id: 'user', password_hash: await bcrypt.hash('password123', 4), is_active: false },
    ]);
    await expect(
      auth.login({ registrationNumber: '123', password: 'password123' }),
    ).rejects.toThrow('inactive');
    expect(signAsync).not.toHaveBeenCalled();
  });
  it('signs JWT claims from the database user role', async () => {
    query.mockResolvedValue([
      {
        id: 'user',
        registration_number: '123',
        password_hash: await bcrypt.hash('password123', 4),
        is_active: true,
        user_type: 'driver',
      },
    ]);
    expect(await auth.login({ registrationNumber: '123', password: 'password123' })).toMatchObject({
      token: 'signed-token',
      userType: 'driver',
    });
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'user',
      registrationNumber: '123',
      userType: 'driver',
    });
  });
  it('rejects nonmatching confirmation before inserting a user', async () => {
    await expect(
      auth.register({
        registrationNumber: '123',
        password: 'password123',
        passwordConfirmation: 'different123',
      }),
    ).rejects.toThrow('must match');
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects bcrypt byte truncation for multibyte passwords', async () => {
    const password = '🙂'.repeat(20);
    await expect(
      auth.register({ registrationNumber: '123', password, passwordConfirmation: password }),
    ).rejects.toThrow('72 bytes');
  });
});
