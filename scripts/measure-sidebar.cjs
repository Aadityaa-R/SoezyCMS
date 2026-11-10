const http = require('http');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

async function measure() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = cp.spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-extensions',
    '--disable-gpu',
    '--no-sandbox',
    'about:blank',
  ]);

  await new Promise((r) => setTimeout(r, 1000));
  const wsUrl = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const list = JSON.parse(data);
        const page = list.find((item) => item.type === 'page');
        resolve(page.webSocketDebuggerUrl);
      });
    }).on('error', reject);
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve));

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', { url: 'http://localhost:3000/?role=platform_super_admin' });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const res = await send('Runtime.evaluate', {
      expression: 'document.body ? document.body.innerText : ""',
      returnByValue: true,
    });
    if (res.result.value && !res.result.value.includes('Loading') && res.result.value.includes('Organisation overview')) {
      break;
    }
  }

  // Focus the first button with keyboard emulation
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('#sidebar-navigation nav button');
      if (btn) {
        btn.focus({ focusVisible: true });
        // dispatch keydown tab to activate :focus-visible
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      }
    })()`,
  });
  await new Promise((r) => setTimeout(r, 300));

  // Capture screenshot of collapsed sidebar with focus
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const outDir = 'C:\\Users\\raadi\\.gemini\\antigravity\\brain\\ccc8bfe1-139a-4a59-bec0-4337717b2c77';
  fs.writeFileSync(path.join(outDir, 'superadmin-sidebar-rail-aligned.png'), Buffer.from(data, 'base64'));
  fs.writeFileSync(
    path.join(__dirname, '..', 'docs', 'superadmin-theme', 'superadmin-desktop-collapsed.png'),
    Buffer.from(data, 'base64')
  );
  fs.writeFileSync(
    path.join(outDir, 'superadmin-desktop-collapsed.png'),
    Buffer.from(data, 'base64')
  );
  console.log('Saved updated collapsed screenshot with aligned rail buttons!');

  ws.close();
  chromeProc.kill();
}
measure().catch(console.error);
