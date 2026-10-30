import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class PatchStopDto {
  @IsOptional() @IsString() @Length(1, 50) @Matches(/\S/) shortName?: string;
  @IsOptional() @IsString() @Length(1, 150) @Matches(/\S/) longName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  position?: [number, number];
}
export class AdminLineDto {
  @IsOptional() @IsUUID() id?: string;
  @IsString() @Length(1, 20) @Matches(/\S/) code!: string;
  @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
  @IsBoolean() isActive = true;
}
export class RouteEntryDto {
  @IsUUID() busStopId!: string;
  @IsInt() @Min(1) stopSequence!: number;
  @IsOptional() @IsInt() @Min(0) estimatedMinutesFromPrevious?: number;
}
