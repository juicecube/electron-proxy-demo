const {app, BrowserWindow, session} = require('electron');
const {resolveHostname, getHostnameFromIp} = require('./hostname-resolver');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;
const webContentsOriginMap = {};

function initProxySession() {
  const ses = session.fromPartition('persist:proxy');

  ses.webRequest.onBeforeRequest(async (details, callback) => {
    try {
      const url = new URL(details.url);
      const hostname = await resolveHostname(url.hostname);
      webContentsOriginMap[details.webContentsId] = webContentsOriginMap[details.webContentsId] || new URL(details.referrer).origin;
      if (hostname === url.hostname) {
        callback({});
      } else {
        url.hostname = hostname;
        callback({
          redirectURL: url.href
        });
      }
    } catch (err) {
      callback({});
    }
  });

  ses.webRequest.onBeforeSendHeaders(async (details, callback) => {
    const url = new URL(details.url);
    if ((/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(url.hostname)) {
      const requestHeaders = details.requestHeaders;
      requestHeaders.Host = getHostnameFromIp(url.hostname) || requestHeaders.Host;
      requestHeaders.Origin = webContentsOriginMap[details.webContentsId];
      callback({
        requestHeaders: requestHeaders
      });
    } else {
      callback(-3);
    }
  });

  ses.setCertificateVerifyProc((req, callback) => {
    if ((/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/).test(req.hostname)) {
      callback(0);
    } else {
      callback(-3);
    }
  });
}

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    width: 370,
    height: 680,
    webPreferences: {
      partition: 'persist:proxy',
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  win.loadURL('http://127.0.0.1:5000/');

  // Open the DevTools.
  // win.webContents.openDevTools();

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', function () {
  initProxySession();
  createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow();
  }
});

process.on('uncaughtException', function (err) {
  console.log(err);
});
