import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestPDF() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const htmlPath = path.join(__dirname, '../src/reports/test-report.html');
  const pdfPath = path.join(__dirname, '../test-report-playwright.pdf');
  
  await page.goto(`file://${htmlPath}`);
  await page.waitForTimeout(2000);
  
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    }
  });
  
  console.log(`PDF generated successfully: ${pdfPath}`);
  await browser.close();
}

generateTestPDF().catch(console.error); 