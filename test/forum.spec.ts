import { DataSource } from 'typeorm';
import { ForumService } from '../src/forum/forum.service';
describe('Forum privacy', () => {
  const query = jest.fn();
  const forum = new ForumService({query} as unknown as DataSource);
  beforeEach(() => query.mockReset());
  it.each([true, false])('retains audit author but respects anonymous=%s in create response', async anonymous => {
    query.mockResolvedValueOnce({}).mockResolvedValueOnce([{created_at:new Date()}]);
    const result = await forum.create('internal-author', {title:'RU',content:'Horário?',is_anonymous:anonymous});
    expect(query.mock.calls[0][1]).toEqual([expect.any(String),'internal-author',anonymous,'RU','Horário?']);
    expect(result.author).toEqual(anonymous ? null : {id:'internal-author'});
    if (anonymous) expect(JSON.stringify(result)).not.toContain('internal-author');
  });
  it('omits private authors of anonymous posts and answers from the public projection', async () => {
    const row = {id:'post',title:'RU',content:'Horário?',is_anonymous:1,created_at:new Date(),public_author_id:null};
    query.mockResolvedValueOnce([row]).mockResolvedValueOnce([{...row,id:'answer',post_id:'post'}]);
    const [post] = await forum.list({limit:20,offset:0});
    expect(query.mock.calls.every(([sql]) => sql.includes('CASE WHEN NOT is_anonymous THEN author_id ELSE NULL END'))).toBe(true);
    expect(post.author).toBeNull();
    expect(post.answers[0].author).toBeNull();
    expect(JSON.stringify(post)).not.toContain('public_author_id');
  });
});
