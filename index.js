const request = require("request");
const fs = require("fs");
const crc32 = require("buffer-crc32");
const randomStr = require("simple-rand-str");

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

const getUploadParams = (fileSize, uploadToken, accessKey) => {
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

const getUploadId = (url, tosSign) => {
  return new Promise(resolve => {
    request.post(
      {
        url: `https://${url}?uploads`,
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

const uploadBlock = (url, index, uploadId, tosSign, block) => {
  return new Promise(resolve => {
    const requestUrl = `https://${url}?partNumber=${index +
      1}&uploadID=${uploadId}`;

    request.put(
      {
        url: requestUrl,
        headers: {
          Authorization: tosSign,
          "Content-CRC32": crc32
            .unsigned(block)
            .toString(16)
            .padStart(8, "0")
        },
        body: block
      },
      (error, response, body) => {
        const result = JSON.parse(body);
        resolve(result);

        console.log(
          `上传block${index + 1} url = ${requestUrl}, crc32 = ${crc32
            .unsigned(block)
            .toString(16)
            .padStart(8, "0")}成功`
        );
      }
    );
  });
};

const confirmAllBlocks = (url, buffers, uploadId, tosSign) => {
  return new Promise(resolve => {
    const body = buffers
      .map(
        (buffer, index) =>
          `${index + 1}:${crc32
            .unsigned(buffer)
            .toString(16)
            .padStart(8, "0")}`
      )
      .join(",");
    console.log("body: ", body);
    request.post(
      {
        url: `https://${url}?uploadID=${uploadId}`,
        headers: {
          Authorization: tosSign
        },
        body
      },
      (error, response, body) => {
        console.log("error: ", error, "body: ", body);
        const result = JSON.parse(body);

        if (!result.payload) {
          console.log("校验所有分片失败");
          process.exit(2);
        }
        resolve(result);
      }
    );
  });
};

const updateVideoInfo = (edgeInfo, fileSize, uploadToken, accessKey) => {
  return new Promise(resolve => {
    request.post(
      {
        url: `https://vas-lf-x.snssdk.com/video/openapi/v1/?action=UpdateVideoUploadInfos&vidc=lf&vts=1585641839017020497&host=${edgeInfo.tos_host}&region=CN&province=31&edge_node=lf&upload_mode=serial&file_size=${fileSize}&strategy=long_memory_filter_v2&user_ip=114.86.88.205`,
        headers: {
          authorization: uploadToken,
          "x-tt-access": accessKey
        },
        json: {
          vid: edgeInfo.vid,
          oid: edgeInfo.oid,
          token: edgeInfo.token,
          poster_ss: 0,
          is_exact_poster: false,
          user_reference: ""
        }
      },
      (error, response, body) => {
        console.log("error: ", error, "body: ", body);

        if (!body.data) {
          console.log("更新视频信息错误");
          process.exit(2);
        }
        resolve(body);
      }
    );
  });
};
const main = async () => {
  if (process.argv.length < 3) {
    console.log("node index.js [filename]");
    return;
  }

  const filename = process.argv[2];

  const fileInfo = await getFileInfo(filename);
  const buffers = await convertFileToBuffers(filename);
  console.log(
    "buffers: ",
    buffers.map(buffer => buffer.length)
  );

  console.log(
    "crc-32:",
    buffers.map(buffer =>
      crc32
        .unsigned(buffer)
        .toString(16)
        .padStart(8, "0")
    )
  );

  const token = await getToken();
  const { accessKey, uploadToken } = token.data;
  const params = await getUploadParams(fileInfo.size, uploadToken, accessKey);

  console.log("edge_nodes: ", params.data.edge_nodes);
  const edge_nodes = params.data.edge_nodes;

  const uploadIdReponse = await getUploadId(
    `${edge_nodes[0].tos_host}/${edge_nodes[0].oid}`,
    edge_nodes[0].tos_sign
  );
  const uploadId = uploadIdReponse.payload.uploadID;
  console.log("uploadId: ", uploadId);

  for (let i = 0; i < buffers.length; i++) {
    await uploadBlock(
      `${edge_nodes[0].tos_host}/${edge_nodes[0].oid}`,
      i,
      uploadId,
      edge_nodes[0].tos_sign,
      buffers[i]
    );
  }
  await confirmAllBlocks(
    `${edge_nodes[0].tos_host}/${edge_nodes[0].oid}`,
    buffers,
    uploadId,
    edge_nodes[0].tos_sign
  );
  const videoInfo = await updateVideoInfo(
    edge_nodes[0],
    fileInfo.size,
    uploadToken,
    accessKey
  );
  console.log(
    "上传成功 链接：",
    `https://p3.pstatp.com/origin/${videoInfo.data.video.oid}`
  );
};

main();
