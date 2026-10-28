import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards';
import { IdParam } from '../catalog/catalog.dto';
import { PageQuery } from '../common/dto';
import { AnswerDto, PostDto } from './forum.dto';
import { ForumService } from './forum.service';
@Controller('forum/posts')
export class ForumController {
  constructor(private readonly forum: ForumService) {}
  @Get() list(@Query() q: PageQuery) {
    return this.forum.list(q);
  }
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: Request & { user: AuthUser }, @Body() dto: PostDto) {
    return this.forum.create(req.user.id, dto);
  }
  @Post(':id/answers')
  @UseGuards(JwtAuthGuard)
  answer(@Param() p: IdParam, @Req() req: Request & { user: AuthUser }, @Body() dto: AnswerDto) {
    return this.forum.answer(p.id, req.user.id, dto);
  }
}
