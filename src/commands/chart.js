const bot = require('../telegram');
const puppeteer = require('puppeteer');

const charUrl = 'https://www.tradingview.com/chart/?symbol=NVIDIA%2FUSD';

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

bot.onText(/^\/chart/, async (msg) => {
  if (msg?.chat?.type === 'private') return;
  let loadingMsg;
  const browser = await puppeteer.launch({
    args: ['--no-sandbox'],
  });
  const context = browser.defaultBrowserContext();
  await context.overridePermissions(
    'https://www.tradingview.com/chart/?symbol=NVIDIA%2FUSD',
    ['clipboard-read']
  );
  try {
    loadingMsg = await bot.sendAnimation(
      msg?.chat?.id,
      'https://t.me/regex_ulala_ulala_regex_404/8',
      { message_thread_id: msg?.message_thread_id }
    );
    const page = await browser.newPage();

    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
    await page.goto(charUrl, { timeout: 0, waitUntil: 'networkidle2' });
    await page.waitForSelector("[data-tooltip='Take a snapshot']");
    const takeSnapshotBtn = (
      await page.$$("[data-tooltip='Take a snapshot']")
    )[2];

    await takeSnapshotBtn?.click();

    await page.waitForSelector('[data-name="copy-link-to-the-chart-image"]');
    const copyLinkBtn = await page.$(
      '[data-name="copy-link-to-the-chart-image"]'
    );
    await copyLinkBtn?.click();
    // await page.waitForSelector('[data-role="toast-container"] + div')

    await delay(100);
    const pages = await browser.pages();
    const popup = pages[pages.length - 1];
    await popup.waitForSelector('img');
    const chartImageUrl = await popup.$eval('img', (img) => img.src);

    // ! save image to local
    const chartImage = await popup.$('img');
    // ! wait for image to load
    await chartImage?.evaluate((img) => {
      return new Promise((resolve) => {
        img.onload = resolve;
      });
    });

    await bot.sendPhoto(msg.chat.id, chartImageUrl, {
      message_thread_id: msg?.message_thread_id,
    });
  } catch (error) {
    console.log('error', error?.toString());
  } finally {
    await browser.close();
    loadingMsg &&
      (await bot.deleteMessage(msg.chat.id, loadingMsg?.message_id));
  }
});
