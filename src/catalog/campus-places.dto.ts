import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
export class PatchPlaceDto {
  @IsOptional() @IsString() @Length(1, 150) @Matches(/\S/) name?: string;
  @IsOptional() @IsString() @Length(1, 50) @Matches(/\S/) category?: string;
  @IsOptional() @IsString() @Length(0, 10000) description?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  position?: [number, number];
}
