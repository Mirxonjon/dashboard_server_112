import axios from 'axios';
import { dataGroupEntity } from 'src/entities/dataGroup.entity';
import { GroupsEntity } from 'src/entities/group.entity';
import { parseStringPromise } from 'xml2js';
import { convertTimeToSeconds, formatSecondsToTime } from './converters';
import { agentsDataStateEntity } from 'src/entities/agentsDataState.entity';
import { getBotToken } from 'nestjs-telegraf';
import { agentslockEntity } from 'src/entities/agentslock.entity';
import { Telegraf, Context } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import * as dotenv from 'dotenv';
import { Cache } from 'cache-manager';

export const fetchStatisticByGroup = async (bot:Telegraf<Context<Update>>) => {
  const findGroups = await GroupsEntity.find();

  findGroups.forEach(async (e) => {

    const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ct">
      <soapenv:Header/>
      <soapenv:Body>
         <urn:PrCtGetStatisticTlv>
            <!--Optional:-->
            <urn:PrCtGetStatisticTlvReq>
               <urn:ObjectType>2</urn:ObjectType>
               <!--Zero or more repetitions:-->            
                <urn:listID>${e.group_id}</urn:listID>
            </urn:PrCtGetStatisticTlvReq>
         </urn:PrCtGetStatisticTlv>
      </soapenv:Body>
   </soapenv:Envelope>`;

    const { data } = await axios.post(
      'http://10.145.32.3:15358/ct?wsdl',
      xml
    );
    const convertedData = await parseStringPromise(data);
    // <urn:listID>${e.group_id}</urn:listID>
    console.log(convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ]);
    console.log(convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]);

    const acceptedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][1]['ct:strValue'][0];

    const presentedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][2]['ct:strValue'][0];
      const FailedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][3]['ct:strValue'][0];
      const TransferCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][4]['ct:strValue'][0];
      const TransferToServiceCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][5]['ct:strValue'][0];
      const TransferToGroupCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][6]['ct:strValue'][0];
      const TransferToAgentCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][7]['ct:strValue'][0];
      const TransferToOutCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][8]['ct:strValue'][0];
      const ConsultCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][9]['ct:strValue'][0];
      const ExternalCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][10]['ct:strValue'][0];
      const FailedExternalCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][11]['ct:strValue'][0];
      const IndirectedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][12]['ct:strValue'][0];
      const ReturnedFromIVRCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][13]['ct:strValue'][0];
      const NotActualCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][14]['ct:strValue'][0];
    const lostCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][15]['ct:strValue'][0];
      const MistakedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][16]['ct:strValue'][0];

    const straggleCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][17]['ct:strValue'][0];
      const DistributeWithQueueCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][18]['ct:strValue'][0];
      const DistributeWithoutQueueCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][19]['ct:strValue'][0];
      const NoAnswerCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][20]['ct:strValue'][0];
      const NoAnswerCountWithoutQueue =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][21]['ct:strValue'][0];
      const AverageTimeBeforeConnect =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][25]['ct:strValue'][0];
    const AverageCallDuration =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][26]['ct:strValue'][0];
    const AverageQueueDuration =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][27]['ct:strValue'][0];
      const AverageQueueDispatchedDuration =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][28]['ct:strValue'][0];
      const AverageQueueFailedDuration =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][29]['ct:strValue'][0];
      const MaxQueueDuration =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][30]['ct:strValue'][0];

      const QueuedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][33]['ct:strValue'][0];
      const LongQueueCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][34]['ct:strValue'][0];
      const QueueThresholdCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][35]['ct:strValue'][0];
      const QueueThresholdCallCount2 =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][36]['ct:strValue'][0];
      const QueueThresholdDispatchedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][37]['ct:strValue'][0];

      const QueueDispatchedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][38]['ct:strValue'][0];

      const QueuedFailedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][39]['ct:strValue'][0];
      const ThresholdBrakeCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][40]['ct:strValue'][0];

      const QueueDeletedCallCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][41]['ct:strValue'][0];
      const CurrentQueueSize =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][42]['ct:strValue'][0];

      const MaxQueueSize =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][43]['ct:strValue'][0];
      

      
      const CreatedCallbackCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][46]['ct:strValue'][0];

      const CreatedAutoCallbackCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][47]['ct:strValue'][0];

      const QueueCreatedCallbackCount =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][48]['ct:strValue'][0];

          const QueueCreatedAutoCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][49]['ct:strValue'][0];

    const FailedCallbackAttemptCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][50]['ct:strValue'][0];

    const ServedCallbackAttemptCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][51]['ct:strValue'][0];

    const NoAnswerCallbackAttemptCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][52]['ct:strValue'][0];

    const BusyCallbackAttemptCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][53]['ct:strValue'][0];

    const CancelledBySubscriberCallbackAttemptCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][54]['ct:strValue'][0];

    const CancelledByChiefCallbackAttemptCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][55]['ct:strValue'][0];

    const CancelledOnScheduleCallbackAttemptCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][56]['ct:strValue'][0];

    const ServedCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][57]['ct:strValue'][0];

    const NoAnswerCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][58]['ct:strValue'][0];

    const BusyCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][59]['ct:strValue'][0];

    const FailedCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][60]['ct:strValue'][0];

    const CancelledBySubscriberCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][61]['ct:strValue'][0];

    const CancelledByChiefCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][62]['ct:strValue'][0];

    const CancelledOnScheduleCallbackCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][63]['ct:strValue'][0];

    const AgentHourCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][66]['ct:strValue'][0];

    const CurrAgentCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][67]['ct:strValue'][0];

    const ReadyAgentCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][68]['ct:strValue'][0];

    const UnservicedCallCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][70]['ct:strValue'][0];

    const UnservicedECS_Count =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][71]['ct:strValue'][0];

    const MissedMoreN_CallCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][72]['ct:strValue'][0];

    const MaxQueueUnservicedDuration =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][73]['ct:strValue'][0];

    const SumDistributeIncomingCallCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][74]['ct:strValue'][0];

    const SumDistributeIncomingMoreN_CallCount =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][75]['ct:strValue'][0];

    const MaxQueueIncomingDispatchedDuration =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
      'ct:TmStatDataValueTlv'
    ][76]['ct:strValue'][0];
//comment
    const queueDispatchedCallCoun =
      convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
        'ct:PrCtGetStatisticTlvResp'
      ][0]['ct:listStatistic'][0]['ct:TmCtStatisticTlv'][0]['ct:listValue'][0][
        'ct:TmStatDataValueTlv'
      ][39]['ct:strValue'][0];

      

      const messageStatistic = `
      <b>Отчет по вызовам</b>
      
  <b>Параметр</b>                        <b>Значение</b>
  ---------------------------------------
  Кол-во поступивших вызовов      ${acceptedCallCount}
  Кол-во предоставленных услуг    ${presentedCallCount}
  Кол-во непредоставленных услуг  ${FailedCallCount}
  Кол-во переадресаций            ${TransferCount}
  Кол-во переадресаций на службу  ${TransferToServiceCount}
  Кол-во переадресаций на группу  ${TransferToGroupCount}
  Кол-во переадресаций на оператора ${TransferToAgentCount}
  Кол-во переадресаций на внешний номер ТфОП ${TransferToOutCount}
  Кол-во консультаций             ${ConsultCount}
  Кол-во исходящих вызовов        ${ExternalCallCount}
  Кол-во неудачных исходящих вызовов ${FailedExternalCallCount}
  Кол-во переадресованных вызовов ${IndirectedCallCount}
  ???-?? ????????? ?? IVR         ${ReturnedFromIVRCallCount}
  Кол-во неактуальных вызовов     ${NotActualCallCount}
  Кол-во потерянных вызовов       ${lostCallCount}
  Кол-во ошибочных вызовов       ${MistakedCallCount}
  Кол-во вызовов, отбившихся на подсказке приветствия ${straggleCallCount}
  Кол-во вызовов, распределившихся на операторов ${DistributeWithQueueCallCount}
  Кол-во вызовов, распределившихся на операторов без ожидания в очереди ${DistributeWithoutQueueCallCount}
  Кол-во неответов                ${NoAnswerCount}
  Кол-во неответов (попытка распределения без ожидания в очереди) ${NoAnswerCountWithoutQueue}
  
  <b>Времена</b>
  Среднее время распределения вызова ${AverageTimeBeforeConnect}
  Среднее время разговора        ${AverageCallDuration}
  Среднее время ожидания         ${AverageQueueDuration}
  Среднее время ожидания распределившихся вызовов ${AverageQueueDispatchedDuration}
  Среднее время ожидания отбившися вызовов ${AverageQueueFailedDuration}
  Максимальное время ожидания    ${MaxQueueDuration}
  
  <b>Очередь</b>
  Кол-во вызовов, поступивших в очередь ${QueuedCallCount}
  Кол-во вызовов, у кот. Время ожидания в очереди > 15сек ${LongQueueCallCount}
  Кол-во вызовов со временем ожидания больше порога ${QueueThresholdCallCount}
  Кол-во респределившихся вызовов со временем ожидания больше порога ${QueueThresholdDispatchedCallCount}
  Кол-во вызовов со временем ожидания больше порога ${QueueDispatchedCallCount}
  Кол-во вызовов, распределившихся из очереди ${QueuedFailedCallCount}
  Кол-во вызовов, отбившихся из очереди ${ThresholdBrakeCallCount}
  Кол-во вызовов в очереди больше порога ${QueueDeletedCallCount}
  Кол-во вызовов, удалённых из очереди ${CurrentQueueSize}
  Текущий размер очереди         ${MaxQueueSize}
  
  <b>Обратные вызовы</b>
  Кол-во созданных заказных ОВ    ${CreatedCallbackCount}
  Кол-во созданных овто ОВ        ${CreatedAutoCallbackCount}
  Кол-во созданных в очереди заказных ОВ ${QueueCreatedCallbackCount}
  Кол-во созданных в очереди авто ОВ ${QueueCreatedAutoCallbackCount}
  Кол-во неуспешных попыток ОВ    ${FailedCallbackAttemptCount}
  Кол-во успешных попыток ОВ      ${ServedCallbackAttemptCount}
  Кол-во попыток ОВ, абонент не ответил ${NoAnswerCallbackAttemptCount}
  Кол-во попыток ОВ, абонент занят ${BusyCallbackAttemptCount}
  Кол-во попыток ОВ, отмененных абонентом ${CancelledBySubscriberCallbackAttemptCount}
  Кол-во попыток ОВ, отмененных старшим оператором ${CancelledByChiefCallbackAttemptCount}
  Кол-во попыток ОВ, удаленных по расписанию ${CancelledOnScheduleCallbackAttemptCount}
  Кол-во обслуженных ОВ           ${ServedCallbackCount}
  Кол-во ОВ, абонент не ответил   ${NoAnswerCallbackCount}
  Кол-во ОВ, абонент занят        ${BusyCallbackCount}
  Кол-во необслуженных ОВ         ${FailedCallbackCount}
  Кол-во ОВ, отмененных абонентом ${CancelledBySubscriberCallbackCount}
  Кол-во ОВ, отмененных старшим оператором ${CancelledByChiefCallbackCount}
  Кол-во ОВ, удаленных по расписанию ${CancelledOnScheduleCallbackCount}
  
  Кол-во зарегистрированных операторов (в агенточасах) ${AgentHourCount}
  Кол-во зарегистрированных операторов на начало часа ${CurrAgentCount}
  Кол-во операторов, готовых к обслуживанию ${ReadyAgentCount}
  
  Кол-во необслуженных вызовов    ${UnservicedCallCount}
  Кол-во необслуженных отбившихся вызовов ${UnservicedECS_Count}
  Кол-во необсл.ожид.>N вызовов   ${MissedMoreN_CallCount}
  Макс.время ожидания необсл. вызовов ${MaxQueueUnservicedDuration}
  Кол-во обслуженных вызовов      ${SumDistributeIncomingCallCount}
  Кол-во обсл.ожид.>N вызовов     ${SumDistributeIncomingMoreN_CallCount}
  Макс.время ожидания обсл. Вызовов ${MaxQueueIncomingDispatchedDuration}
      `;
      
    //  await bot.telegram.sendMessage(
    //       `${process.env.TG_Group_ID_STATISTIK}` ,
    //       messageStatistic,
    //       { parse_mode: 'HTML' }
    //   );
      
  

    dataGroupEntity.save({
      group_id: e.group_id,
      acceptedCallCount,
      presentedCallCount,
      lostCallCount,
      straggleCallCount,
      averageTimeBeforeConnect : AverageTimeBeforeConnect,
      averageCallDuration : AverageCallDuration,
      queueDispatchedCallCoun,
    });
  });
};

export const operatorsWhere = async (
  bot: Telegraf<Context<Update>>,
  cache: Cache,
): Promise<any[]> => {
  console.log('okk');
  
  let arrBlockAgents = [];
  const sampleHeaders = {
    'user-agent': 'sampleTest',
    'Content-Type': 'text/xml;charset=UTF-8',
    soapAction: 'urn:ct/ctPortType/PrCtAgentsRequest',
  };
  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ct">
    <soapenv:Header/>
    <soapenv:Body>
       <urn:PrCtGroupContent2>
          <!--Optional:-->
          <urn:PrCtGroupContent2Req>
             <urn:serviceId>11</urn:serviceId>
             <urn:groupId>1</urn:groupId>
          </urn:PrCtGroupContent2Req>
       </urn:PrCtGroupContent2>
    </soapenv:Body>
 </soapenv:Envelope>`;

  const { data } = await axios.post('http://10.145.32.3:15358/ct?wsdl', xml, {
    headers: sampleHeaders,
  });
  const convertedData = await parseStringPromise(data);
  // console.log(  convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
  //   'ct:PrCtGroupContent2Resp'
  // ][0]['ct:agents'][0]['ct:TmCtAgentInGroup2']);

  const agents =
    convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGroupContent2Resp'
    ][0]['ct:agents'][0]['ct:TmCtAgentInGroup2'];
  let arrActiveOperators = [];
  for (let i = 0; i < agents.length; i++) {
    if (agents[i]['ct:ip'][0]) {
// console.log(agents[i]['ct:ip'][0]);

      arrActiveOperators.push({
        id: agents[i]['ct:id'][0],
        ip_adress: agents[i]['ct:ip'][0],
        login: agents[i]['ct:login'][0],
        firstName: agents[i]['ct:firstName'][0],
        lastName: agents[i]['ct:lastName'][0],
        secondName: agents[i]['ct:secondName'][0],
        lockCause: agents[i]['ct:lockCause'][0],
        agentState: agents[i]['ct:agentState'][0],
        agentStateDuration: agents[i]['ct:agentStateDuration'][0],
      });

      const arr = ['0', '2', '3', '4', '6', '8', '11'];
      const findAgent = await agentsDataStateEntity.findOneBy({
        id: agents[i]['ct:id'][0],
      });
      // console.log(findAgent , 'f');
      if (arr.includes(agents[i]['ct:lockCause'][0]) && findAgent) {
        if (
          findAgent.lockCause == agents[i]['ct:lockCause'][0] &&
          agents[i]['ct:agentStateDuration'][0] > 600
        ) {
          if (!findAgent.IsSupervazer) {
            // console.log(findAgent, 'f');

            const findAgentlock = await agentslockEntity.find({
              where: {
                id: agents[i]['ct:id'][0],
              },
              order: {
                create_data: 'DESC',
              },
            });
            let data: any = {};

            if (
              findAgent.TgMsgId == 'null' &&
              agents[i]['ct:agentStateDuration'][0] < 720
            ) {
              // data = await bot.telegram.sendMessage(
              //   process.env.TG_Chanel_ID,
              //   ` ${findAgent.lastName} ${findAgent.firstName} ${findAgent.secondName} превысил 10-минутный перерыв`,
              // );
              // console.log(findAgent , 'f');

              await agentsDataStateEntity.update(
                { id: findAgent.id },
                {
                  TgMsgSentTime: agents[i]['ct:agentStateDuration'][0],
                  TgMsgId: data.message_id,
                },
              );
            } else if (
              agents[i]['ct:agentStateDuration'][0] - +findAgent.TgMsgSentTime >
              300
            ) {
              // data = await bot.telegram.sendMessage(
              //   process.env.TG_Chanel_ID,
              //   `Оператор ${findAgent.lastName} ${findAgent.firstName} ${
              //     findAgent.secondName
              //   } всё ещё не включился на линию! ${formatSecondsToTime(
              //     agents[i]['ct:agentStateDuration'][0],
              //   )}`,
              //   { reply_to_message_id: +findAgent.TgMsgId },
              // );
              await agentsDataStateEntity.update(
                { id: findAgent.id },
                {
                  TgMsgSentTime: agents[i]['ct:agentStateDuration'][0],
                  TgMsgId: data.message_id,
                },
              );
            }

            if (findAgentlock[0] && !findAgent.addToblockTable) {
              await agentslockEntity.update(
                { agent_id: findAgentlock[0].agent_id },
                {
                  agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                },
              );
              arrBlockAgents.push({
                ...findAgentlock[0],
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
              });
            } else {
              await agentslockEntity.save({
                id: agents[i]['ct:id'][0],
                firstName: agents[i]['ct:firstName'][0],
                login: Number(agents[i]['ct:login'][0]),
                lastName: agents[i]['ct:lastName'][0],
                secondName: agents[i]['ct:secondName'][0],
                agentState: agents[i]['ct:agentState'][0],
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                lastAgentStateDuration: findAgent.lastAgentStateDuration,
                lockCause: agents[i]['ct:lockCause'][0],
                lastLockCause: findAgent.lastLockCause,
                banInfo: 'time',
              });

              arrBlockAgents.push({
                id: agents[i]['ct:id'][0],
                firstName: agents[i]['ct:firstName'][0],
                login: agents[i]['ct:login'][0],
                lastName: agents[i]['ct:lastName'][0],
                secondName: agents[i]['ct:secondName'][0],
                agentState: agents[i]['ct:agentState'][0],
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                lastAgentStateDuration: agents[i]['ct:agentStateDuration'][0],
                lockCause: agents[i]['ct:lockCause'][0],
                lastLockCause: findAgent.lastLockCause,
                banInfo: 'time',
              });
            }

            await agentsDataStateEntity.update(
              { id: findAgent.id },
              {
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                addToblockTable: false,
              },
            );
          }
        } else if (
          findAgent.lockCause != agents[i]['ct:lockCause'][0] &&
          arr.includes(`${findAgent.lockCause}`)
        ) {
          // console.log(findAgent , 'wwwf');

          if (!findAgent.IsSupervazer) {
            const findAgentlock = await agentslockEntity.find({
              where: {
                id: agents[i]['ct:id'][0],
              },
              order: {
                create_data: 'DESC',
              },
            });
            if (findAgentlock[0] && !findAgent.addToblockTable) {
              await agentslockEntity.update(
                { agent_id: findAgentlock[0].agent_id },
                {
                  agentState: agents[i]['ct:agentState'][0],
                  agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                  lastAgentStateDuration:
                    findAgent.IsBlockToBlock == false
                      ? findAgent.agentStateDuration
                      : findAgentlock[0].lastAgentStateDuration,
                  lockCause: agents[i]['ct:lockCause'][0],
                  lastLockCause: findAgent.lockCause,
                },
              );

              arrBlockAgents.push({
                ...findAgentlock[0],
                agentState: agents[i]['ct:agentState'][0],
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                lastAgentStateDuration:
                  findAgent.IsBlockToBlock == false
                    ? findAgent.agentStateDuration
                    : findAgentlock[0].lastAgentStateDuration,
                lockCause: agents[i]['ct:lockCause'][0],
                lastLockCause: findAgent.lockCause,
                banInfo: 'block',
              });
            } else {
              await agentslockEntity.save({
                id: agents[i]['ct:id'][0],
                firstName: agents[i]['ct:firstName'][0],
                login: Number(agents[i]['ct:login'][0]),
                lastName: agents[i]['ct:lastName'][0],
                secondName: agents[i]['ct:secondName'][0],
                agentState: agents[i]['ct:agentState'][0],
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                lastAgentStateDuration: findAgent.agentStateDuration,
                lockCause: agents[i]['ct:lockCause'][0],
                lastLockCause: findAgent.lockCause,
                banInfo: 'block',
              });

              arrBlockAgents.push({
                id: agents[i]['ct:id'][0],
                firstName: agents[i]['ct:firstName'][0],
                login: agents[i]['ct:login'][0],
                lastName: agents[i]['ct:lastName'][0],
                secondName: agents[i]['ct:secondName'][0],
                agentState: agents[i]['ct:agentState'][0],
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                lastAgentStateDuration: findAgent.agentStateDuration,
                lockCause: agents[i]['ct:lockCause'][0],
                lastLockCause: findAgent.lockCause,
                banInfo: 'block',
              });
              const message = {
                '0': '🔒',
                '2': '🚬',
                '3': '👑',
                '4': '💻',
                '6': '🏃',
                '7': '🧑‍🎓',
                '8': '📤',
                '11': '📝',
              };
              const arr = ['0', '2', '3', '4', '6', '8', '11'];

              // await bot.telegram.sendMessage(
              //   process.env.TG_Chanel_ID,
              //   `   ${findAgent.lastName} ${findAgent.firstName} ${
              //     findAgent.secondName
              //   } поменял статус ${message[findAgent.lockCause]} на ${
              //     message[agents[i]['ct:lockCause'][0]]
              //   }`,
              // );
            }
            await agentsDataStateEntity.update(
              { id: findAgent.id },
              {
                agentState: agents[i]['ct:agentState'][0],
                lastAgentStateDuration:
                  findAgent.IsBlockToBlock == false
                    ? findAgent.agentStateDuration
                    : findAgent.lastAgentStateDuration,
                agentStateDuration: agents[i]['ct:agentStateDuration'][0],
                IsBlockToBlock: true,
                addToblockTable: false,
              },
            );
          }
        } else {
          await agentsDataStateEntity.update(
            { id: findAgent.id },
            {
              agentState: agents[i]['ct:agentState'][0],
              agentStateDuration: agents[i]['ct:agentStateDuration'][0],
              lastAgentStateDuration:
                findAgent.IsOnlineToBlock == true
                  ? findAgent.agentStateDuration
                  : findAgent.lastAgentStateDuration,
              lockCause: agents[i]['ct:lockCause'][0],
              lastLockCause:
                findAgent.IsOnlineToBlock == true
                  ? findAgent.lockCause
                  : findAgent.lastLockCause,
              IsOnlineToBlock: false,
              IsBlockToBlock: true,
              addToblockTable: true,
              TgMsgId: 'null',
            },
          );
        }
      } else if (findAgent) {
        await agentsDataStateEntity.update(
          { id: findAgent.id },
          {
            agentState: agents[i]['ct:agentState'][0],
            agentStateDuration: agents[i]['ct:agentStateDuration'][0],
            lastAgentStateDuration:
              findAgent.IsBlockToBlock == true
                ? findAgent.agentStateDuration
                : findAgent.lastAgentStateDuration,
            lockCause: agents[i]['ct:lockCause'][0],
            lastLockCause:
              findAgent.IsBlockToBlock == true
                ? findAgent.lockCause
                : findAgent.lastLockCause,
            IsBlockToBlock: false,
            IsOnlineToBlock: true,
            addToblockTable: true,
            TgMsgId: 'null',
          },
        );
      } else {
        await agentsDataStateEntity.save({
          id: agents[i]['ct:id'][0],
          firstName: agents[i]['ct:firstName'][0],
          login: agents[i]['ct:login'][0],
          lastName: agents[i]['ct:lastName'][0],
          secondName: agents[i]['ct:secondName'][0],
          agentState: agents[i]['ct:agentState'][0],
          agentStateDuration: agents[i]['ct:agentStateDuration'][0],
          IsSupervazer: false,
          lockCause: agents[i]['ct:lockCause'][0],
        });
      }
    }
  }
  await cache.set('activeOperators', arrActiveOperators, 3600000);
  return arrBlockAgents;
};
