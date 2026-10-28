import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString() @Length(1, 50) @Matches(/^\S+$/) registrationNumber!: string;
  @IsString() @Length(8, 72) password!: string;
}
export class RegisterDto extends LoginDto {
  @IsString() @Length(8, 72) passwordConfirmation!: string;
  @IsOptional() @IsIn(['driver', 'passenger']) accountType?: 'driver' | 'passenger';
}
