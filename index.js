const request = require("request");
const fs = require("fs");
const crc32 = require("buffer-crc32");
const randomStr = require("simple-rand-str");

const accessKey = "cfc067bb39feff592af82085b42e6dc3";
const uploadToken =
  "HMAC-SHA1:1.0:1585654920:cfc067bb39feff592af82085b42e6dc3:CLSjPp3GqB6dE7t9XHWuWEdEujs=";
const BUFFER_SIZE = 2 * 1024 * 1024;

// const uploadParams =
const getToken = () => {
  return new Promise(resolve => {
    request(
      {
        url:
          "https://mp.toutiao.com/xigua/api/upload/getAuthKey/?params=%7B%22type%22%3A%22video%22%2C%22column%22%3Afalse%7D",
        headers: {
          Cookie: `sso_uid_tt_ss=0ee6c6db702745747a2c3be473c100dc; toutiao_sso_user_ss=6cccc3ae3dcfcf8b09841c42df0ee6fe; sid_guard=2fdeeec5037801bd78a093ab2ae49012%7C1585626399%7C5184000%7CSat%2C+30-May-2020+03%3A46%3A39+GMT; uid_tt=635f87de242e80eb6f56e61ffafb936a; uid_tt_ss=635f87de242e80eb6f56e61ffafb936a; sid_tt=2fdeeec5037801bd78a093ab2ae49012; sessionid=2fdeeec5037801bd78a093ab2ae49012; sessionid_ss=2fdeeec5037801bd78a093ab2ae49012; s_v_web_id=k8fd0pjv_MvEH7UbA_cgtD_4NSp_9qRn_vJTfLfEwPPa9; gftoken=MmZkZWVlYzUwM3wxNTg1NjI4MjYzNjB8fDAGBgYGBgY; SLARDAR_WEB_ID=b8a3ffa1-1be1-4e0f-9480-373667fcb1a9; _ga=GA1.2.727463626.1585635807; _gid=GA1.2.752510781.1585635807; UM_distinctid=1712f4251a3111-0336ab177af716-396a7f06-1fa400-1712f4251a47c8; tt_webid=6810253886864573959`
        }
      },
      (error, response, body) => {
        console.error("error:", error); // Print the error if one occurred
        console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
        const result = JSON.parse(body);

        if (!result.data) {
          console.log("获取token失败");
          process.exit(1);
        }
        resolve(result);
      }
    );
  });
};

const getUploadParams = fileSize => {
  return new Promise(resolve => {
    request(
      {
        url: `https://vas-lf-x.snssdk.com/video/openapi/v1/?action=GetVideoUploadParams&s=${randomStr.generate(
          11
        )}&use_edge_node=1&file_size=${fileSize}`,
        headers: {
          authorization: uploadToken,
          "x-tt-access": accessKey
        }
      },
      (error, response, body) => {
        console.log("body: ", body);
        const result = JSON.parse(body);

        if (!result.data) {
          console.log("获取上传参数失败");
          process.exit(2);
        }
        resolve(result);
      }
    );
  });
};

const convertFileToBuffers = name => {
  return new Promise(resolve => {
    fs.readFile(name, (err, data) => {
      if (data.length < BUFFER_SIZE) {
        console.log("上传文件不小于2MB");
        process.exit(3);
      }

      const maxCount = Math.ceil(data.length / BUFFER_SIZE);

      const buffers = [];

      for (var i = 0; i < maxCount; i++) {
        buffers.push(data.slice(i * BUFFER_SIZE, (i + 1) * BUFFER_SIZE));
      }

      resolve(buffers);
    });
  });
};

const getFileInfo = name => {
  return new Promise(resolve => {
    fs.stat(name, function(err, stats) {
      resolve(stats);
    });
  });
};

const getUploadId = (tosHost, oid, tosSign) => {
  return new Promise(resolve => {
    request.post(
      {
        url: `https://${tosHost}/${oid}?uploads`,
        headers: {
          Authorization: tosSign
        }
      },
      (error, response, body) => {
        const result = JSON.parse(body);

        if (!result.payload) {
          console.log("获取UploadId失败");
          process.exit(2);
        }
        resolve(result);
      }
    );
  });
};

const uploadBlock = () => {
  request.post({
    url: ""
  });
};

