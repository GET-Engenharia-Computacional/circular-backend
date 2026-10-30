import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { mysqlCode } from '../database/mysql';

@Injectable()
export class AdminDeletionService {
  constructor(private readonly db: DataSource) {}
  async remove(table: 'bus_lines' | 'bus_stops' | 'campus_places', id: string) {
    try {
      return await this.db.transaction(async (tx) => {
        if (!(await tx.query(`SELECT id FROM ${table} WHERE id=? FOR UPDATE`, [id])).length)
          throw new NotFoundException('Cadastro não encontrado.');
        if (
          table === 'bus_stops' &&
          (
            await tx.query('SELECT bus_line_id FROM bus_line_stops WHERE bus_stop_id=? LIMIT 1', [
              id,
            ])
          ).length
        )
          throw new BadRequestException('Remova a parada dos itinerários antes de excluir.');
        await tx.query(`DELETE FROM ${table} WHERE id=?`, [id]);
        return { id, deleted: true };
      });
    } catch (error) {
      if (mysqlCode(error) === 'ER_ROW_IS_REFERENCED_2')
        throw new ConflictException(
          'Este cadastro possui viagens ou histórico vinculado. Desative-o para preservar os dados.',
        );
      throw error;
    }
  }
}
