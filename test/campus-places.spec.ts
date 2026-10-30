import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CampusPlacesService } from '../src/catalog/campus-places.service';
import { PatchPlaceDto } from '../src/catalog/campus-places.dto';
import { PlaceDto } from '../src/catalog/catalog.dto';

describe('Campus place spatial integrity', () => {
  let query: jest.Mock, service: CampusPlacesService;
  const dto: PlaceDto = {
    name: ' Biblioteca ',
    category: ' Biblioteca ',
    description: ' Texto\u0000 seguro ',
    position: [-43.37, -21.77],
    isActive: true,
  };
  beforeEach(() => {
    query = jest
      .fn()
      .mockResolvedValue([
        {
          id: 'place',
          name: 'Biblioteca',
          category: 'Biblioteca',
          description: 'Descrição',
          lng: -43.37,
          lat: -21.77,
          isActive: 1,
        },
      ]);
    const db = {
      query,
      transaction: jest.fn(async (callback) => callback({ query })),
    } as unknown as DataSource;
    service = new CampusPlacesService(db);
  });
  it('stores SRID 4326 using explicit longitude-latitude axis order and cleans plain text', async () => {
    expect(await service.create(dto)).toMatchObject({
      name: 'Biblioteca',
      category: 'Biblioteca',
      description: 'Texto seguro',
    });
    expect(query.mock.calls[0][0]).toContain("ST_GeomFromText(?,4326,'axis-order=long-lat')");
    expect(query.mock.calls[0][1]).toContain('POINT(-43.37 -21.77)');
  });
  it.each([
    [-43.401, -21.77],
    [-43.299, -21.77],
    [-43.37, -21.801],
    [-43.37, -21.699],
    [NaN, -21.77],
    [-21.77, -43.37],
  ])('rejects out-of-campus coordinates %j', async (lng, lat) => {
    await expect(service.create({ ...dto, position: [lng, lat] })).rejects.toThrow('Coordenadas');
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects scripts in all writable text fields before SQL', async () => {
    for (const field of ['name', 'category', 'description']) {
      await expect(
        service.create({ ...dto, [field]: '<script>alert(1)</script>' }),
      ).rejects.toThrow('texto simples');
      await expect(
        service.patch('place', { [field]: '<img src=x onerror=alert(1)>' }),
      ).rejects.toThrow('texto simples');
    }
    expect(query).not.toHaveBeenCalled();
  });
  it('updates coordinates and status while retaining unspecified data', async () => {
    expect(
      await service.patch('place', {
        position: [-43.38, -21.78],
        isActive: false,
        description: null,
      }),
    ).toMatchObject({
      name: 'Biblioteca',
      position: [-43.38, -21.78],
      isActive: false,
      description: null,
    });
    expect(query.mock.calls[1][1]).toContain('POINT(-43.38 -21.78)');
    await expect(service.patch('place', { position: [0, 91] })).rejects.toThrow();
  });
  it('rejects malformed patch fields and create status', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    for (const value of [
      { position: [0] },
      { position: ['bad', 0] },
      { isActive: 'false' },
      { name: '  ' },
    ])
      await expect(
        pipe.transform(value, { type: 'body', metatype: PatchPlaceDto }),
      ).rejects.toThrow();
    await expect(
      pipe.transform({ ...dto, isActive: 'true' }, { type: 'body', metatype: PlaceDto }),
    ).rejects.toThrow();
  });
  it('filters public listing and nearby queries to active places', async () => {
    await service.list({ limit: 20, offset: 0 });
    await service.nearest({ lng: -43.37, lat: -21.77, radius: 500 });
    expect(query.mock.calls.every(([sql]) => sql.includes('WHERE is_active'))).toBe(true);
  });
  it('returns 404 when editing a missing place', async () => {
    query.mockResolvedValue([]);
    await expect(service.patch('missing', { name: 'Local' })).rejects.toMatchObject({
      status: 404,
    });
  });
});
