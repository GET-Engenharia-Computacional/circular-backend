import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DataSource } from 'typeorm';
import { AuthService } from '../src/auth/auth.service';
import { AdminPasswordGuard } from '../src/auth/admin-password.guard';
import { AdminDeletionService } from '../src/catalog/admin-deletion.service';
import { CatalogController } from '../src/catalog/catalog.controller';
import { AdminBusStopsController } from '../src/catalog/AdminBusStopsController';
import { AdminBusLinesController } from '../src/catalog/AdminBusLinesController';

describe('Password protected deletion', () => {
  const confirmAdminPassword = jest.fn();
  const guard = new AdminPasswordGuard({ confirmAdminPassword } as unknown as AuthService);
  const context = (userType?: string, password?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: userType ? { id: 'admin-id', userType } : undefined,
          body: { password },
        }),
      }),
    }) as unknown as ExecutionContext;
  beforeEach(() => confirmAdminPassword.mockReset());
  it('rejects missing passwords and non-admin roles before checking credentials', async () => {
    for (const role of [undefined, 'driver', 'passenger'])
      await expect(guard.canActivate(context(role, 'secret'))).rejects.toThrow();
    await expect(guard.canActivate(context('admin'))).rejects.toThrow('Informe sua senha');
    expect(confirmAdminPassword).not.toHaveBeenCalled();
  });
  it('verifies the current admin and propagates invalid-password errors', async () => {
    confirmAdminPassword.mockRejectedValueOnce(new Error('Senha incorreta'));
    await expect(guard.canActivate(context('admin', 'wrong'))).rejects.toThrow('Senha incorreta');
    await expect(guard.canActivate(context('admin', 'correct'))).resolves.toBe(true);
    expect(confirmAdminPassword).toHaveBeenLastCalledWith('admin-id', 'correct');
  });
  it('protects all deletion aliases for lines, stops and places', () => {
    for (const method of [
      CatalogController.prototype.deleteLine,
      CatalogController.prototype.deleteStop,
      CatalogController.prototype.deletePlace,
      AdminBusStopsController.prototype.remove,
      AdminBusLinesController.prototype.remove,
    ])
      expect(Reflect.getMetadata(GUARDS_METADATA, method)).toContain(AdminPasswordGuard);
  });
  it.each(['bus_lines', 'bus_stops', 'campus_places'] as const)(
    'deletes %s transactionally',
    async (table) => {
      const query = jest
        .fn()
        .mockResolvedValueOnce([{ id: 'id' }])
        .mockResolvedValue([]);
      const service = new AdminDeletionService({
        transaction: (callback: Function) => callback({ query }),
      } as unknown as DataSource);
      await expect(service.remove(table, 'id')).resolves.toEqual({ id: 'id', deleted: true });
      expect(query).toHaveBeenCalledWith(`DELETE FROM ${table} WHERE id=?`, ['id']);
    },
  );
  it('blocks linked stops before deleting and explains historical foreign keys', async () => {
    const query = jest.fn().mockResolvedValue([{ id: 'linked' }]);
    const service = new AdminDeletionService({
      transaction: (callback: Function) => callback({ query }),
    } as unknown as DataSource);
    await expect(service.remove('bus_stops', 'id')).rejects.toThrow('itinerários');
    expect(query.mock.calls.some(([sql]) => sql.startsWith('DELETE'))).toBe(false);
    query
      .mockReset()
      .mockResolvedValueOnce([{ id: 'id' }])
      .mockRejectedValueOnce({ code: 'ER_ROW_IS_REFERENCED_2' });
    await expect(service.remove('bus_lines', 'id')).rejects.toThrow('histórico');
  });
});
