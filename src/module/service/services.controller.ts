import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ServicesService } from './services.service';

@Controller('services')
@ApiTags('services')
export class ServicesController {
  readonly #_service: ServicesService;
  constructor(service: ServicesService) {
    this.#_service = service;
  }

  @Get('statistik')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  async findAll(
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findStatistick(fromDate, untilDate);
  }

  @Post('create/service')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['service_id'],
      properties: {
        service_id: {
          type: 'string',
          default: 'acds',
        },
      },
    },
  })
  async createService(@Body() body: { service_id: string }) {
    return this.#_service.createService(body);
  }

  @Post('create/group')
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    schema: {
      type: 'object',
      required: ['service_id', 'group_id', 'name', 'title'],
      properties: {
        service_id: {
          type: 'string',
          default: 'acds',
        },
        group_id: {
          type: 'string',
          default: 'acds',
        },
        name: {
          type: 'string',
          default: 'acds',
        },
        title: {
          type: 'string',
          default: 'acds',
        },
      },
    },
  })
  async createGroup(
    @Body()
    body: {
      service_id: string;
      group_id: string;
      name: string;
      title: string;
    },
  ) {
    return this.#_service.createGroup(body);
  }
}
