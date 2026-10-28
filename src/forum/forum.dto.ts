import { IsBoolean, IsString, Length, Matches } from 'class-validator';
export class AnswerDto {
  @IsString() @Length(1, 10000) @Matches(/\S/) content!: string;
  @IsBoolean() is_anonymous = false;
}
export class PostDto extends AnswerDto {
  @IsString() @Length(1, 255) @Matches(/\S/) title!: string;
}