const main = async () => {
  const fileInfo = await getFileInfo("switch.mp4");
  const buffers = await convertFileToBuffers("switch.mp4");
  console.log(
    "buffers: ",
    buffers.map(buffer => buffer.length)
  );

  console.log(
    "crc-32:",
    buffers.map(buffer => crc32.unsigned(buffer).toString(16))
  );

  // const token = await getToken();
  // const params = await getUploadParams(fileInfo.size);
  // var params = `{"code":2000,"message":"ok","data":{"vid":"v02004e20000bq1ees7l54d8pnfnkpcg","oid":"tos-cn-v-0000/c747f530cce14178bbf91a239f1302cc","tos_host":"tos-lf-x.snssdk.com","tos_up_hosts":[],"tos_headers":{},"tos_sign":"BLZ40F8TCN3JNCL5MVY5:ZCA_kT_K9o89glZOzjAf9ziqmsJO2VI3YOBz9CL8yFQ=:ZGVhZGxpbmU6IDE1ODU3MjM2MzI=:Yzc0N2Y1MzBjY2UxNDE3OGJiZjkxYTIzOWYxMzAyY2M=","token":"eyJob3N0IjoidG9zLWxmLXguc25zc2RrLmNvbSIsIm5vbmNlIjoiUmpuaGZhdHkiLCJ1cGxvYWRfc2lnbiI6IkJMWjQwRjhUQ04zSk5DTDVNVlk1OlpDQV9rVF9LOW84OWdsWk96akFmOXppcW1zSk8yVkkzWU9CejlDTDh5RlE9OlpHVmhaR3hwYm1VNklERTFPRFUzTWpNMk16ST06WXpjME4yWTFNekJqWTJVeE5ERTNPR0ppWmpreFlUSXpPV1l4TXpBeVkyTT0ifQ==:e6cfe7a2fa4878d85f2fe46c56c846e01b07c7aae2c96b4f43f032c3dc95f96a","extra_param":"vidc=lf\u0026vts=1585637232802733807\u0026host=tos-lf-x.snssdk.com\u0026region=CN\u0026province=31\u0026edge_node=lf\u0026upload_mode=serial\u0026file_size=917394.000000\u0026strategy=idc_filter\u0026user_ip=114.86.88.205","bucket":"tos-cn-v-0000","access_key":"BLZ40F8TCN3JNCL5MVY5","dns_info":null,"upload_mode":"serial","edge_nodes":[{"vid":"v02004e20000bq1ees7l54d8pnfnkpcg","oid":"tos-cn-v-0000/570155ef01a24fe2b55ddbd527246a35","tos_host":"tos-hl-x.snssdk.com","tos_up_hosts":[],"tos_headers":{},"tos_sign":"BLZ40F8TCN3JNCL5MVY5:BWOmo-kmXeN_qF8yKAwBDfgg9TImy5_yG-NJHqwby2Y=:ZGVhZGxpbmU6IDE1ODU3MjM2MzI=:NTcwMTU1ZWYwMWEyNGZlMmI1NWRkYmQ1MjcyNDZhMzU=","token":"eyJob3N0IjoidG9zLWhsLXguc25zc2RrLmNvbSIsIm5vbmNlIjoieGhBRHRQRlIiLCJ1cGxvYWRfc2lnbiI6IkJMWjQwRjhUQ04zSk5DTDVNVlk1OkJXT21vLWttWGVOX3FGOHlLQXdCRGZnZzlUSW15NV95Ry1OSkhxd2J5Mlk9OlpHVmhaR3hwYm1VNklERTFPRFUzTWpNMk16ST06TlRjd01UVTFaV1l3TVdFeU5HWmxNbUkxTldSa1ltUTFNamN5TkRaaE16VT0ifQ==:30c24cd760cf70328e101a9249ef8efdb56656437bab3422d6b1a3958200c4ec","extra_param":"vidc=lf\u0026vts=1585637232802733807\u0026host=tos-hl-x.snssdk.com\u0026region=CN\u0026province=31\u0026edge_node=hl\u0026upload_mode=serial\u0026file_size=917394.000000\u0026strategy=long_memory_filter_v2\u0026user_ip=114.86.88.205","bucket":"tos-cn-v-0000","access_key":"BLZ40F8TCN3JNCL5MVY5","dns_info":null,"upload_mode":"serial"}],"delay_upload":0,"trace_id":"2e174636-25d6-488f-9098-47b4dfd659f9","upload_id":"74b2567af0614ef7bac965119b74df4e"}}`;

  // console.log("params: ", params);
  // console.log("edge_nodes: ", params.data.edge_nodes);
  const edge_nodes = [
    {
      vid: "v02004880000bq1hf5qepr109a254k5g",
      oid: "tos-cn-v-0000c001/294ce781d9c245f18b773fa4aa91112b",
      tos_host: "tos-nc2-slb1.bytecdn.cn",
      tos_up_hosts: [],
      tos_headers: {},
      tos_sign:
        "DT2GDTBW6QYYT95M50B1:hyd0xErSzkOvruAqafSnX2GrPr59CXTr37X6KsOuSq8=:ZGVhZGxpbmU6IDE1ODU3MzU5NTk=:Mjk0Y2U3ODFkOWMyNDVmMThiNzczZmE0YWE5MTExMmI=",
      token:
        "eyJob3N0IjoidG9zLW5jMi1zbGIxLmJ5dGVjZG4uY24iLCJub25jZSI6ImlMV2dqUEFWIiwidXBsb2FkX3NpZ24iOiJEVDJHRFRCVzZRWVlUOTVNNTBCMTpoeWQweEVyU3prT3ZydUFxYWZTblgyR3JQcjU5Q1hUcjM3WDZLc091U3E4PTpaR1ZoWkd4cGJtVTZJREUxT0RVM016VTVOVGs9Ok1qazBZMlUzT0RGa09XTXlORFZtTVRoaU56Y3pabUUwWVdFNU1URXhNbUk9In0=:cc38057ceb64d89505466d2f7b9462d154ef3d78d1f07b1290d0b60d5ec99357",
      extra_param:
        "vidc=lf&vts=1585649559835574552&host=tos-nc2-slb1.bytecdn.cn&region=CN&province=31&edge_node=lf&upload_mode=serial&file_size=5041902.000000&strategy=long_memory_filter_v2&user_ip=114.86.88.205",
      bucket: "tos-cn-v-0000c001",
      access_key: "DT2GDTBW6QYYT95M50B1",
      dns_info: null,
      upload_mode: "serial"
    }
  ];

  // const uploadIdReponse = await getUploadId(
  //   edge_nodes[0].tos_host,
  //   edge_nodes[0].oid,
  //   edge_nodes[0].tos_sign
  // );
  // const uploadId = uploadIdReponse.payload.uploadID;
  const uploadId = "dfa28136-88b5-457e-b895-62fd75472e38";
  console.log("uploadId: ", uploadId);
};

main();
