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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';

@Controller('agents')
@ApiTags('agents')
export class AgentsController {
  readonly #_service: AgentsService;
  constructor(service: AgentsService) {
    this.#_service = service;
  }
  @Get('agents/all')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  async findAllAgents() {
    return await this.#_service.findAllAgents();
  }
  @Get('sentdMessage')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  async sentMessage() {
    return await this.#_service.handleAgentsSenDataToTelegram();
  }

  @Get('findComeToWorkOnTimeData')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      "Ishga kech qolganlarni ro'yhatini olish uchun api. Sanani formati 01.04.2024 , idRMO  qidiriluvchi rmo idsi yo'q bolsa null qiymat jo'natasiz, fullname qidiriluvchi to'liq ismi yo'q bo'lsa null",
  })
  async findControlAgentsDate(
    @Query('login') login: string,
    @Query('fullname') fullname: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findComeToWorkOnTimeData(
      login,
      fullname,
      fromDate,
      untilDate,
    );
  }

  @Get('findLeftAfterWorkData')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      "Ishdan erta ketganlarni   ro'yhatini olish uchun api. Sanani formati 01.04.2024 , , idRMO  qidiriluvchi rmo idsi yo'q bolsa null qiymat jo'natasiz, fullname qidiriluvchi to'liq ismi yo'q bo'lsa null",
  })
  async findLeftAfterWorkData(
    @Query('login') login: string,
    @Query('fullname') fullname: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findLeftAfterWorkData(
      login,
      fullname,
      fromDate,
      untilDate,
    );
  }

  @Get('findallBanTimeData')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      "10m dan ko'p pereriv olgan operatorlar ro'hati . Sanani formati 01.04.2024 , idRMO  qidiriluvchi rmo idsi yo'q bolsa null qiymat jo'natasiz, fullname qidiriluvchi familyasi yo'q bo'lsa null",
  })
  async findallBanTimeData(
    @Query('login') login: string,
    @Query('fullname') fullname: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findallBanTimeData(
      login,
      fullname,
      fromDate,
      untilDate,
    );
  }

  @Get('findallworkedLess')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      "9 soat kam ishlagan operatorlar ro'hati . Sanani formati 01.04.2024, idRMO  qidiriluvchi rmo idsi yo'q bolsa null qiymat jo'natasiz, fullname qidiriluvchi familyasi yo'q bo'lsa null",
  })
  async findWorkedLessData(
    @Query('login') login: string,
    @Query('fullname') fullname: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findWorkedLessData(
      login,
      fullname,
      fromDate,
      untilDate,
    );
  }

  @Get('findallBanBlockData')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      "blockdan blockga o'tgan  operatorlar ro'hati . Sanani formati 01.04.2024  , idRMO  qidiriluvchi rmo idsi yo'q bolsa null qiymat jo'natasiz, fullname qidiriluvchi familyasi yo'q bo'lsa null",
  })
  async findallBanBlockData(
    @Query('login') login: string,
    @Query('fullname') fullname: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findallBanBlockData(
      login,
      fullname,
      fromDate,
      untilDate,
    );
  }

  @Get('findLockData')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      "1 ta operatorni 10m dan ko'p pereriv olgan va blockdan block ga o'tgan holatlari . Sanani formati 01.04.2024 , type_block ga 'all' qiymat yuborilsa barcha malumoti keladi, 'time' yuborilsa 10m dan ko'p pereriv olganlar ,'block' yuborilsa blockdan blockga otganlar chiqadi.",
  })
  async findLockData(
    @Query('agent_id') agent_id: string,
    @Query('type_block') type_block: string,
    @Query('pageNumber') pageNumber: string,
    @Query('pageSize') pageSize: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findLockData(
      agent_id,
      type_block,
      +pageNumber,
      +pageSize,
      fromDate,
      untilDate,
    );
  }

  @Get('findControlTgraphData')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description: `1 operatorni kech qolishi,erta ketishi, to'liq ishlamaganligi haqida malumotlar. Sanani formati 01.04.2024
      type_ban qabul qiladigan qiymatlar all = hammasi , not_at_work = nb , stay_up_late = ishga kech qolganlar ,left_work_early = ishdan erta ketganlar , worked_less = 9 - soatdan kam ishlaganlar. 
      `,
  })
  async findControlTgraphData(
    @Query('agent_id') agent_id: string,
    @Query('type_ban') type_ban: string,
    @Query('pageNumber') pageNumber: string,
    @Query('pageSize') pageSize: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findControlTgraphData(
      agent_id,
      type_ban,
      +pageNumber,
      +pageSize,
      fromDate,
      untilDate,
    );
  }

  @Get('findAllGraphandBlockData')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      'Barcha grafik va blokdan blokga otish  malumotlarini olib kelish. Barcha operatorlar keladi. Sanani formati 01.04.2024',
  })
  async findAllGraphAndBlockData(
    @Query('login') login: string,
    @Query('fullname') fullname: string,
    @Query('pageNumber') pageNumber: string,
    @Query('pageSize') pageSize: string,
    @Query('fromDate') fromDate: string,
    @Query('untilDate') untilDate: string,
  ) {
    return await this.#_service.findAllGraphAndBlockData(
      login,
      fullname,
      +pageNumber,
      +pageSize,
      fromDate,
      untilDate,
    );
  }

  @Get('allBlock')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  async findAll(
    @Query('pageNumber') pageNumber: number,
    @Query('pageSize') pageSize: number,
  ) {
    return await this.#_service.findAll(pageNumber, pageSize);
  }
  @Get('findByFilter?')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  async filterall(
    @Query('name') name: string,
    @Query('operator_number') operator_number: string,
    @Query('status') status: string,
  ) {
    return await this.#_service.filterAll(name, operator_number, status);
  }

  @Get('agent/updateOrAddNewGraph')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      'Grafikni yangilash  yoki yangi oyni grafigini qoshib qoyish uchun Api',
  })
  async UpdateOrAddNewGraph() {
    return await this.#_service.UpdateOrAddNewGraph();
  }

  @Get('agent/graph')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiOperation({
    description:
      'Bitta operatorni ish grafikini olish uchun Api. Login ga operator dasturga kirish raqami kiritiladi',
  })
  async findAgentGraph(@Query('login') login: string) {
    return await this.#_service.findAgentGraph(login);
  }

  @Patch('/updateAgentSupervazer/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          default: 'True',
        },
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateAgentdto: { status: boolean },
  ) {
    return this.#_service.updateAgent(id, updateAgentdto);
  }
}
