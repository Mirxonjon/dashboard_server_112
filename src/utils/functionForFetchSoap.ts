import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export const fetchGetagentStatistic = async (id: number) => {
  // 2751
  //     const sampleHeaders = {
  //     'user-agent': 'sampleTest',
  //     'Content-Type': 'text/xml;charset=UTF-8',
  //     soapAction: 'urn:ct/ctPortType/PrCtAgentsRequest',
  //   };

  const xml = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ct">
  <soapenv:Header/>
  <soapenv:Body>
     <urn:PrCtGetStatisticTlv>
        <!--Optional:-->
        <urn:PrCtGetStatisticTlvReq>
           <urn:ObjectType>1</urn:ObjectType>
           <urn:listID>${id}</urn:listID>
        </urn:PrCtGetStatisticTlvReq>
     </urn:PrCtGetStatisticTlv>
  </soapenv:Body>
</soapenv:Envelope>`;

  const { data } = await axios.post(
    'http://10.145.32.3:15358/ct?wsdl',
    xml,
    // { headers: sampleHeaders },
  );

  const convertedData = await parseStringPromise(data);

  if (
    !convertedData['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0][
      'ct:PrCtGetStatisticTlvResp'
    ][0]['ct:listStatistic'][0]
  ) {
    // console.log(id ,'nullllllll');

    return {
      LastLoginTime: 'not login',
      FulDuration: '00:00:00',
      PauseDuration: '00:00:00',
    };
  } else {
    const LastLoginTime: string = await convertedData['SOAP-ENV:Envelope'][
      'SOAP-ENV:Body'
    ][0]['ct:PrCtGetStatisticTlvResp'][0]['ct:listStatistic'][0][
      'ct:TmCtStatisticTlv'
    ][0]['ct:listValue'][0]['ct:TmStatDataValueTlv'][11]['ct:strValue'][0];
    const FulDuration: string = await convertedData['SOAP-ENV:Envelope'][
      'SOAP-ENV:Body'
    ][0]['ct:PrCtGetStatisticTlvResp'][0]['ct:listStatistic'][0][
      'ct:TmCtStatisticTlv'
    ][0]['ct:listValue'][0]['ct:TmStatDataValueTlv'][12]['ct:strValue'][0];
    const PauseDuration: string = await convertedData['SOAP-ENV:Envelope'][
      'SOAP-ENV:Body'
    ][0]['ct:PrCtGetStatisticTlvResp'][0]['ct:listStatistic'][0][
      'ct:TmCtStatisticTlv'
    ][0]['ct:listValue'][0]['ct:TmStatDataValueTlv'][17]['ct:strValue'][0];

    return {
      LastLoginTime,
      FulDuration,
      PauseDuration,
    };
  }
};

export const fetchGetagentStatistic1 = async (agentId: number) => {
  try {
    const today = new Date();
    console.log(today);
    
    // const startDate = today.toISOString().split('T')[0];

    // API so'rovi
    const response = await axios.get(
      `http://10.145.32.3:9090/agent?agentId=${agentId}&lastSeconds=43200`,
    );
    console.log(response , agentId , response.data , 'responce agent');
    const data = response.data;

    if (data.result !== 'success') {
      return {
        LastLoginDate: 'not login',
        LastLoginTime: 'not login',
        FulDuration: '00:00:00',
        PauseDuration: '00:00:00',
      };
    }

    const { loginTime, duration } = data;

    // await DataEntity.createQueryBuilder()
    //   .insert()
    //   .into(DataEntity)
    //   .values({
    //     dataSaup: response.data,
    //     id_agent: agentId.toString(),
    //     lastLoginTime: loginTime,
    //     FulDuration: duration,
    //   })
    //   .execute()
    //   .catch((e) => {
    //     console.log(e.message);
    //   });
    const LastLoginDate = loginTime ? extractDate(loginTime) : 'not login';
    const LastLoginTime = loginTime ? extractTime(loginTime) : 'not login';
    const FulDuration = duration?.fullDuration
      ? convertSecondsToTime(duration.fullDuration)
      : '00:00:00';
    const PauseDuration = duration?.pauseDuration
      ? convertSecondsToTime(duration.pauseDuration)
      : '00:00:00';

    return {
      LastLoginDate,
      LastLoginTime,
      FulDuration,
      PauseDuration,
    };
  } catch (error) {
    console.error('Error fetching agent statistics:', error.message);
    return {
      LastLoginDate: 'error',
      LastLoginTime: 'error',
      FulDuration: 'error',
      PauseDuration: 'error',
    };
  }
};

// Helper function to extract date from loginTime (YYYY-MM-DD format)
const extractDate = (loginTime: string): string => {
  console.log(loginTime, loginTime.split(' ') , 'data');
  
  return loginTime.split(' ')[0]; // Splits at the space and returns the date part
};

// Helper function to extract time from loginTime (HH:mm:ss format)
const extractTime = (loginTime: string): string => {
  
  const date = new Date(loginTime);
  console.log(loginTime, date.toISOString().substring(11, 19));
  return date.toISOString().substring(11, 19);  // Splits at the space and returns the time part
};

// Helper function to convert seconds to HH:mm:ss format
const convertSecondsToTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(
    2,
    '0',
  )}:${String(secs).padStart(2, '0')}`;
};

function waitFor5Seconds() {
  return new Promise((resolve) => {
    setTimeout(resolve, 5000); // 5,000 millisekund (5 soniya) kutamiz
  });
}
