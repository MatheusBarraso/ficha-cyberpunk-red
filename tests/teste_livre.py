"""Sistema livre (uso local): ficha a partir do modelo, preencher e salvar, montar seções e campos, apagar,
limpar mantendo o modelo, backup indo e voltando, modelo vindo de fora (só o que a ficha entende),
abas e páginas, celular e a estante de livros vazia."""
import asyncio
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apoio import *  # noqa: E402,F401,F403

URL = 'https://ficha.test/index.html#rpg=livre&solo=1'
falhas = []


def checar(cond, msg):
    print(('ok: ' if cond else 'FALHOU: ') + msg)
    if not cond:
        falhas.append(msg)


SALVO = "JSON.parse(localStorage.getItem('sk-livre-ficha') || 'null')"
TITULOS = "[...document.querySelectorAll('.sheet.livre .sl-secao')].map(s => s.querySelector('.sl-sec-tit').textContent)"


async def main():
    async with async_playwright() as p:
        b = await lancar(p)
        errs = []

        async def nova_aba(ctx, endereco=URL):
            pg = await ctx.new_page()
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(endereco); await pg.wait_for_timeout(1500)
            await pg.evaluate("showPage(0)"); await pg.wait_for_timeout(300)
            return pg

        ctx = await b.new_context(viewport={'width': 1300, 'height': 850}, accept_downloads=True)
        await ctx.route('**/*', handler)
        pg = await nova_aba(ctx)

        # 1) ficha nova: o modelo inicial, sem nada do Cyberpunk RED
        checar(await pg.evaluate("SK.SISTEMA.id") == 'livre', 'abre o Sistema livre')
        checar(await pg.evaluate("document.querySelectorAll('.pdflayer, template').length") == 0, 'nada das páginas do CPR na tela')
        checar(await pg.evaluate(TITULOS) == ['Personagem', 'Atributos', 'Recursos', 'Perícias e habilidades', 'Equipamento'], 'modelo inicial com 5 seções')
        chaves = await pg.evaluate("[...document.querySelectorAll('[data-f]')].map(f => f.dataset.f)")
        checar('NOME' in chaves and '__layout' in chaves and 'vida:max' in chaves and 'PAPEL' not in chaves, 'campos do modelo (NOME, __layout, vida:max), nenhum do CPR')
        abas = await pg.evaluate("[...document.querySelectorAll('#fold-paginas .tab')].map(t => t.hidden ? '-' : t.textContent)")
        checar(abas == ['1 · Ficha', '-', '-', '2 · Anotações', '3 · História', '4 · Livros'], f'abas do menu: {abas}')
        await pg.evaluate("showPage(1)"); await pg.wait_for_timeout(200)
        checar(await pg.evaluate("[...document.querySelectorAll('.sheet')].findIndex(s => s.classList.contains('active'))") == 0, 'página que o sistema não usa volta pra ficha')

        # 2) preencher e salvar (chave do Sistema livre; a do CPR nem existe)
        await pg.fill('[data-f="NOME"]', 'Kira Voss')
        await pg.fill('[data-f="atr1"]', '14')
        await pg.fill('[data-f="vida"]', '12'); await pg.fill('[data-f="vida:max"]', '20')
        await pg.fill('[data-f="equipamento"]', 'Lanterna, corda')
        await pg.wait_for_timeout(700)
        d = await pg.evaluate(SALVO)
        checar(d and d['NOME'] == 'Kira Voss' and d['atr1'] == '14' and d['vida:max'] == '20', 'salva os valores em sk-livre-ficha')
        checar(d and json.loads(d['__layout'])['secoes'][0]['id'] == 's-personagem', 'o modelo vai junto nos dados (__layout)')
        checar(await pg.evaluate("localStorage.getItem('cpr-ficha-v1')") is None, 'a ficha do CPR não foi tocada')
        await pg.reload(); await pg.wait_for_timeout(1500)
        checar(await pg.input_value('[data-f="vida:max"]') == '20' and await pg.input_value('[data-f="equipamento"]') == 'Lanterna, corda', 'na volta os valores estão lá')

        # 3) montar: seção nova, campos com tipos, mover
        await pg.evaluate("showPage(0)")
        await pg.click('.sl-editar'); await pg.wait_for_timeout(200)
        checar(await pg.evaluate("document.querySelector('.sheet.livre').classList.contains('editando')"), 'Editar ficha liga o modo de edição')
        await pg.click('.sl-nova-secao'); await pg.wait_for_timeout(200)
        checar(await pg.evaluate("document.activeElement.classList.contains('sl-ed-titulo') && document.activeElement.value === 'Nova seção'"), 'seção nova com o nome em foco')
        await pg.keyboard.type('Magias')
        sec = pg.locator('.sl-secao').last
        await sec.locator('.sl-ed-rot').first.fill('Pontos de magia')
        await sec.locator('.sl-ed-tipo').first.select_option('recurso'); await pg.wait_for_timeout(150)
        checar(await pg.evaluate("document.activeElement.classList.contains('sl-ed-tipo')"), 'trocar o tipo mantém o foco no campo')
        await sec.locator('.sl-ed-mais').click(); await pg.wait_for_timeout(150)
        checar(await pg.evaluate("document.activeElement.classList.contains('sl-ed-rot')"), '＋ Campo põe o foco no rótulo do campo novo')
        await pg.keyboard.type('Concentrado')
        await sec.locator('.sl-ed-tipo').last.select_option('marcar'); await pg.wait_for_timeout(150)
        await sec.locator('.sl-campo-ed').last.locator('button[title="Subir campo"]').click(); await pg.wait_for_timeout(150)
        ordem = await sec.locator('.sl-ed-rot').evaluate_all("es => es.map(e => e.value)")
        checar(ordem == ['Concentrado', 'Pontos de magia'], f'subir campo: {ordem}')
        checar(await pg.evaluate("document.activeElement.title") == 'Descer campo', 'no topo, o foco passa pra seta de descer')
        await pg.screenshot(path=os.path.join(SAIDA, 'livre_editar.png'))
        await pg.click('.sl-editar'); await pg.wait_for_timeout(200)
        checar(await pg.evaluate(TITULOS + ".pop()") == 'Magias', 'Pronto: a seção nova aparece pra jogar')
        mag = pg.locator('.sl-secao').last
        checar(await mag.locator('input[type=checkbox]').count() == 1 and await mag.locator('.sl-par input').count() == 2, 'marcar vira caixinha e recurso vira atual / máximo')
        await mag.locator('input[type=checkbox]').check()
        await mag.locator('.sl-par input').first.fill('3'); await mag.locator('.sl-par input').last.fill('5')
        await pg.wait_for_timeout(700)
        await pg.reload(); await pg.wait_for_timeout(1500)
        mag = pg.locator('.sl-secao').last
        checar(await pg.evaluate(TITULOS + ".pop()") == 'Magias' and await mag.locator('input[type=checkbox]').is_checked(), 'na volta o modelo e os valores novos estão lá')
        checar(await mag.locator('.sl-par input').last.input_value() == '5', 'recurso guarda o máximo')

        # 4) apagar campo com valor pede confirmação e leva o valor junto
        await pg.evaluate("showPage(0)"); await pg.click('.sl-editar'); await pg.wait_for_timeout(200)
        id_conc = await pg.locator('.sl-secao').last.locator('.sl-campo-ed').first.get_attribute('data-campo')
        await pg.locator('.sl-secao').last.locator('.sl-campo-ed').first.locator('button[title="Apagar campo"]').click(); await pg.wait_for_timeout(200)
        checar(await pg.locator('.cfm').count() == 1, 'apagar campo preenchido pergunta antes')
        await pg.click('.cfm .ok'); await pg.wait_for_timeout(700)
        d = await pg.evaluate(SALVO)
        checar(id_conc not in d and id_conc not in d['__layout'], 'o campo e o valor dele saem da ficha salva')
        await pg.click('.sl-editar'); await pg.wait_for_timeout(200)

        # 5) Limpar ficha: some o personagem, o modelo fica
        await pg.evaluate("openMenu(true)"); await pg.click('#btn-clear'); await pg.wait_for_timeout(200)
        checar('seções e os campos que você montou continuam' in (await txt(pg, '.cfm p') or ''), 'o aviso diz que o modelo continua')
        await pg.click('.cfm .ok'); await pg.wait_for_timeout(500)
        d = await pg.evaluate(SALVO)
        checar(d and not d.get('NOME') and not d.get('atr1') and 'Magias' in d['__layout'], 'limpou os valores e guardou o modelo')
        await pg.reload(); await pg.wait_for_timeout(1500)
        checar(await pg.evaluate(TITULOS + ".pop()") == 'Magias' and await pg.input_value('[data-f="NOME"]') == '', 'na volta: modelo montado, ficha em branco')

        # 6) backup vai e volta (e leva pro sistema certo)
        await pg.evaluate("showPage(0)")
        await pg.fill('[data-f="NOME"]', 'Kira Voss'); await pg.wait_for_timeout(600)
        async with pg.expect_download() as dl:
            await pg.evaluate("salvarBackup()")
        arq = await (await dl.value).path()
        bk = json.load(open(arq))
        checar(bk['sistema'] == 'livre' and bk['ficha']['NOME'] == 'Kira Voss' and 'Magias' in bk['ficha']['__layout'], 'backup com o sistema, os valores e o modelo')
        checar((await dl.value).suggested_filename.startswith('ficha-livre-'), 'nome do arquivo diz o sistema')
        async with pg.expect_navigation():
            await pg.evaluate("trocarSistema('cpr')")
        await pg.wait_for_timeout(1500)
        checar(await pg.evaluate("SK.SISTEMA.id") == 'cpr', 'trocou pro CPR')
        await pg.evaluate("localStorage.removeItem('sk-livre-ficha')")
        await pg.set_input_files('#backup-file', arq); await pg.wait_for_timeout(3000)
        checar(await pg.evaluate("SK.SISTEMA.id") == 'livre', 'backup do Sistema livre carregado no CPR volta pro Sistema livre')
        checar(await pg.input_value('[data-f="NOME"]') == 'Kira Voss' and await pg.evaluate(TITULOS + ".pop()") == 'Magias', 'com a ficha e o modelo do backup')

        # 7) modelo vindo de fora: fica só o que a ficha entende
        ruim = {'app': 'cpr-ficha', 'versao': 1, 'sistema': 'livre', 'ficha': {'NOME': 'X', '__layout': json.dumps({'secoes': [
            {'id': 'boa', 'titulo': 'Boa', 'campos': [{'id': '__img', 'rotulo': 'roubo', 'tipo': 'texto'}, {'id': 'NOME', 'rotulo': 'dup', 'tipo': 'texto'},
                                                     {'id': 'ok-1', 'rotulo': 'Certo', 'tipo': 'numero'}, {'id': 'ok-2', 'rotulo': 'Tipo estranho', 'tipo': 'script'},
                                                     {'id': 'ok-1', 'rotulo': 'Repetido', 'tipo': 'texto'}]},
            {'id': 'Ruim!', 'titulo': 'id inválido', 'campos': []}]})}}
        arq2 = os.path.join(tempfile.mkdtemp(), 'ruim.json'); open(arq2, 'w').write(json.dumps(ruim))
        await pg.set_input_files('#backup-file', arq2); await pg.wait_for_timeout(3000)
        checar(await pg.evaluate(TITULOS) == ['Boa'], 'seção com id inválido fica de fora')
        chaves = await pg.evaluate("[...document.querySelectorAll('.sl-secao [data-f]')].map(f => f.dataset.f)")
        checar(chaves == ['ok-1'], f'só o campo válido (sem __img, NOME, tipo estranho ou repetido): {chaves}')

        # 8) Livros: a estante começa vazia, sem erro
        await pg.evaluate("showPage(5)"); await pg.wait_for_timeout(800)
        checar(await pg.evaluate("!!document.getElementById('lv-falta') && !document.getElementById('lv-falta').hidden"), 'Livros: estante vazia mostra o aviso')
        await pg.evaluate("showPage(0)")

        # 9) impressão monta sem erro
        await pg.evaluate("dispatchEvent(new Event('beforeprint')); dispatchEvent(new Event('afterprint'))")
        await ctx.close()

        # 10) celular em pé: uma coluna, nada passa da largura
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        await ctx.route('**/*', handler)
        pg = await nova_aba(ctx)
        xs = await pg.evaluate("[...document.querySelectorAll('.sl-secao')].map(s => Math.round(s.getBoundingClientRect().left))")
        checar(len(set(xs)) == 1, 'celular: as seções numa coluna só')
        checar(await pg.evaluate("document.documentElement.scrollWidth") <= 390, 'celular: nada passa da largura da tela')
        await pg.screenshot(path=os.path.join(SAIDA, 'livre_celular.png'))
        await ctx.close()

        print('errors', errs)
        if falhas:
            print('FALHOU:', len(falhas), 'checagens')
        await b.close()

asyncio.run(main())
