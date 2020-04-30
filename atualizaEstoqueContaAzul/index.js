const puppeteer = require('puppeteer');
const CREDS = require('./creds');
const PRODUTOS = require('./produtos');

async function prepare(page) {
  const USERNAME_SELECTOR = 'body > div.login-page > div > div.login-page__column.login-page__column__content-side > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div > div > form > div > div:nth-child(1) > div > div > input';
  const PASSWORD_SELECTOR = 'body > div.login-page > div > div.login-page__column.login-page__column__content-side > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div > div > form > div > div:nth-child(2) > div > div > input';
  const SIGNIN_SELECTOR = 'body > div.login-page > div > div.login-page__column.login-page__column__content-side > div > div > div:nth-child(2) > div > div > div:nth-child(3) > div > div > form > div > div:nth-child(4) > div > div > span > button';

  await page.goto('https://login.contaazul.com/#/', { "timeout": 30000, "waitUntil": "domcontentloaded" });

  await page.click(USERNAME_SELECTOR);
  await page.keyboard.type(CREDS.username);
  await page.waitFor(500);

  await page.click(PASSWORD_SELECTOR);
  await page.keyboard.type(CREDS.password);
  page.click(SIGNIN_SELECTOR);

  await page.waitForNavigation({ "timeout": 30000, "waitUntil": "domcontentloaded" });

  const MENUVENDAS_SELECTOR = '#caToolbars > app-ca-toolbar > div > div > ca-row > ng-transclude > ca-col.caf-navbar__primary-nav.ng-scope.ng-isolate-scope.ca-col-6 > ng-transclude > nav > ul > li:nth-child(2) > a';
  const PRODUTOS_SELECTOR = '#saleDropdown > div:nth-child(2) > li:nth-child(3) > div > a';

  await page.waitForSelector(MENUVENDAS_SELECTOR);

  // Clica nas lista de produtos
  page.hover(MENUVENDAS_SELECTOR);
  await page.waitFor(2000);
  page.click(PRODUTOS_SELECTOR);
  await page.waitFor(2000);
}



async function buscaProduto(page, produto) {
  const PESQUISA_SELECTOR = '#conteudo > div > div.btn-toolbar > div.input-append.pull-right.simple-search > input';
  await page.waitForSelector(PESQUISA_SELECTOR);
  await page.waitFor(1000);
  await page.click(PESQUISA_SELECTOR);
  await page.waitFor(1000);
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(produto.codigo);
  await page.keyboard.press("Enter");
  await page.waitFor(1000);
  // Verifica se o produto existe extrai valor do custo de venda e quantidade do estoque do primeiro item
  const LINKPRODUTO_SELECTOR = '#conteudo > div > div:nth-child(3) > table > tbody > tr > td.col32.ng-binding';
  const CUSTOMEDIO_SELECTOR = '#conteudo > div > form > div.iconGroup.produto > fieldset > div.theme-onion > div:nth-child(2) > div:nth-child(2) > input';
  const ESTOQUE_SELECTOR = '#conteudo > div > div:nth-child(3) > table > tbody > tr:nth-child(1) > td.ca-table-col-7.ca-u-text-right.ng-scope > div';
  const SALVAR_SELECTOR = '#btnSaveProduct';
  if (await page.$(LINKPRODUTO_SELECTOR) === null) {
    console.log(`${produto.codigo} - não encontrado`);
    return;
  } else {
    await page.waitForSelector(ESTOQUE_SELECTOR);
    await page.waitFor(500);
    const estoqueAtual = parseInt(await page.$eval(ESTOQUE_SELECTOR, el => el.innerText));
    await Promise.all([
      page.waitForNavigation({ "timeout": 30000, "waitUntil": "domcontentloaded" }),
      page.click(LINKPRODUTO_SELECTOR),
    ]);

    await page.waitForSelector(CUSTOMEDIO_SELECTOR);
    await page.waitFor(1000);

    const cmvAtual = parseFloat(await page.$eval(CUSTOMEDIO_SELECTOR, el => el.value.replace(",",".")));

    if (cmvAtual.toString().replace(".",",") === produto.cmv.toString().replace(".",",") ) {
      console.log(`${produto.codigo} - Nada a fazer`);
      await Promise.all([
        page.waitForNavigation({ "timeout": 30000, "waitUntil": "domcontentloaded" }),
        page.click(SALVAR_SELECTOR),
      ]);
      return;
    }

    console.log(`${produto.codigo} - Pendente cmvAtual: ${cmvAtual} estoqueAtual ${estoqueAtual}`);

    if (estoqueAtual > 0) {
      console.log(`${produto.codigo} - Ajustar apenas cmv`);
      await ajustaApenasCmv(page, produto)
    } else {
      console.log(`${produto.codigo} - Ajustar apenas estoque desta vez`);
      await ajustaEstoqueParaUm(page, produto, estoqueAtual);
    }
      
    await page.waitForSelector(SALVAR_SELECTOR, {visible: true});
    await page.waitFor(1000);

    await Promise.all([
      page.waitForNavigation({ "timeout": 30000, "waitUntil": "domcontentloaded" }),
      page.click(SALVAR_SELECTOR),
    ]);



  }
}

async function ajustaEstoqueParaUm(page, produto, estoqueAtual) {
  const NOVAMOVIMENTACAO_SELECTOR = '#btnNewMovement';
  await page.waitForSelector(NOVAMOVIMENTACAO_SELECTOR, {visible: true});
  await page.click(NOVAMOVIMENTACAO_SELECTOR);
  await page.waitFor(2000);      
  const diferenca = 1 - estoqueAtual;       
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});        
  await page.keyboard.press('ArrowDown', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.waitFor(500);     
  await page.keyboard.type((Math.abs(diferenca)).toString());
  await page.waitFor(500);
  await page.keyboard.press('Tab', {delay: 100});
  await page.waitFor(500);
  await page.keyboard.type((Math.abs(produto.cmv)).toString().replace(".",",")  );
  await page.waitFor(500);
  await page.keyboard.press('Enter', {delay: 100});
  await page.waitFor(1000);

}

async function ajustaApenasCmv(page, produto) {
  const NOVAMOVIMENTACAO_SELECTOR = '#btnNewMovement';
  await page.waitForSelector(NOVAMOVIMENTACAO_SELECTOR, {visible: true});
  await page.click(NOVAMOVIMENTACAO_SELECTOR);
  await page.waitFor(2000);      
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('ArrowDown', {delay: 100});
  await page.keyboard.press('ArrowDown', {delay: 100});
  await page.keyboard.press('ArrowDown', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.keyboard.press('Tab', {delay: 100});
  await page.waitFor(500);
  await page.keyboard.type((produto.cmv).toString().replace(".",","));
  await page.waitFor(500);
  await page.keyboard.press('Enter', {delay: 100});
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false
  });
  const page = await browser.newPage();

  await prepare(page);

  // Produto a buscar
  for( let i=0; i<PRODUTOS.length; i++) {
    await buscaProduto(page, PRODUTOS[i]);
  }

    browser.close();
}

run();


