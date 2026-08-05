import puppeteer from 'puppeteer';

(async () => {
  const targetUrl = process.env.TEST_URL || 'https://localhost:5173';
  const browser = await puppeteer.launch({
    args: ['--ignore-certificate-errors'],
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));
  page.on('requestfailed', request => {
    console.error('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  await page.goto(targetUrl, { waitUntil: 'networkidle2' });
  console.log('FINAL URL:', page.url());
  console.log('ROOT HTML:', await page.$eval('#root', element => element.innerHTML));
  await browser.close();
})();
