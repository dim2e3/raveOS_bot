// Parse Status rig
export function parseStatus(serverResponse) {
  //console.log(serverResponse.error.error_code);
  if (!serverResponse?.error?.error_code) {

    const rigStatus = {
    id: serverResponse.id,
    name: serverResponse.name,
    online_status: serverResponse.online_status,
    mb_info: serverResponse.sys_info.mb_info.mb_name,
    cpu_info: serverResponse.sys_info.cpu_info.name,
    boot_time: serverResponse.sys_info.boot_time,
    coin_name: serverResponse.mining_info[0].coin_name,
    pool_id: serverResponse.mining_info[0].pool_id,
    power: [],
    temp: [],
    hashrate: [],
    fan_percent: [],
    fan_rpm: [],
    video: [],
  };
  const mpu_list = serverResponse.mpu_list.forEach((videocard) => {
    rigStatus.temp = [...rigStatus.temp, videocard.temp];
    rigStatus.hashrate = [...rigStatus.hashrate, videocard.hashrate];
    rigStatus.fan_percent = [...rigStatus.fan_percent, videocard.fan_percent];
    rigStatus.fan_rpm = [...rigStatus.fan_rpm, videocard.fan_rpm];
    rigStatus.power = [...rigStatus.power, videocard.power];
    rigStatus.video = [...rigStatus.video, videocard.name];
  });
return rigStatus;
  } else {

    const rigStatus = {
      id: "Unknown",
      name: "Unknown",
      online_status: "Unknown",
      mb_info: "Unknown",
      cpu_info: "Unknown",
      boot_time: "Unknown",
      coin_name: "Unknown",
      pool_id: 'Unknown',
      power: [],
      temp: [],
      hashrate: [],
      fan_percent: [],
      fan_rpm: [],
      video: [],
    };
    return rigStatus;
  }
}
// Calculate rig's upTime
export function upTime(sec) {
  const day = Math.trunc(sec / 86400);
  const hour = Math.trunc((sec % 86400) / 3600);
  const min = Math.trunc((sec - day * 86400 - hour * 3600) / 60);
  return `${day}d:${hour}h:${min}m`;
}
// Set Bold font for temperature
export function boldTemp(array, number) {
  return `${array.map((item) => {
    if (item > number) {
      return `<b>${item}</b>`;
    } else {
      return `<i>${item}</i>`;
    }
  })}`;
}
// Set Bold font for fan percentage
export function boldFan(array, number) {
  return `${array.map((item) => {
    if (item < number) {
      return `<b>${item}</b>`;
    } else {
      return `<i>${item}</i>`;
    }
  })}`;
}
