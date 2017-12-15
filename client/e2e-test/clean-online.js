/**
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 *
 *                   CLEAN ONLINE WITH PUPPETEER
 *
 * This script accedes to Lumen in the tenant lumencitest.akvotest.org
 * using a headless Chromium browser. It tries the following:
 * - Log in using the environment variables USERNAME and PASSWORD.
 * - Delete all the elements created by the user: datasets, visualisations
 *   or dashboards.
 *
 */

/* global __datasetName */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-console */

const puppeteer = require('puppeteer');

const assert = require('assert');

const username = process.env.USERNAME;

const password = process.env.PASSWORD;

const selectorTimeout = 10000;

(async () => {
  const browser = await puppeteer.launch({
    // You can uncomment the next line to see the browser
    // headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  const page = await browser.newPage();

  try {
    // Login
    console.log('\nSTARTING LUMEN ONLINE DELETIONS WITH PUPPETEER\n');
    await page.setViewport({ width: 1024, height: 768 });
    console.log('Accessing to https://lumencitest.akvoest.org...');
    await page.goto('https://lumencitest.akvotest.org');
    await page.waitForSelector('#username', { timeout: selectorTimeout });
    console.log('Typing username...');
    await page.type('#username', username);
    console.log('Typing password...');
    await page.type('#password', password);
    console.log('Trying login...');
    await page.click('#kc-login');
    await page.waitForSelector('button[data-test-id="dataset"]', { timeout: selectorTimeout });
    console.log('Login was successful.\n');

    // Delete
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(1000);
    let count = 0;
    let dataTestName = await page.$('[data-test-id="show-controls"]');
    assert.ok(dataTestName !== null, 'There is no element to delete.');
    while (dataTestName !== null) {
      console.log(`Deleting element ${count + 1}... `);
      await page.click('[data-test-id="show-controls"]');
      await page.waitForSelector('[data-test-id="context-menu"] li:nth-of-type(6)', { timeout: selectorTimeout });
      await page.click('[data-test-id="context-menu"] li:nth-of-type(6)');
      await page.waitForSelector('[data-test-id="next"]', { timeout: selectorTimeout });
      await page.click('[data-test-id="next"]');
      await sleep(300);
      dataTestName = await page.$('[data-test-id="show-controls"]');
      count += 1;
    }
    console.log(`${count} elements deleted.\n`);
    console.log('THE DELETION WAS SUCCESSFUL.');
  } catch (err) {
    console.log(`THE DELETION FAILED:\n${err}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
