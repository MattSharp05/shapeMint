import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateTestPDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Path to your HTML test report
  const htmlPath = path.join(__dirname, '../src/reports/test-report.html');
  const pdfPath = path.join(__dirname, '../test-report.pdf');
  
  // Load the HTML file
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  // Wait for any dynamic content to load
  await page.waitForTimeout(2000);
  
  // Generate PDF
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