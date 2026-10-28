import { ValidationPipe } from '@nestjs/common';
import { LocationDto } from '../src/telemetry/telemetry.dto';
import { NearbyQuery } from '../src/common/dto';
import { AnswerDto, PostDto } from '../src/forum/forum.dto';
import { LineDto, PlateDto, StopDto } from '../src/catalog/catalog.dto';

describe('Public input boundaries', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const location = {
    licensePlate: 'ABC-1D23',
    busLineId: '74da64c4-b72a-42f9-a762-51c4fa61e253',
    position: [-43.37, -21.77],
    speed: 25,
    headingTowards: 180,
    timestamp: new Date().toISOString(),
  };
  const parse = (data: unknown) => pipe.transform(data, { type: 'body', metatype: LocationDto });
  it('accepts the [lng,lat] contract', async () => {
    expect(await parse(location)).toMatchObject(location);
  });
  it.each([
    { speed: 80.01 },
    { speed: -1 },
    { speed: '20' },
    { headingTowards: 360 },
    { position: [-43.37] },
    { position: [-43.37, -21.77, 0] },
    { position: [null, -21.77] },
    { position: ['-43.37', -21.77] },
    { licensePlate: 'ABC1234' },
    { timestamp: 'tomorrow' },
    { driverId: 'spoofed' },
  ])('rejects invalid telemetry %j', async (invalid) => {
    await expect(parse({ ...location, ...invalid })).rejects.toThrow();
  });
  it('bounds spatial search radius and transforms numeric query strings', async () => {
    const parsed = await pipe.transform(
      { lat: '-21.77', lng: '-43.37', radius: '500' },
      { type: 'query', metatype: NearbyQuery },
    );
    expect(parsed.radius).toBe(500);
    await expect(
      pipe.transform(
        { lat: '-21.77', lng: '-43.37', radius: '5001' },
        { type: 'query', metatype: NearbyQuery },
      ),
    ).rejects.toThrow();
  });
  it('requires a boolean for anonymity and disallows client-supplied author identity', async () => {
    for (const invalid of [
      { is_anonymous: 'false' },
      { author_id: 'another-user' },
      { content: '   ' },
    ]) {
      await expect(
        pipe.transform(
          { title: 'Where is the bus?', content: 'Question', ...invalid },
          { type: 'body', metatype: PostDto },
        ),
      ).rejects.toThrow();
    }
  });
  it.each([
    {
      type: LineDto,
      body: { code: 'C1', name: 'Circular' },
      field: 'isActive',
      defaultValue: true,
    },
    { type: PlateDto, body: { licensePlate: 'ABC-1D23' }, field: 'isActive', defaultValue: true },
    {
      type: StopDto,
      body: { shortName: 'RU', longName: 'Restaurante Universitário', position: [-43.37, -21.77] },
      field: 'isActive',
      defaultValue: true,
    },
    {
      type: PostDto,
      body: { title: 'Pergunta', content: 'Texto' },
      field: 'is_anonymous',
      defaultValue: false,
    },
    { type: AnswerDto, body: { content: 'Resposta' }, field: 'is_anonymous', defaultValue: false },
  ])(
    'defaults omitted flags but rejects null and string booleans in $type.name',
    async ({ type, body, field, defaultValue }) => {
      const metadata = { type: 'body' as const, metatype: type };
      expect((await pipe.transform(body, metadata))[field]).toBe(defaultValue);
      expect((await pipe.transform({ ...body, [field]: false }, metadata))[field]).toBe(false);
      await expect(pipe.transform({ ...body, [field]: null }, metadata)).rejects.toThrow();
      await expect(pipe.transform({ ...body, [field]: 'false' }, metadata)).rejects.toThrow();
    },
  );
});
