import { Body, Controller , Get, HttpCode, HttpStatus, Post, Query ,Patch ,Param ,} from "@nestjs/common";
import { ApiBadRequestResponse, ApiBody, ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AgentsService } from "./agents.service";

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
  async filterall(  @Query('name') name: string,
  @Query('operator_number') operator_number: string,
  @Query('status') status: string,) {
    return await this.#_service.filterAll(name , operator_number , status);
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
  async update(@Param('id') id: string, @Body() updateAgentdto: {status: boolean}) {
    return this.#_service.updateAgent(id, updateAgentdto);
  }
}
