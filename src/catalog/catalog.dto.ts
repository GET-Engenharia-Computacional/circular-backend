import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
export class LineDto {
  @IsString() @Length(1, 20) @Matches(/\S/) code!: string;
  @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
  @IsBoolean() isActive = true;
}
export class PlateDto {
  @IsString() @Matches(/^[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}$/) licensePlate!: string;
  @IsBoolean() isActive = true;
}
export class StopDto {
  @IsString() @Length(1, 50) @Matches(/\S/) shortName!: string;
  @IsString() @Length(1, 150) @Matches(/\S/) longName!: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  position!: [number, number];
  @IsBoolean() isActive = true;
}
export class PlaceDto {
  @IsBoolean() isActive = true;
  @IsString() @Length(1, 150) @Matches(/\S/) name!: string;
  @IsString() @Length(1, 50) @Matches(/\S/) category!: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  position!: [number, number];
  @IsOptional() @IsString() @Length(0, 10000) description?: string;
}
export class IdParam {
  @IsUUID() id!: string;
}
export class ActivationDto {
  @IsBoolean() isActive!: boolean;
}
