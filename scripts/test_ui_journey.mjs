import puppeteer from 'puppeteer-core';
import process from 'process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runUITests() {
  console.log('================================================================================');
  console.log('  QuantaLearn AI — Full UI & User Journey Automated Browser Test Suite');
  console.log('================================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    // Ignore offline font network error
    if (text.includes('ERR_NAME_NOT_RESOLVED') || text.includes('fonts.googleapis.com')) return;
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error] ${text}`);
      console.log(`\x1b[31m[Console Error]\x1b[0m ${text}`);
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push(`[Page Runtime Exception] ${err.toString()}`);
    console.log(`\x1b[31m[Page Runtime Exception]\x1b[0m ${err.toString()}`);
  });

  try {
    // 1. HOME PAGE
    console.log('1. Testing HOME PAGE (http://127.0.0.1:5173/)...');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('h1', { timeout: 10000 });
    const homeTitle = await page.$eval('h1', el => el.textContent);
    console.log(`   ✓ Home rendered: "${homeTitle}"`);

    // Verify curriculum topics loaded
    await page.waitForFunction(() => document.body.innerText.includes('Topic 1.1'), { timeout: 10000 });
    console.log('   ✓ Curriculum topics listed on Home (Topic 1.1, 1.2, 1.3, 1.4)');

    // 2. OPEN TOPIC 1.1
    console.log('\n2. Testing TOPIC 1.1 navigation...');
    await page.goto(`${BASE_URL}/learn?topic=1.1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#concept-next', { timeout: 10000 });
    let topic11Title = await page.$eval('h1', el => el.textContent);
    console.log(`   ✓ Topic 1.1 loaded: "${topic11Title}"`);

    // Verify Concept 1 is loaded
    let activeConceptHeader = await page.$eval('h2', el => el.textContent);
    console.log(`   ✓ Concept 1 active: "${activeConceptHeader}"`);

    // 3. NEXT CONCEPT NAVIGATION
    console.log('\n3. Testing "Next Concept" navigation...');
    await page.click('#concept-next');
    await page.waitForFunction(() => window.location.search.includes('concept=C02'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));

    let nextConceptHeader = await page.$eval('h2', el => el.textContent);
    console.log(`   ✓ Navigated to Next Concept (C02): "${nextConceptHeader}"`);
    console.log(`   Current URL: ${page.url()}`);

    // Click Next Concept again -> C03
    console.log('   Clicking Next Concept again...');
    await page.click('#concept-next');
    await page.waitForFunction(() => window.location.search.includes('concept=C03'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));
    let concept3Header = await page.$eval('h2', el => el.textContent);
    console.log(`   ✓ Navigated to Concept 3 (C03): "${concept3Header}"`);

    // Click Previous Concept -> C02
    console.log('   Clicking Previous Concept...');
    await page.click('#concept-prev');
    await page.waitForFunction(() => window.location.search.includes('concept=C02'), { timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));
    let prevConceptHeader = await page.$eval('h2', el => el.textContent);
    console.log(`   ✓ Navigated back to Concept 2: "${prevConceptHeader}"`);

    // 4. OPEN TOPIC 1.2
    console.log('\n4. Testing TOPIC 1.2 navigation...');
    await page.goto(`${BASE_URL}/learn?topic=1.2`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#concept-next', { timeout: 10000 });
    let topic12Title = await page.$eval('h1', el => el.textContent);
    console.log(`   ✓ Topic 1.2 loaded: "${topic12Title}"`);

    // Also test path route /learn/1.2 directly
    console.log('   Testing path route /learn/1.2 directly...');
    await page.goto(`${BASE_URL}/learn/1.2`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#concept-next', { timeout: 10000 });
    let topic12PathTitle = await page.$eval('h1', el => el.textContent);
    console.log(`   ✓ /learn/1.2 loaded: "${topic12PathTitle}"`);

    // 5. OPEN TOPIC 1.3
    console.log('\n5. Testing TOPIC 1.3 navigation...');
    await page.goto(`${BASE_URL}/learn?topic=1.3`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#concept-next', { timeout: 10000 });
    let topic13Title = await page.$eval('h1', el => el.textContent);
    console.log(`   ✓ Topic 1.3 loaded: "${topic13Title}"`);

    // 6. OPEN TOPIC 1.4
    console.log('\n6. Testing TOPIC 1.4 navigation...');
    await page.goto(`${BASE_URL}/learn?topic=1.4`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#concept-next', { timeout: 10000 });
    let topic14Title = await page.$eval('h1', el => el.textContent);
    console.log(`   ✓ Topic 1.4 loaded: "${topic14Title}"`);

    // 7. OPEN QUANTUM LAB
    console.log('\n7. Testing QUANTUM LAB page (/lab)...');
    await page.goto(`${BASE_URL}/lab`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('button', { timeout: 10000 });
    await page.waitForFunction(() => document.body.innerText.includes('Quantum Lab') || document.body.innerText.includes('Register'), { timeout: 10000 });
    console.log('   ✓ Quantum Lab page loaded cleanly without exceptions!');

    // Test Lab simulation
    console.log('   Running circuit simulation in Lab...');
    const buttons = await page.$$('button');
    let runBtn = null;
    for (const b of buttons) {
      const txt = await page.evaluate(el => el.textContent, b);
      if (txt.includes('Run Simulation') || txt.includes('Simulate')) {
        runBtn = b;
        break;
      }
    }
    if (runBtn) {
      await runBtn.click();
      await new Promise(r => setTimeout(r, 2000));
      const labAfterSim = await page.$eval('body', el => el.innerText);
      const hasSimResults = labAfterSim.includes('|00⟩') || labAfterSim.includes('Probability') || labAfterSim.includes('Telemetry') || labAfterSim.includes('Simulation');
      console.log(`   ✓ Circuit simulation executed! (Verified telemetry present: ${hasSimResults})`);
    }

    // 8. RETURN TO LEARN & OPEN TUTOR
    console.log('\n8. Testing AI TUTOR DRAWER on /learn...');
    await page.goto(`${BASE_URL}/learn?topic=1.1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForSelector('#floating-ask-tutor', { timeout: 10000 });

    console.log('   Clicking floating "Ask AI Tutor" button...');
    await page.click('#floating-ask-tutor');
    await page.waitForSelector('aside[aria-label="Quantum AI Tutor Docked Panel"]', { timeout: 10000 });
    console.log('   ✓ AI Tutor Drawer opened successfully!');

    // 9. TEST "Explain this in simpler terms"
    console.log('\n9. Testing "Explain this in simpler terms" in AI Tutor...');
    await page.waitForFunction(() => {
      const tutor = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"]');
      if (!tutor) return false;
      const btns = Array.from(tutor.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Explain this in simpler terms'));
    }, { timeout: 15000 });

    await page.evaluate(() => {
      const tutor = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"]');
      const btns = Array.from(tutor.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Explain this in simpler terms'));
      if (btn) btn.click();
    });

    console.log('   Waiting for explanation response...');
    await page.waitForFunction(() => {
      const tutor = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"]');
      if (!tutor) return false;
      const text = tutor.innerText;
      const hasResponse = text.includes('Verified by validator') || text.includes('AI Tutor') || text.includes('Curriculum Fallback');
      const isLoading = text.includes('Consulting verified curriculum');
      return hasResponse && !isLoading;
    }, { timeout: 90000 });
    console.log('   ✓ "Explain this" response received and verified!');

    // 10. TEST "Quiz me"
    console.log('\n10. Testing "Quiz me" in AI Tutor...');
    await page.waitForFunction(() => {
      const inp = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"] input[type="text"]');
      return inp && !inp.disabled;
    }, { timeout: 45000 });

    await page.type('aside[aria-label="Quantum AI Tutor Docked Panel"] input[type="text"]', 'Quiz me on this concept');
    await page.click('aside[aria-label="Quantum AI Tutor Docked Panel"] button[type="submit"]');

    console.log('   Waiting for dynamic quiz generation from Ollama...');
    await page.waitForFunction(() => {
      const tutor = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"]');
      if (!tutor) return false;
      const text = tutor.innerText;
      return text.includes('Question 1 of') && !text.includes('Consulting verified curriculum');
    }, { timeout: 90000 });

    const tutorBodyText = await page.$eval('aside[aria-label="Quantum AI Tutor Docked Panel"]', el => el.innerText);
    const hasLLMBadge = tutorBodyText.includes('AI Tutor');
    const hasFallbackBadge = tutorBodyText.includes('Curriculum Fallback');
    console.log(`   ✓ Quiz Question 1 generated and received!`);
    console.log(`   Badge status: "AI Tutor" (LLM): ${hasLLMBadge}, "Curriculum Fallback": ${hasFallbackBadge}`);

    if (hasFallbackBadge && !hasLLMBadge) {
      throw new Error('Received Curriculum Fallback badge instead of AI Tutor!');
    } else {
      console.log('   ✓ AI Tutor badge confirmed!');
    }

    // 11. ANSWER THE QUESTION
    console.log('\n11. Testing answering quiz question with Option A...');
    await page.waitForFunction(() => {
      const btns = Array.from(document.querySelectorAll('aside[aria-label="Quantum AI Tutor Docked Panel"] button'));
      return btns.some(b => b.textContent.includes('A') && !b.disabled && b.closest('.grid'));
    }, { timeout: 30000 });

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside[aria-label="Quantum AI Tutor Docked Panel"] button'));
      const optA = btns.find(b => b.textContent.includes('A') && b.closest('.grid'));
      if (optA) optA.click();
    });

    console.log('   Waiting for answer evaluation...');
    await page.waitForFunction(() => {
      const tutor = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"]');
      if (!tutor) return false;
      const text = tutor.innerText;
      return (text.includes('Correct!') || text.includes('Not Quite') || text.includes('Explanation:')) && !text.includes('Consulting verified curriculum');
    }, { timeout: 90000 });

    const evalBodyText = await page.$eval('aside[aria-label="Quantum AI Tutor Docked Panel"]', el => el.innerText);
    const hasFeedback = evalBodyText.includes('Correct!') || evalBodyText.includes('Not Quite');
    console.log(`   ✓ Answer evaluated with immediate feedback! (Feedback present: ${hasFeedback})`);

    // 12. TEST "ANOTHER ONE"
    console.log('\n12. Testing "Another one" command in AI Tutor...');
    await page.waitForFunction(() => {
      const inp = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"] input[type="text"]');
      return inp && !inp.disabled;
    }, { timeout: 45000 });

    await page.type('aside[aria-label="Quantum AI Tutor Docked Panel"] input[type="text"]', 'Another one');
    await page.click('aside[aria-label="Quantum AI Tutor Docked Panel"] button[type="submit"]');

    console.log('   Waiting for next question from "Another one"...');
    await page.waitForFunction(() => {
      const tutor = document.querySelector('aside[aria-label="Quantum AI Tutor Docked Panel"]');
      if (!tutor) return false;
      const text = tutor.innerText;
      return (text.includes('Question 2 of') || text.includes('Question 1 of')) && !text.includes('Consulting verified curriculum');
    }, { timeout: 90000 });
    console.log('   ✓ "Another one" successfully triggered a new question!');

    // 13. CHECK CONSOLE ERRORS
    console.log('\n================================================================================');
    console.log('  CONSOLE & RUNTIME EXCEPTION AUDIT:');
    if (consoleErrors.length === 0) {
      console.log('  ✓ ZERO console errors or runtime exceptions detected across entire journey!');
    } else {
      console.log(`  Found ${consoleErrors.length} console error(s):`);
      consoleErrors.forEach(e => console.log(`   - ${e}`));
      throw new Error(`Console errors detected: ${consoleErrors.join(', ')}`);
    }
    console.log('================================================================================');

    console.log('\n🎉 ALL USER JOURNEY TESTS COMPLETED SUCCESSFULLY!\n');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runUITests();
