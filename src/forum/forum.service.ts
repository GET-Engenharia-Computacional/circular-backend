import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PageQuery } from '../common/dto';
import { mysqlCode } from '../database/mysql';
import { AnswerDto, PostDto } from './forum.dto';
interface PublicContent {
  id: string;
  content: string;
  is_anonymous: number;
  created_at: Date;
  public_author_id: string | null;
  post_id?: string;
  title?: string;
}
function present(row: PublicContent) {
  const { public_author_id, ...rest } = row;
  return {
    ...rest,
    is_anonymous: !!row.is_anonymous,
    author: public_author_id ? { id: public_author_id } : null,
  };
}
@Injectable()
export class ForumService {
  constructor(private readonly db: DataSource) {}
  async list(q: PageQuery) {
    // Anonymous author identifiers never leave the SQL projection.
    const posts: PublicContent[] = await this.db.query(
      `SELECT id,title,content,is_anonymous,created_at,CASE WHEN NOT is_anonymous THEN author_id ELSE NULL END AS public_author_id FROM forum_posts ORDER BY created_at DESC,id LIMIT ? OFFSET ?`,
      [q.limit, q.offset],
    );
    if (!posts.length) return [];
    const ids = posts.map((p) => p.id);
    const answers: PublicContent[] = await this.db.query(
      `SELECT id,post_id,content,is_anonymous,created_at,CASE WHEN NOT is_anonymous THEN author_id ELSE NULL END AS public_author_id FROM forum_answers WHERE post_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at,id`,
      ids,
    );
    return posts.map((p) => ({
      ...present(p),
      answers: answers.filter((a) => a.post_id === p.id).map(present),
    }));
  }
  async create(userId: string, dto: PostDto) {
    const id = randomUUID();
    await this.db.query(
      'INSERT INTO forum_posts(id,author_id,is_anonymous,title,content) VALUES (?,?,?,?,?)',
      [id, userId, dto.is_anonymous, dto.title, dto.content],
    );
    const [row]: { created_at: Date }[] = await this.db.query(
      'SELECT created_at FROM forum_posts WHERE id=?',
      [id],
    );
    return { id, ...row, ...dto, author: dto.is_anonymous ? null : { id: userId }, answers: [] };
  }
  async answer(postId: string, userId: string, dto: AnswerDto) {
    try {
      const id = randomUUID();
      await this.db.query(
        'INSERT INTO forum_answers(id,post_id,author_id,is_anonymous,content) VALUES (?,?,?,?,?)',
        [id, postId, userId, dto.is_anonymous, dto.content],
      );
      const [row]: { created_at: Date }[] = await this.db.query(
        'SELECT created_at FROM forum_answers WHERE id=?',
        [id],
      );
      return {
        id,
        ...row,
        ...dto,
        post_id: postId,
        author: dto.is_anonymous ? null : { id: userId },
      };
    } catch (error) {
      if (mysqlCode(error) === 'ER_NO_REFERENCED_ROW_2')
        throw new NotFoundException('Post not found');
      throw error;
    }
  }
}
