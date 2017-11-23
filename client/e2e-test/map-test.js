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

/* global __datasetName */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-unresolved */
/* eslint-disable no-console */

const puppeteer = require('puppeteer');

const datasetName = Date.now().toString();

(async () => {
  const browser = await puppeteer.launch({
	headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  const page = await browser.newPage();

  try {
    // Login
    console.log('\nSTARTING LUMEN TEST WITH PUPPETEER\n');
    await page.setViewport({ width: 1024, height: 768 });
    console.log('Accessing to http://t1.lumen.local:3030...');
    await page.goto('http://t1.lumen.local:3030/');
    await page.waitForSelector('#username', { timeout: 10000 });
    console.log('Typing username...');
    await page.type('#username', 'jerome');
    console.log('Typing password...');
    await page.type('#password', 'password');
    console.log('Trying login...');
    await page.click('#kc-login');
    await page.waitForSelector('button[data-test-id="dataset"]', { timeout: 10000 });
    console.log('Login was successful.\n');
    await page.evaluate(`window.__datasetName = "${datasetName}"`);

    // Dataset adding
    // Click Dataset+ option
    console.log('Accessing to dataset creation...');
    await page.click('button[data-test-id="dataset"]');
    await page.waitForSelector('button[data-test-id="next"]', { timeout: 10000 });
    // Select link option
    console.log('Typing dataset link...');
    await page.click('input[data-test-id="source-option"][value="LINK"]');
    await page.click('button[data-test-id="next"]');
    await page.waitForSelector('#linkFileInput', { timeout: 10000 });
    // Insert link
    await page.type('#linkFileInput', 'https://raw.githubusercontent.com/albertyw/avenews/master/old/data/average-latitude-longitude-countries.csv');
    await page.click('button[data-test-id="next"]');
    await page.waitForSelector('input[data-test-id="dataset-name"]', { timeout: 10000 });
    // Insert name
    console.log('Typing dataset name...');
    await page.type('input[data-test-id="dataset-name"]', datasetName);
    // Import
    console.log('Saving dataset...');
    await page.click('button[data-test-id="next"]');
    console.log(`Dataset ${datasetName} was successfully created.\n`);
    await page.waitForSelector(`[data-test-name="${datasetName}"]`);

    // Search of the ID
    console.log('Extracting dataset ID...');
    const id = await page.evaluate(() => {
      const found = document.querySelector(`[data-test-name="${__datasetName}"]`);
      return Promise.resolve(found.getAttribute('data-test-id'));
    });
    console.log(`ID extracted: ${id}\n`);
    let pending;
    const timeOut = setTimeout(() => { console.log('Error waiting for pending dataset'); process.exit(1); }, 15 * 1000);
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    do {
      await sleep(1000);
      pending = await page.$(`[data-test-name="${datasetName}"] [data-test-id="pending"]`);
      console.log('Pending...');
    } while (pending);
    clearTimeout(timeOut);
    
    // Create geopoints
    await page.click(`[data-test-name="${datasetName}"]`);
    await page.waitForSelector('[data-test-id="transform"]');
    await page.click('[data-test-id="transform"]');
    console.log('Creating column of geopoints...');
    await page.click('li:nth-of-type(6)');
    console.log('Selecting latitudes...');
    await page.waitForSelector('label[for="columnNameLat"]+div');
    await page.click('label[for="columnNameLat"]+div');
    const latitudeId = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role="option"]');
      const options = Array.from(elements);
      const found = options.find(e => e.textContent === 'Latitude');
      return Promise.resolve(found.getAttribute('id'));
    });
    await page.click(`#${latitudeId}`);
    console.log('Selecting longitudes...');
    await page.waitForSelector('label[for="columnNameLong"]+div');
    await page.click('label[for="columnNameLong"]+div');
    const longitudeId = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role="option"]');
      const options = Array.from(elements);
      const found = options.find(e => e.textContent === 'Longitude');
      return Promise.resolve(found.getAttribute('id'));
    });
    await page.click(`#${longitudeId}`);
    console.log('Typing column name...');
    await page.type('[data-test-id="columnTitle"]', 'Geopoint');
    await page.click('[data-test-id="generate"]');
    await page.goto('http://t1.lumen.local:3030/library');
    await page.waitForSelector('button[data-test-id="visualisation"]', { timeout: 10000 });
    
    /********************************************************************
    // Map
    console.log('Accessing to visualisation creation...');
    await page.click('button[data-test-id="visualisation"]');
    console.log('Selecting map option...');
    await page.waitForSelector('li[data-test-id="button-map"]', { timeout: 10000 });
    await page.click('li[data-test-id="button-map"]');
    //LOOK TEST IDS
    await page.click('[class="addLayer clickable noSelect"]');
    await page.click('[class="clickable title"]');
    console.log('Selecting dataset...');
    await page.waitForSelector('.Select-placeholder', { timeout: 10000 });
    await page.click('.Select-placeholder');
    //await page.waitForSelector('[data-test-id="select-menu"]', { timeout: 10000 });
    //await page.click('[data-test-id="select-menu"]');
    const optionId = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role="option"]');
      const options = Array.from(elements);
      const found = options.find(e => e.textContent === __datasetName);
      return Promise.resolve(found.getAttribute('id'));
    });
    await page.click(`#${optionId}`);
    await page.waitForSelector('.Select-placeholder', { timeout: 10000 });
    await page.click('.Select-placeholder');
    //await page.waitForSelector('label[data-test-id="categoryColumnInput"]+div', { timeout: 10000 });
    //await page.click('label[data-test-id="categoryColumnInput"]+div');
    console.log('Selecting columns...');
    const columnId = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role="option"]');
      const options = Array.from(elements);
      const found = options.find(e => e.textContent === 'Latitude');
      return Promise.resolve(found.getAttribute('id'));
    });
    await page.click(`#${columnId}`);
    await page.click('div[data-test-id="entity-title"]');
    console.log('Typing map name...');
    await page.type('input[data-test-id="entity-title"]', `Visualisation of ${datasetName}`);
    console.log('Saving map...');
    await page.click('button[data-test-id="save-changes"]');
    await page.goto('http://t1.lumen.local:3030/library');
    await page.waitForSelector('button[data-test-id="dashboard"]', { timeout: 10000 });
    console.log(`Map ${datasetName} was successfully created.\n`);

    // Dashboard
    console.log('Accessing to dashboard creation...');
    await page.click('button[data-test-id="dashboard"]');
    console.log('Selecting visualisation...');
    await page.waitForSelector('li[class^="listItem"]', { timeout: 10000 });
    await page.click('li[class^="listItem"]');
    console.log('Typing dashboard name...');
    await page.waitForSelector('div[data-test-id="dashboard-canvas-item"]', { timeout: 10000 });
    await page.click('div[data-test-id="entity-title"]');
    await page.type('input[data-test-id="entity-title"]', `Dashboard of ${datasetName}`);
    console.log('Saving dashboard...');
    await page.click('button[data-test-id="save-changes"]');
    await page.click('i[data-test-id="fa-arrow"]');
    console.log(`Dashboard ${datasetName} was successfully created.\n`);
    console.log('THE TEST WAS SUCCESSFUL');
    *****************************************************/
  } catch (err) {
    console.log(`THE TEST FAILED\n${err}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
