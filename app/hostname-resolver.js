const {net} = require('electron');

const promiseMap = {};

exports.resolveHostname = function (hostname) {
  if (!promiseMap[hostname]) {
    promiseMap[hostname] = new Promise(function (resolve, reject) {
      // this is a simple whitelist test, use a practical whitelist solution in production
      if (!(/\.codemao\.cn$/).test(hostname)) {
        resolve(hostname);
        return;
      }
      let resolved = false;
      const req = net.request({
        url: 'http://' + hostname,
        method: 'GET'
      });
      req.on('redirect', function () {
        resolve(hostname);
        resolved = true;
      });
      req.on('response', function () {
        resolve(hostname);
        resolved = true;
      });
      req.on('close', function () {
        if (!resolved) {
          const dnsReq = net.request('http://203.107.1.33/100000/d?host=' + hostname);
          dnsReq.on('response', function (res) {
            const chunk = [];
            let size = 0;
            res.on('data', function (data) {
              chunk.push(data);
              size += data.length;
            });
            res.on('end', function () {
              try {
                const data = JSON.parse(Buffer.concat(chunk, size).toString());
                if (data.ips[0]) {
                  resolve(data.ips[0]);
                } else {
                  resolve(hostname);
                }
              } catch (err) {
                promiseMap[hostname] = null;
                resolve(hostname);
              }
            });
            res.on('error', function () {
              promiseMap[hostname] = null;
              resolve(hostname);
            });
          });
          dnsReq.end();
        }
      });
      req.end();
    });
  }
  return promiseMap[hostname];
};
