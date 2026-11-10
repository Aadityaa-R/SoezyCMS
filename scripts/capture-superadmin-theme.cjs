const http = require('http');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

async function waitForHttp(url, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve(true);
          else resolve(false);
        });
        req.on('error', () => resolve(false));
      });
      if (ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Timeout waiting for ' + url);
}

async function getPageWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const list = JSON.parse(data);
        const page = list.find((item) => item.type === 'page');
        if (!page) {
          return reject(new Error('No page target found'));
        }
        resolve(page.webSocketDebuggerUrl);
      });
    }).on('error', reject);
  });
}

function sendCommand(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression) {
  const res = await sendCommand(ws, 'Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return res.result?.value;
}

async function waitForApp(ws) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const text = await evaluate(ws, 'document.body ? document.body.innerText : ""');
      if (text && !text.includes('Loading') && text.includes('Organisation overview')) {
        console.log('App ready after', (i + 1) * 0.5, 's');
        await new Promise((r) => setTimeout(r, 600));
        return true;
      }
    } catch {}
  }
  throw new Error('Timed out waiting for app to load');
}

async function captureScreen(ws, outDirs, fileName) {
  const { data } = await sendCommand(ws, 'Page.captureScreenshot', { format: 'png' });
  const buffer = Buffer.from(data, 'base64');
  for (const outDir of outDirs) {
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const filePath = path.join(outDir, fileName);
    fs.writeFileSync(filePath, buffer);
    console.log('Saved:', filePath, '(' + buffer.length + ' bytes)');
  }
}

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const repoDocsDir = path.join(__dirname, '..', 'docs', 'superadmin-theme');
  const artifactDir = 'C:\\Users\\raadi\\.gemini\\antigravity\\brain\\ccc8bfe1-139a-4a59-bec0-4337717b2c77';
  const outDirs = [repoDocsDir, artifactDir];

  console.log('Starting Chrome headless with disable-extensions...');
  const chromeProc = cp.spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-extensions',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  try {
    await waitForHttp('http://127.0.0.1:9222/json/version');
    const wsUrl = await getPageWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));

    await sendCommand(ws, 'Page.enable');
    await sendCommand(ws, 'Runtime.enable');

    // 1. Desktop 1440x900 - Initial state is collapsed sidebar
    console.log('Setting desktop viewport (1440x900)...');
    await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to http://localhost:3000/?role=platform_super_admin ...');
    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?role=platform_super_admin' });
    await waitForApp(ws);

    console.log('Capturing Desktop Collapsed...');
    await captureScreen(ws, outDirs, 'superadmin-desktop-collapsed.png');

    // 2. Expand Sidebar on Desktop
    console.log('Expanding sidebar on desktop...');
    const expandClicked = await evaluate(ws, `
      (() => {
        const btn = document.querySelector('button[title*="Expand sidebar"], button[aria-label*="Expand sidebar"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Expand toggle clicked:', expandClicked);
    await new Promise((r) => setTimeout(r, 600));

    console.log('Capturing Desktop Expanded...');
    await captureScreen(ws, outDirs, 'superadmin-desktop-expanded.png');

    // 3. Open profile menu to test contrast and dropdown
    console.log('Opening profile menu...');
    await evaluate(ws, `
      (() => {
        const profileBtn = document.querySelector('button[aria-haspopup="menu"]');
        if (profileBtn) profileBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));
    console.log('Capturing Desktop with Profile Menu open...');
    await captureScreen(ws, outDirs, 'superadmin-profile-menu-open.png');

    // 4. Mobile 375x812 - Drawer closed
    console.log('Setting mobile viewport (375x812)...');
    await sendCommand(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true,
    });
    // Refresh to get clean mobile state
    await sendCommand(ws, 'Page.navigate', { url: 'http://localhost:3000/?role=platform_super_admin' });
    await waitForApp(ws);

    console.log('Capturing Mobile Drawer Closed...');
    await captureScreen(ws, outDirs, 'superadmin-mobile-closed.png');

    // 5. Open mobile drawer
    console.log('Opening mobile drawer...');
    const openMobileClicked = await evaluate(ws, `
      (() => {
        const btn = document.querySelector('button[title*="Expand sidebar"], button[title*="Collapse sidebar"], button[title*="menu"], button[aria-label*="sidebar"], button[aria-label*="menu"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log('Mobile menu button clicked:', openMobileClicked);
    await new Promise((r) => setTimeout(r, 600));

    console.log('Capturing Mobile Drawer Open...');
    await captureScreen(ws, outDirs, 'superadmin-mobile-drawer-open.png');

    ws.close();
    console.log('Done capturing screenshots!');
  } finally {
    try {
      chromeProc.kill();
    } catch {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
