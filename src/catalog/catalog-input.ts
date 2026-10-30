import { BadRequestException } from '@nestjs/common';

export function campusPosition(position: readonly number[]) {
  const [lng, lat] = position;
  if (
    position.length !== 2 ||
    !Number.isFinite(lng) ||
    !Number.isFinite(lat) ||
    lng < -43.4 ||
    lng > -43.3 ||
    lat < -21.8 ||
    lat > -21.7
  )
    throw new BadRequestException(
      'Coordenadas fora da UFJF/Juiz de Fora: longitude -43.40 a -43.30 e latitude -21.80 a -21.70. Use [longitude, latitude].',
    );
}
// Names/descriptions are plain text, never HTML. Reject markup rather than trying
// to repair arbitrary HTML with a regex; React also escapes all displayed values.
export function plainText(value: string, allowEmpty = false) {
  const text = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (/[<>]/.test(text))
    throw new BadRequestException('Use texto simples, sem tags HTML ou scripts.');
  if (!allowEmpty && !text) throw new BadRequestException('O texto não pode estar vazio.');
  return text;
}
