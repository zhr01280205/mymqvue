

import {
  connect
} from "../../utils/mqttjs3/mqtt";

const hefengKey = "8651680f246e47d2b4d665a4aad5253b"; //  和风天气Web api的key
/*************************************/
const mqttHost = "mqtt.mqttsslzhr.xyz"; //mqtt 服务器域名/IP
const mqttPort = 8084; //mqtt 服务器域名/IP端口

const hefengVIP = false; //  和风天气是免费的api（false）还是付费api（true）

const deviceSubTopic = "/mysmarthome/sub"; //  设备订阅topic（小程序发布命令topic）
const devicePubTopic = "/mysmarthome/pub"; //  设备发布topic（小程序订阅数据topic）



const mpSubTopic = devicePubTopic;
const mpPubTopic = deviceSubTopic;

const mqttUrl = `wxs://${mqttHost}:${mqttPort}/mqtt`; //  mqtt连接路径

const hefengApi = "https://api.qweather.com/v7"; 
const hefengFreeApi = "https://devapi.qweather.com/v7"; //  和风天气免费API前缀

const hefengWeather = `${hefengVIP ? hefengApi : hefengFreeApi}/weather/now?`; //  和风天气实时天气api
const hefengAir = `${hefengVIP ? hefengApi : hefengFreeApi}/air/now?`; //  和风天气空气质量api

const geoApi = "https://geoapi.qweather.com/v2/city/lookup?" //  地理位置api（用来获取经纬度对应的城市/城区名字）

const app = getApp()

Page({
  data: {
    client: {},
    Temp: 0,
    Hum: 0,
    Light: 0,
    Led: false,
    Beep: false,
    area: "请求中", //城区
    city: "请求中", //城市
    airText: "请求中", //空气优良
    airValue: 0, //空气指数
    weather: "请求中", //天气
    weatherAdvice: "今天天气不错", //天气建议
  },
  onLedChange(event) {
    var that = this;
    console.log(event.detail);
    let sw = event.detail.value;
    that.setData({
      Led:sw
    })
    if (sw) {
      that.data.client.publish(mpPubTopic, '{"target":"LED","value":1}', function (err) {
        if (!err) {
          console.log("成功下发命令——开灯");
        }
      });
    } else {
      that.data.client.publish(mpPubTopic, '{"target":"LED","value":0}', function (err) {
        if (!err) {
          console.log("成功下发命令——关灯");
        }
      });
    }
  },
  onBeepChange(event) {
    var that = this;
    console.log(event.detail);
    let sw = event.detail.value;
    that.setData({
      Beep:sw
    })
    if (sw) {
      that.data.client.publish(mpPubTopic, '{"target":"BEEP","value":1}', function (err) {
        if (!err) {
          console.log("成功下发命令——打开报警器");
        }
      });
    } else {
      that.data.client.publish(mpPubTopic,'{"target":"BEEP","value":0}', function (err) {
        if (!err) {
          console.log("成功下发命令——关闭报警器");
        }
      });
    }
  },
  onShow() {
    var that = this;
    that.setData({
      client:connect(mqttUrl)
    })

    that.data.client.on("connect", function () {
      console.log("成功连接mqtt服务器！");
      that.data.client.subscribe(mpSubTopic, function (err) {
        if (!err) {
          console.log("成功订阅设备上行数据Topic!");
        }
      });
    });
    that.data.client.on("message", function (topic, message) {
      console.log(topic);
      // message是16进制的Buffer字节流
      let dataFromDev = {};
      // 尝试进行JSON解析
      try {
        dataFromDev = JSON.parse(message);
        console.log(dataFromDev);
        that.setData({
          Temp: dataFromDev.Temp,
          Hum: dataFromDev.Hum,
          Light: dataFromDev.Light,
          Led: dataFromDev.Led,
          Beep: dataFromDev.Beep
        })
      } catch (error) {
        // 解析失败错误捕获并打印（错误捕获之后不会影响程序继续运行）
        console.log(error);
      }
    })

    // 获取天气相关数据
    wx.getLocation({
      type: "wgs84",
      success(res) {
        const latitude = res.latitude;
        const longitude = res.longitude;
        const key = hefengKey;
        wx.request({
          url: `${geoApi}location=${longitude},${latitude}&key=${key}`, //获取地理位置
          success(res) {
            console.log(res.data);
            const {
              location
            } = res.data;
            that.setData({
              area: location[0].name, //城区
              city: location[0].adm2 //城市
            })
          },
        });
        wx.request({
          url: `${hefengWeather}location=${longitude},${latitude}&key=${key}`, //获取实时天气数据
          success(res) {
            console.log(res.data);
            const {
              now
            } = res.data;
            that.setData({
              weather: now.text, // 天气
            })
          },
        });
        wx.request({
          url: `${hefengAir}location=${longitude},${latitude}&key=${key}`, //获取空气数据
          success(res) {
            console.log(res.data);
            const {
              now
            } = res.data;
            that.setData({
              airText: now.category, //空气质量
              airValue: now.aqi //空气指数
            })
          },
        });
      },
    });
  }
})