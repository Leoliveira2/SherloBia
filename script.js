// Estado e utilidades
const Storage = {
  load: () => JSON.parse(localStorage.getItem("sherlock_bia") || "{}"),
  save: (data) => localStorage.setItem("sherlock_bia", JSON.stringify(data))
};

const App = {
  state: {
    cases: [],
    unlockedSkills: {}
  },
  icons: {
  "Bia": "assets/icons/bia.png",
  "Sofia": "assets/icons/sofia.png",
  "Prof. Química": "assets/icons/prof_quimica.png",
  "Prof. Ciências": "assets/icons/prof_ciencias.png",
  "Programador Gui": "assets/icons/programador_gui.png",
  "Treinador Marcos": "assets/icons/treinador_marcos.png",
  "Zelador Carlos": "assets/icons/zelador_carlos.png",
  "__default__": "assets/icons/default.png",
  "Diretor Fernando": "assets/icons/diretor_fernando.png",
  "Pedro": "assets/icons/pedro.png",
  "Prof. Biologia": "assets/icons/prof_biologia.png",
  "Rival Esportivo": "assets/icons/rival_esportivo.png",
  "Monitora Ana": "assets/icons/monitora_ana.png",
  "Leo": "assets/icons/leo.png",
  "Faxineiro Rui": "assets/icons/faxineiro_rui.png",
  "Cientista Mirim": "assets/icons/cientista_mirim.png",
  "Jardineiro João": "assets/icons/jardineiro_joao.png",
  "Assistente de Laboratório": "assets/icons/assistente_de_laboratorio.png",
  "Historiador Local": "assets/icons/historiador_local.png",
  "Aluna Rita": "assets/icons/aluna_rita.png",
  "Zeladora Maria": "assets/icons/zeladora_maria.png",
  "Diretora Helena": "assets/icons/diretora_helena.png",
  "Cozinheira Ana": "assets/icons/cozinheira_ana.png",
  "Gêmeas Gabi e Gigi": "assets/icons/gemeas_gabi_e_gigi.png",
  "Prof. Carla": "assets/icons/prof_carla.png",
  "Estudante Gourmet": "assets/icons/estudante_gourmet.png",
  "Ex-Aluno Nostálgico": "assets/icons/ex_aluno_nostalgico.png",
  "Prof. Arthur": "assets/icons/prof_arthur.png",
  "Aluno Traquinas": "assets/icons/aluno_traquinas.png",
  "Clara": "assets/icons/clara.png",
  "Atleta Campeão": "assets/icons/atleta_campeao.png"
}
};

// Notificações simples
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast'; el.textContent = msg;
  document.body.appendChild(el);
  el.style.display='block';
  setTimeout(()=>{ el.remove(); }, 2000);
}

function iconFor(name) {
  const map = App.icons;
  return map[name] || map["__default__"];
}

// UI renderers
const UI = {
  renderWelcome() {
    document.getElementById('app').innerHTML = `
      <div class="card">
        <h2>Bem-vindo(a) ao Sherlock Bia!</h2>
        <p class="small">Vá em <b>Mapa de Casos</b> para escolher um cenário e iniciar sua investigação.</p>
      </div>`;
  },
  renderHub() {
    const list = App.state.cases.map((c,i)=>`
      <div class="card">
        <h3>{}c.title</h3>
        <div class="grid grid-3">
          <img src="${c.scenarioImage}" alt="Cenário: ${c.title}" class="case-img">
          <div>
            <p>${c.scenarioText}</p>
            <button class="btn" data-open-case="${i}">Investigar</button>
          </div>
        </div>
      </div>`).join('');
    document.getElementById('app').innerHTML = list || '<div class="card">Sem casos carregados.</div>';
    document.querySelectorAll('[data-open-case]').forEach(btn=>{
      btn.addEventListener('click', ()=> UI.renderCase(parseInt(btn.getAttribute('data-open-case'))));
    });
  },
  renderCase(idx) {
    const c = App.state.cases[idx];
    if(!c) return;
    const suspects = c.baseSuspects.map(s=>`
      <div class="suspect" data-suspect="${s.name}">
        <img src="${iconFor(s.name)}" alt="${s.name}">
        <div>${s.name}</div>
      </div>
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
        <div class="card">
          <h3>Diálogo</h3>
          <div id="dialogue-box" class="small">Clique em um suspeito para conversar.</div>
        </div>
      </div>`;
    document.querySelector('[data-back]').addEventListener('click', UI.renderHub);
    document.querySelectorAll('.suspect').forEach(el=>{
      el.addEventListener('click', ()=>{
        const who = el.getAttribute('data-suspect');
        const line = (c.dialogues||[]).find(d=>d.suspect===who);
        document.getElementById('dialogue-box').textContent = line? `${who}: ${line.text}` : `${who} não tem nada a declarar.`;
      });
    });
  },
  renderParentsPanel() {
    document.getElementById('app').innerHTML = `
      <div class="card"><h2>Painel dos Pais</h2>
      <p class="small">Progresso salvo no navegador. Você pode limpar em "Zerar Progresso".</p></div>`;
  },
  renderSkillTree() {
    const skills = Object.keys(App.state.unlockedSkills).length || 0;
    document.getElementById('app').innerHTML = `
      <div class="card"><h2>Habilidades</h2>
      <p class="small">Habilidades desbloqueadas: ${skills}</p></div>`;
  }
};

// Carregar casos e iniciar
async function boot() {
  try {
    const resp = await fetch('cases.json');
    App.state.cases = await resp.json();
  } catch(e) {
    console.error(e);
    toast('Falha ao carregar casos.');
  }
  UI.renderWelcome();
}

document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('button[data-action]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const a = btn.getAttribute('data-action');
      switch(a){
        case 'go-welcome': UI.renderWelcome(); break;
        case 'go-hub': UI.renderHub(); break;
        case 'go-parents': UI.renderParentsPanel(); break;
        case 'go-skill-tree': UI.renderSkillTree(); break;
        case 'reset-progress':
          if(confirm('Tem certeza que deseja zerar o progresso?')){ localStorage.removeItem('sherlock_bia'); toast('Progresso limpo'); }
          break;
      }
    });
  });
  boot();
});
