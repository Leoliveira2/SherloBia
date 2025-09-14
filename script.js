// App sem placeholders — apenas imagens fornecidas
const App = {
  state: { cases: [], unlockedSkills: {} },
  icons: {"Bia": "assets/icons/bia.png", "Sofia": "assets/icons/sofia.png", "Prof. Química": "assets/icons/prof_quimica.png", "Prof. Ciências": "assets/icons/prof_ciencias.png", "Programador Gui": "assets/icons/programador_gui.png", "Treinador Marcos": "assets/icons/treinador_marcos.png", "Zelador Carlos": "assets/icons/zelador_carlos.png"}
};
function iconFor(name) { return App.icons[name]; }
const UI = {
  renderWelcome() {
    document.getElementById('app').innerHTML = `
      <div class="card"><h2>Bem-vindo(a) ao Sherlock Bia (HQ)!</h2>
      <p class="small">Clique em <b>Mapa de Casos</b> e investigue cenários reais fornecidos por você.</p></div>`;
  },
  renderHub() {
    const list = App.state.cases.map((c,i)=>`
      <div class="card">
        <h3>${c.title}</h3>
        <div class="grid grid-3">
          <img src="${c.scenarioImage}" class="case-img" alt="Cenário: ${c.title}">
          <div>
            <p>${c.scenarioText}</p>
            <button class="btn" data-open-case="${i}">Investigar</button>
          </div>
        </div>
      </div>`).join('');
    document.getElementById('app').innerHTML = list || '<div class="card">Sem casos carregados.</div>';
    document.querySelectorAll('[data-open-case]').forEach(btn=> btn.addEventListener('click', ()=> UI.renderCase(parseInt(btn.getAttribute('data-open-case')))));
  },
  renderCase(idx) {
    const c = App.state.cases[idx]; if(!c) return;
    const suspects = c.baseSuspects.map(s=>{
      const src = iconFor(s.name);
      const imgHtml = src ? `<img src="${src}" alt="${s.name}">` : '';
      return `<div class="suspect" data-suspect="${s.name}">${imgHtml}<div>${s.name}</div></div>`;
    }).join('');
    const cluesImgs = (c.clueImages||[]).map(ci=>`
      <figure><img src="${ci.src}" alt="${ci.caption||''}"><figcaption>${ci.caption||''}</figcaption></figure>
    `).join('');
    document.getElementById('app').innerHTML = `
      <div class="card">
        <button class="btn ghost" data-back>← Voltar</button>
        <h2>${c.title}</h2>
        <img src="${c.scenarioImage}" class="case-img" alt="Cenário">
        <p class="small">${c.scenarioText}</p>
        <h3>Suspeitos</h3>
        <div class="suspects">${suspects}</div>
        <h3>Pistas</h3>
        <ul class="small">${(c.clueSets?.[0]?.clues||[]).map(cl=>`<li>${cl}</li>`).join('')}</ul>
        ${cluesImgs ? `<h3>Evidências visuais</h3><div class="clues-grid">${cluesImgs}</div>` : ''}
        <div class="card"><h3>Diálogo</h3>
          <div id="dialogue-box" class="small">Clique em um suspeito para conversar.</div>
        </div>
      </div>`;
    document.querySelector('[data-back]').addEventListener('click', UI.renderHub);
    document.querySelectorAll('.suspect').forEach(el=> el.addEventListener('click', ()=>{
      const who = el.getAttribute('data-suspect');
      const line = (c.dialogues||[]).find(d=>d.suspect===who);
      document.getElementById('dialogue-box').textContent = line? `${who}: ${line.text}` : `${who} não tem nada a declarar.`;
    }));
  },
  renderParentsPanel() { document.getElementById('app').innerHTML = `<div class="card"><h2>Painel dos Pais</h2><p class="small">Progresso salvo localmente no navegador.</p></div>`; },
  renderSkillTree() { document.getElementById('app').innerHTML = `<div class="card"><h2>Habilidades</h2><p class="small">Módulo educativo (em breve).</p></div>`; }
};
async function boot() {
  try { App.state.cases = await (await fetch('cases.json')).json(); }
  catch(e) { console.error(e); alert('Falha ao carregar casos.'); }
  UI.renderWelcome();
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('button[data-action]').forEach(btn=> btn.addEventListener('click', ()=>{
    const a = btn.getAttribute('data-action');
    switch(a){
      case 'go-welcome': UI.renderWelcome(); break;
      case 'go-hub': UI.renderHub(); break;
      case 'go-parents': UI.renderParentsPanel(); break;
      case 'go-skill-tree': UI.renderSkillTree(); break;
      case 'reset-progress': if(confirm('Tem certeza que deseja zerar o progresso?')) localStorage.removeItem('sherlock_bia'); break;
    }
  }));
  boot();
});
