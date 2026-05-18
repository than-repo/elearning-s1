import { Body, Controller, Get } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { LearnerGetCoursesQueryDto } from '../dtos/learner-get-courses.query.dto.ts';
import { CourseListItemDto } from '../dtos/course-list-item.dto';
import { GetCoursesResponseDto } from '../dtos/get-courses.response.dto';
import { CoursesService } from '../services/courses.service.js';

@ApiTags('Courses-Public')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}
  //   //public router
  //   @Get('courses')
  //   @ApiOperation({ summary: 'Get all courses - public api' })
  //   @ApiOkResponse({ description: 'Get course succuessfuly' })
  //   @ApiBadRequestResponse({ description: '' })
  //   @Throttle({ default: { ttl: 60, limit: 10 } })
  //   async findAll(
  //     @Body() learnerGetCoursesQueryDto: LearnerGetCoursesQueryDto,
  //   ): Promise<GetCoursesResponseDto<CourseListItemDto>> {
  //     const courses = await this.coursesService.findAll(
  //       learnerGetCoursesQueryDto,
  //     );
  //     return {};
  //   }
}
