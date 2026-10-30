import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartSessionDto {
  @IsString() @Matches(/^[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}$/) licensePlate!: string;
  @IsUUID() busLineId!: string;
}
export class VehicleDto {
  @IsString() @Matches(/^[A-Z]{3}-[0-9][A-Z0-9][0-9]{2}$/) licensePlate!: string;
}
export class LocationDto extends StartSessionDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  position!: [number, number];
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(80) speed!: number;
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(359.99) headingTowards!: number;
  @IsISO8601({ strict: true, strictSeparator: true }) timestamp!: string;
}
export class RestLocationDto {
  @IsUUID() busLineId!: string;
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  position!: [number, number];
  @IsNumber() @Min(0) @Max(80) speed!: number;
  @IsNumber() @Min(0) @Max(359.99) headingTowards!: number;
  @IsISO8601({ strict: true, strictSeparator: true }) timestamp!: string;
}
export class SubscribeDto {
  @IsOptional() @IsUUID() busLineId?: string;
}
export class BatchRecordDto {
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  position!: [number, number];
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(80) speed!: number;
  @IsNumber({ allowNaN: false, allowInfinity: false }) @Min(0) @Max(359.99) headingTowards!: number;
  @IsISO8601({ strict: true, strictSeparator: true }) timestamp!: string;
}
export class BatchLocationDto extends VehicleDto {
  @IsOptional() @IsUUID() busLineId?: string;
  @IsOptional() @IsUUID() sessionId?: string; // Original session of the buffered readings.
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BatchRecordDto)
  records!: BatchRecordDto[];
}
