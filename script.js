(function () {
  
  

  const $ = (s,r=document)=>r.querySelector(s); 
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const on=(e,ev,cb)=>e&&e.addEventListener(ev,cb);
  
  function toast(msg){ 
    let t=$('#toast'); 
    if(!t){ 
      t=document.createElement('div'); 
      t.id='toast'; 
      Object.assign(t.style,{position:'fixed',right:'16px',bottom:'16px',background:'rgba(0,0,0,.85)',color:'#fff',padding:'10px 14px',borderRadius:'10px',zIndex:9999,fontFamily:'system-ui,Arial'}); 
      document.body.appendChild(t);
    } 
    t.textContent=msg; 
    t.style.opacity='1'; 
    clearTimeout(t._h); 
    t._h=setTimeout(()=>t.style.opacity='0',2200); 
  }
  
  const STORE_KEY='sherlockbia_v20'; 
  let S={sessions:{},coins:0,stars:0,lastSeenVersion:'2.0'};
  
  function load(){try{const r=localStorage.getItem(STORE_KEY); if(r) Object.assign(S,JSON.parse(r));}catch(e){}}
  function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(S));}catch(e){}}
  
  // Função ensureShell() removida, pois a estrutura principal já está no index.html
  // A lógica de resetar progresso foi movida para a função boot()
  
  // Nova função para lidar com a navegação do header
  function handleHeaderNavigation(){
    const header = $('header');
    if(!header) return;
    header.onclick = (ev) => {
      const btn = ev.target.closest('.btn');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      switch(action){
        case 'go-welcome':
        case 'go-hub':
          UI.renderHome();
          break;
        case 'go-parents':
          toast('Painel dos Pais (Funcionalidade Futura)');
          break;
        case 'go-skill-tree':
          toast('Árvore de Habilidades (Funcionalidade Futura)');
          break;
        case 'reset-progress':
          if(confirm('Zerar progresso?')){ 
            S.sessions={}; 
            S.coins=0; 
            S.stars=0; 
            save(); 
            toast('Progresso zerado.'); 
            UI.renderHome(); 
          }
          break;
      }
    };
  }
  
  function setHUD(){ 
    const a=$('#hudStars'), b=$('#hudCoins'); 
    if(a) a.textContent=`⭐ ${S.stars}`; 
    if(b) b.textContent=`🪙 ${S.coins}`; 
  }
  
  let CASES = window.CASES || null;
  
  async function ensureCasesLoaded(){ 
    if(CASES && Array.isArray(CASES)) return true; 
    try{ 
      const res=await fetch('cases.json',{cache:'no-store'}); 
      if(!res.ok) throw 0; 
      CASES=await res.json(); 
      window.CASES=CASES; 
      return true; 
    }catch(e){ 
      toast('Nao foi possivel carregar os casos.'); 
      return false; 
    } 
  }
  
  function preloadImages(){ 
    const srcs=new Set(); 
    (CASES||[]).forEach(c=>{ 
      if(c.thumb) srcs.add(`assets/${c.thumb}`); 
      (c.scenes||[]).forEach(s=>s.bg && srcs.add(`assets/${s.bg}`)); 
      (c.clues||[]).forEach(cl=>cl.asset && srcs.add(`assets/${cl.asset}`)); 
    }); 
    srcs.forEach(s=>{const i=new Image(); i.src=s;}); 
  }
  
  // Nova função para mostrar o modal de "Verdade Revelada"
  function showTruthModal(title, content, evidence, isCorrect) {
    const modal = $('#truth-modal');
    const titleEl = $('#truth-title');
    const contentEl = $('#truth-content');
    const evidenceEl = $('#truth-evidence');
    
    titleEl.textContent = title;
    contentEl.innerHTML = content;
    
    if (evidence) {
      evidenceEl.innerHTML = `<strong>Pistas que confirmam:</strong><br>${evidence}`;
      evidenceEl.style.display = 'block';
    } else {
      evidenceEl.style.display = 'none';
    }
    
    // Adicionar cor ao título baseado no resultado
    if (isCorrect) {
      titleEl.style.color = '#10b981';
      titleEl.textContent = '✅ ' + title;
    } else {
      titleEl.style.color = '#ef4444';
      titleEl.textContent = '❌ ' + title;
    }
    
    modal.classList.add('show');
  }
  
  function closeTruthModal() {
    const modal = $('#truth-modal');
    modal.classList.remove('show');
  }
  
  const UI = {
    renderHome(){
      setHUD();
      const home=$('#home'), game=$('#game'); 
      if(home) home.style.display=''; 
      if(game) game.style.display='none';
      if (home) {
        home.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h2 style="font:600 18px/1.2 system-ui">Mapa de Casos</h2>
            <div class="mini" style="opacity:.8">Versao 2.0 Enhanced</div>
          </div>
          <div id="casesWrap" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))"></div>`;
        const wrap = $('#casesWrap', home);
        const VISIBLE = (CASES||[]).filter(c => c.published !== false && !c.variant);
        wrap.innerHTML = VISIBLE.map(c => `
          <article class="case-card">
            <header><strong>${c.title}</strong><span class="badge">Facil</span></header>
            <div class="thumb" style="background-image:url('assets/${c.thumb || 'school_hallway_cartoon.png'}')"></div>
            <div class="body">
              <p>${c.summary || ''}</p>
              <button class="btn" data-action="start-case" data-case-id="${c.id}">Investigar</button>
            </div>
          </article>`).join('');
        wrap.onclick = (ev)=>{ 
          const btn=ev.target.closest('[data-action="start-case"]'); 
          if(!btn) return; 
          const id=btn.getAttribute('data-case-id'); 
          Main.startCase(id); 
        };
      }
    },
    
    renderCase(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId); 
      if(!c){ 
        toast('Caso nao encontrado.'); 
        return UI.renderHome(); 
      }
      if(!S.sessions[caseId]){ 
        S.sessions[caseId]={ 
          caseId, 
          clues:[], 
          items:[], 
          suspectsTalked:[], 
          start:Date.now(), 
          timeSpent:0, 
          status:'active',
          connections:[] // Nova propriedade para rastrear conexões de evidências
        }; 
        save(); 
      }
      const home=$('#home'), game=$('#game'); 
      if(home) home.style.display='none'; 
      if(game) game.style.display='';
      game.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div><h2 style="font:600 18px/1.2 system-ui">${c.title}</h2><div class="mini" style="opacity:.8">${c.summary||''}</div></div>
          <div><button id="btnBackHome" class="btn">Voltar</button></div>
        </div>
        <div class="cols-3">
          <div>
            <div id="sceneToolbar" class="scene-toolbar" style="display:none">
              <label for="sceneSelect">Cena:</label>
              <select id="sceneSelect"></select>
            </div>
            <div id="sceneWrap" class="scene-wrap"><div id="sceneBg" class="scene-bg"></div></div>
          </div>
          <aside class="grid">
            <div class="panel"><strong>Pistas</strong><div id="cluesList" class="list" style="margin-top:8px"></div></div>
            <div class="panel"><strong>Inventario</strong><div id="invList" class="list" style="margin-top:8px"></div></div>
            <div class="panel"><strong>Suspeitos</strong><div id="suspectsList" class="list" style="margin-top:8px"></div></div>
          </aside>
          <aside class="grid">
            <div class="panel"><strong>Quadro de Evidências</strong><div id="evidenceBoard" class="evidence-board" style="margin-top:8px"></div></div>
            <div class="panel"><strong>Acusacao</strong><div id="accuseList" class="list" style="margin-top:8px"></div></div>
          </aside>
        </div>`;
      on($('#btnBackHome'), 'click', UI.renderHome);
      const hasScenes=Array.isArray(c.scenes)&&c.scenes.length>0;
      const tb=$('#sceneToolbar'), sel=$('#sceneSelect');
      if(hasScenes){ 
        tb.style.display=''; 
        sel.innerHTML=c.scenes.map(s=>`<option value="${s.id}">${s.id}</option>`).join(''); 
        sel.onchange=()=>{ 
          const sdef=c.scenes.find(x=>x.id===sel.value)||c.scenes[0]; 
          UI.renderScene(caseId, sdef); 
        }; 
        UI.renderScene(caseId, c.scenes[0]); 
      }
      UI.renderCluesAndInv(caseId); 
      UI.renderSuspects(caseId); 
      UI.renderAccuse(caseId);
      UI.renderEvidenceBoard(caseId); // Nova função
    },
    
    renderScene(caseId, sceneDef){
      const c=(CASES||[]).find(x=>x.id===caseId); 
      if(!c||!sceneDef) return;
      const sess=S.sessions[caseId]; 
      const bg=$('#sceneBg'); 
      bg.style.backgroundImage=`url('assets/${sceneDef.bg || c.thumb || 'school_hallway_cartoon.png'}')`;
      const wrap=$('#sceneWrap'); 
      $$('.hotspot', wrap).forEach(h=>h.remove());
      const sel=$('#sceneSelect'); 
      if(sel) sel.value=sceneDef.id;
      (sceneDef.hotspots||[]).forEach(hs=>{
        if(hs.requiresTalk && !sess.suspectsTalked.includes(hs.requiresTalk)) return;
        if(hs.requiresItem && !sess.items.includes(hs.requiresItem)) return;
        const el=document.createElement('div'); 
        el.className='hotspot';
        Object.assign(el.style,{left:hs.x+'%',top:hs.y+'%',width:hs.w+'%',height:hs.h+'%'});
        el.dataset.clueId=hs.clueId||''; 
        el.innerHTML=`<div class="ico">${hs.icon||'❔'}</div>`; 
        el.title=hs.clueId||'hotspot';
        el.onclick=()=>{
          if(!hs.clueId) return;
          const clue=(c.clues||[]).find(cl=>cl.id===hs.clueId); 
          if(!clue) return toast('Pista nao encontrada.');
          if(!sess.clues.includes(clue.id)){
            sess.clues.push(clue.id); 
            S.stars+=1; 
            S.coins+=1; 
            if(clue.isItem && !sess.items.includes(clue.id)) sess.items.push(clue.id);
            save(); 
            setHUD(); 
            toast('Pista coletada! +1⭐ +1🪙');
            const sid=sel?.value; 
            const sdef=(c.scenes||[]).find(x=>x.id===sid)||sceneDef; 
            if(sdef) UI.renderScene(caseId, sdef);
            UI.renderCluesAndInv(caseId);
            UI.renderEvidenceBoard(caseId);
          } else { 
            toast('Voce ja coletou esta pista.'); 
          }
        };
        wrap.appendChild(el);
      });
    },
    
    renderCluesAndInv(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId), sess=S.sessions[caseId];
      const cluesList=$('#cluesList'), invList=$('#invList');
      function line(t,mini){ 
        return `<div class="suspect"><div>${t}${mini?`<div class="mini">${mini}</div>`:''}</div></div>`; 
      }
      const collected=(c.clues||[]).filter(cl=>sess.clues.includes(cl.id));
      const pending=(c.clues||[]).filter(cl=>!sess.clues.includes(cl.id));
      cluesList.innerHTML=''; 
      if(collected.length){ 
        cluesList.innerHTML+=`<div class="pill">Coletadas (${collected.length})</div>`; 
        collected.forEach(cl=>{ 
          cluesList.innerHTML+=line(`✅ ${cl.text}`, cl.detail||''); 
        }); 
      }
      if(pending.length){ 
        cluesList.innerHTML+=`<div class="pill" style="margin-top:6px;">Pendentes (${pending.length})</div>`; 
        pending.forEach(cl=>{ 
          cluesList.innerHTML+=line(`⏳ ${cl.text}`, cl.detail? 'Descubra mais pistas...':'' ); 
        }); 
      }
      const items=(c.clues||[]).filter(cl=>cl.isItem && sess.items.includes(cl.id));
      invList.innerHTML= items.length ? items.map(it=>line(`🎒 ${it.text}`, it.detail||'')).join('') : `<div class="mini" style="opacity:.8">Sem itens ainda.</div>`;
    },
    
    renderSuspects(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId), sess=S.sessions[caseId], box=$('#suspectsList');
      box.innerHTML=(c.suspects||[]).map(s=>{ 
        const talked=sess.suspectsTalked.includes(s.id); 
        return `
        <div class="suspect">
          <div><div><strong>${s.name}</strong></div><div class="mini">${s.desc||''}</div></div>
          <div><button class="btn" data-action="talk" data-id="${s.id}" ${talked?'disabled':''}>${talked?'Conversado':'Conversar'}</button></div>
        </div>`; 
      }).join('');
      box.onclick=(ev)=>{ 
        const btn=ev.target.closest('[data-action="talk"]'); 
        if(!btn) return; 
        const sid=btn.getAttribute('data-id');
        if(!sess.suspectsTalked.includes(sid)){ 
          sess.suspectsTalked.push(sid); 
          save(); 
          toast('Conversa registrada.'); 
          UI.renderSuspects(caseId);
          const sel=$('#sceneSelect'); 
          const sdef=(c.scenes||[]).find(x=>x.id===sel?.value)||(c.scenes||[])[0]; 
          if(sdef) UI.renderScene(caseId, sdef); 
        } 
      };
    },
    
    renderEvidenceBoard(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId), sess=S.sessions[caseId];
      const board=$('#evidenceBoard');
      if (!board) return;
      
      const collected=(c.clues||[]).filter(cl=>sess.clues.includes(cl.id));
      board.innerHTML = collected.map(cl => {
        const isKey = cl.isKeyClue ? ' key' : '';
        const isConnected = sess.connections && sess.connections.includes(cl.id) ? ' connected' : '';
        return `<div class="evidence-item${isKey}${isConnected}" title="${cl.detail || ''}" data-clue-id="${cl.id}">
          ${cl.text}
          ${cl.isKeyClue ? ' 🔑' : ''}
        </div>`;
      }).join('');
    },
    
    renderAccuse(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId), box=$('#accuseList');
      box.innerHTML=(c.suspects||[]).map(s=>`
        <div class="suspect">
          <div><strong>${s.name}</strong></div>
          <div><button class="btn" data-action="accuse" data-id="${s.id}">Acusar</button></div>
        </div>`).join('');
      box.onclick=(ev)=>{ 
        const btn=ev.target.closest('[data-action="accuse"]'); 
        if(!btn) return; 
        const sid=btn.getAttribute('data-id');
        const suspect = (c.suspects||[]).find(x=>x.id===sid);
        const ok=confirm('Confirmar acusacao de '+suspect.name+'?'); 
        if(!ok) return;
        const right=c.solve && c.solve.culprit===sid; 
        if(right){ 
          S.stars+=3; 
          S.coins+=3; 
          save(); 
          setHUD(); 
          
          // Mostrar o modal de "Verdade Revelada" em vez de alert
          const evidence = (c.clues||[])
            .filter(cl => sess.clues.includes(cl.id))
            .map(cl => `• ${cl.text}`)
            .join('<br>');
          
          showTruthModal(
            'Caso Resolvido!',
            `<p><strong>${suspect.name}</strong> é o culpado!</p><p>${c.solve.reasonText || 'Excelente investigação!'}</p>`,
            evidence,
            true
          );
          
          // Voltar após fechar o modal
          on($('[data-action="close-truth-modal"]'), 'click', () => {
            closeTruthModal();
            UI.renderHome();
          });
        }
        else { 
          const correct = (c.suspects||[]).find(x=>x.id===c.solve.culprit);
          showTruthModal(
            'Acusação Incorreta',
            `<p>Hmm... isso não parece certo. <strong>${suspect.name}</strong> não é o culpado.</p><p>Revise o Quadro de Evidências e tente novamente!</p>`,
            null,
            false
          );
          
          on($('[data-action="close-truth-modal"]'), 'click', () => {
            closeTruthModal();
          });
        }
      };
    }
  };
  
  const Main = {
    startCase(id){
      const base=(CASES||[]).find(x=>x.id===id); 
      if(!base) return;
      if(base.isGroup){
        const sessKey=id; 
        const sess=S.sessions[sessKey] || (S.sessions[sessKey]={caseId:sessKey});
        if(!sess.variantId){
          const pool=(CASES||[]).filter(x=>x.group===base.group && x.variant);
          if(pool.length===0){ 
            toast('Sem variantes disponiveis.'); 
            return; 
          }
          const pick=pool[Math.floor(Math.random()*pool.length)]; 
          sess.variantId=pick.id; 
          save();
        }
        UI.renderCase(S.sessions[sessKey].variantId); 
        return;
      }
      UI.renderCase(id);
    }
  };
  
  async function boot(){ 
    load(); 
    setHUD(); // Atualiza o HUD no header
    handleHeaderNavigation(); // Adiciona o listener de navegação
    
    const ok=await ensureCasesLoaded(); 
    if(!ok) return; 
    preloadImages(); 
    UI.renderHome(); // Renderiza o conteúdo principal (Mapa de Casos)
    
    // Fechar modal de verdade ao clicar no botão
    on($('[data-action="close-truth-modal"]'), 'click', closeTruthModal);
    
    document.addEventListener('keydown', e=>{ 
      if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey)){ 
        e.preventDefault(); 
        if(confirm('Zerar progresso?')){ 
          S.sessions={}; 
          S.coins=0; 
          S.stars=0; 
          save(); 
          UI.renderHome(); 
        } 
      } 
    }); 
  }
  
  document.addEventListener('DOMContentLoaded', boot);
})();
  


