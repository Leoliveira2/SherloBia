/* Sherlock Bia v1.9 – grupos com variações, seletor de cena e sessão por variante */
(function () {
  const $ = (s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const on=(e,ev,cb)=>e&&e.addEventListener(ev,cb);
  function toast(msg){ let t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; Object.assign(t.style,{position:'fixed',right:'16px',bottom:'16px',background:'rgba(0,0,0,.85)',color:'#fff',padding:'10px 14px',borderRadius:'10px',zIndex:9999,fontFamily:'system-ui,Arial'}); document.body.appendChild(t);} t.textContent=msg; t.style.opacity='1'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.opacity='0',2200); }
  const STORE_KEY='sherlockbia_v19'; let S={sessions:{},coins:0,stars:0,lastSeenVersion:'1.9'};
  function load(){try{const r=localStorage.getItem(STORE_KEY); if(r) Object.assign(S,JSON.parse(r));}catch(e){}}
  function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(S));}catch(e){}}
  function ensureShell(){ if(!$('#app')){ const app=document.createElement('div'); app.id='app'; app.style.maxWidth='1100px'; app.style.margin='0 auto'; app.style.padding='16px'; app.innerHTML=`
        <header id="topbar" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;">
          <h1 style="font:600 22px/1.2 system-ui">Sherlock Bia</h1>
          <div style="display:flex;gap:8px;align-items:center;">
            <span id="hudStars">⭐ 0</span>
            <span id="hudCoins">🪙 0</span>
            <button id="btnReset" class="btn">Zerar progresso</button>
          </div>
        </header>
        <main id="main">
          <section id="home"></section>
          <section id="game" style="display:none;"></section>
        </main>`; document.body.appendChild(app);
        const css=document.createElement('style'); css.textContent=`
        .btn{cursor:pointer;border:1px solid #1f2b44;background:#0f172a;color:#e2e8f0;border-radius:10px;padding:8px 12px}
        .grid{display:grid;gap:12px}
        .case-card{border:1px solid #1f2b44;border-radius:14px;overflow:hidden;background:#0b1220}
        .case-card header{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#0f172a}
        .case-card .thumb{width:100%;aspect-ratio:16/9;background-size:cover;background-position:center}
        .case-card .body{padding:10px 12px}
        .cols{display:grid;grid-template-columns:2fr 1fr;gap:12px}
        .panel{border:1px solid #1f2b44;border-radius:14px;background:#0b1220;padding:10px 12px}
        .scene-wrap{position:relative;border-radius:12px;overflow:hidden;height:420px;background:#0a0f1a;border:1px solid #1f2b44}
        .scene-bg{position:absolute;inset:0;background-size:cover;background-position:center}
        .hotspot{position:absolute;border:2px dashed #66ccff44;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
        .hotspot .ico{background:#0f172acc;padding:4px 6px;border-radius:8px}
        .scene-toolbar{display:flex;gap:8px;align-items:center;margin:0 0 10px 0}
        .scene-toolbar select{background:#0f172a;color:#e2e8f0;border:1px solid #1f2b44;border-radius:10px;padding:6px 10px}
        .list{display:flex;flex-direction:column;gap:8px}
        .badge{font-size:12px;background:#13223d;color:#bcd3ff;border:1px solid #1f2b44;padding:2px 6px;border-radius:999px}
        .suspect{display:flex;gap:8px;align-items:center;justify-content:space-between;border:1px dashed #1f2b44;border-radius:10px;padding:6px 8px}
        .pill{padding:2px 8px;border-radius:999px;border:1px solid #1f2b44;background:#0f172a}
        .mini{font-size:12px;opacity:.9}`; document.head.appendChild(css); }
      const btn=$('#btnReset'); btn && btn.addEventListener('click', ()=>{ if(confirm('Zerar progresso?')){ S.sessions={}; S.coins=0; S.stars=0; save(); toast('Progresso zerado.'); UI.renderHome(); } });
  }
  function setHUD(){ const a=$('#hudStars'), b=$('#hudCoins'); if(a) a.textContent=`⭐ ${S.stars}`; if(b) b.textContent=`🪙 ${S.coins}`; }
  let CASES = window.CASES || null;
  async function ensureCasesLoaded(){ if(CASES && Array.isArray(CASES)) return true; try{ const res=await fetch('cases.json',{cache:'no-store'}); if(!res.ok) throw 0; CASES=await res.json(); window.CASES=CASES; return true; }catch(e){ toast('Nao foi possivel carregar os casos.'); return false; } }
  function preloadImages(){ const srcs=new Set(); (CASES||[]).forEach(c=>{ if(c.thumb) srcs.add(`assets/${c.thumb}`); (c.scenes||[]).forEach(s=>s.bg && srcs.add(`assets/${s.bg}`)); (c.clues||[]).forEach(cl=>cl.asset && srcs.add(`assets/${cl.asset}`)); }); srcs.forEach(s=>{const i=new Image(); i.src=s;}); }
  const UI = {
    renderHome(){
      setHUD();
      const home=$('#home'), game=$('#game'); if(home) home.style.display=''; if(game) game.style.display='none';
      if (home) {
        home.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h2 style="font:600 18px/1.2 system-ui">Mapa de Casos</h2>
            <div class="mini" style="opacity:.8">Versao 1.9</div>
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
        wrap.onclick = (ev)=>{ const btn=ev.target.closest('[data-action="start-case"]'); if(!btn) return; const id=btn.getAttribute('data-case-id'); Main.startCase(id); };
      }
    },
    renderCase(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId); if(!c){ toast('Caso nao encontrado.'); return UI.renderHome(); }
      if(!S.sessions[caseId]){ S.sessions[caseId]={ caseId, clues:[], items:[], suspectsTalked:[], start:Date.now(), timeSpent:0, status:'active' }; save(); }
      const home=$('#home'), game=$('#game'); if(home) home.style.display='none'; if(game) game.style.display='';
      game.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div><h2 style="font:600 18px/1.2 system-ui">${c.title}</h2><div class="mini" style="opacity:.8">${c.summary||''}</div></div>
          <div><button id="btnBackHome" class="btn">Voltar</button></div>
        </div>
        <div class="cols">
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
            <div class="panel"><strong>Acusacao</strong><div id="accuseList" class="list" style="margin-top:8px"></div></div>
          </aside>
        </div>`;
      on($('#btnBackHome'), 'click', UI.renderHome);
      const hasScenes=Array.isArray(c.scenes)&&c.scenes.length>0;
      const tb=$('#sceneToolbar'), sel=$('#sceneSelect');
      if(hasScenes){ tb.style.display=''; sel.innerHTML=c.scenes.map(s=>`<option value="${s.id}">${s.id}</option>`).join(''); sel.onchange=()=>{ const sdef=c.scenes.find(x=>x.id===sel.value)||c.scenes[0]; UI.renderScene(caseId, sdef); }; UI.renderScene(caseId, c.scenes[0]); }
      UI.renderCluesAndInv(caseId); UI.renderSuspects(caseId); UI.renderAccuse(caseId);
    },
    renderScene(caseId, sceneDef){
      const c=(CASES||[]).find(x=>x.id===caseId); if(!c||!sceneDef) return;
      const sess=S.sessions[caseId]; const bg=$('#sceneBg'); bg.style.backgroundImage=`url('assets/${sceneDef.bg || c.thumb || 'school_hallway_cartoon.png'}')`;
      const wrap=$('#sceneWrap'); $$('.hotspot', wrap).forEach(h=>h.remove());
      const sel=$('#sceneSelect'); if(sel) sel.value=sceneDef.id;
      (sceneDef.hotspots||[]).forEach(hs=>{
        if(hs.requiresTalk && !sess.suspectsTalked.includes(hs.requiresTalk)) return;
        if(hs.requiresItem && !sess.items.includes(hs.requiresItem)) return;
        const el=document.createElement('div'); el.className='hotspot';
        Object.assign(el.style,{left:hs.x+'%',top:hs.y+'%',width:hs.w+'%',height:hs.h+'%'});
        el.dataset.clueId=hs.clueId||''; el.innerHTML=`<div class="ico">${hs.icon||'❔'}</div>`; el.title=hs.clueId||'hotspot';
        el.onclick=()=>{
          if(!hs.clueId) return;
          const clue=(c.clues||[]).find(cl=>cl.id===hs.clueId); if(!clue) return toast('Pista nao encontrada.');
          if(!sess.clues.includes(clue.id)){
            sess.clues.push(clue.id); S.stars+=1; S.coins+=1; if(clue.isItem && !sess.items.includes(clue.id)) sess.items.push(clue.id);
            save(); setHUD(); toast('Pista coletada! +1⭐ +1🪙');
            const sid=sel?.value; const sdef=(c.scenes||[]).find(x=>x.id===sid)||sceneDef; if(sdef) UI.renderScene(caseId, sdef);
            UI.renderCluesAndInv(caseId);
          } else { toast('Voce ja coletou esta pista.'); }
        };
        wrap.appendChild(el);
      });
    },
    renderCluesAndInv(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId), sess=S.sessions[caseId];
      const cluesList=$('#cluesList'), invList=$('#invList');
      function line(t,mini){ return `<div class="suspect"><div>${t}${mini?`<div class="mini">${mini}</div>`:''}</div></div>`; }
      const collected=(c.clues||[]).filter(cl=>sess.clues.includes(cl.id));
      const pending=(c.clues||[]).filter(cl=>!sess.clues.includes(cl.id));
      cluesList.innerHTML=''; if(collected.length){ cluesList.innerHTML+=`<div class="pill">Coletadas (${collected.length})</div>`; collected.forEach(cl=>{ cluesList.innerHTML+=line(`✅ ${cl.text}`, cl.detail||''); }); }
      if(pending.length){ cluesList.innerHTML+=`<div class="pill" style="margin-top:6px;">Pendentes (${pending.length})</div>`; pending.forEach(cl=>{ cluesList.innerHTML+=line(`⏳ ${cl.text}`, cl.detail? 'Descubra mais pistas...':'' ); }); }
      const items=(c.clues||[]).filter(cl=>cl.isItem && sess.items.includes(cl.id));
      invList.innerHTML= items.length ? items.map(it=>line(`🎒 ${it.text}`, it.detail||'')).join('') : `<div class="mini" style="opacity:.8">Sem itens ainda.</div>`;
    },
    renderSuspects(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId), sess=S.sessions[caseId], box=$('#suspectsList');
      box.innerHTML=(c.suspects||[]).map(s=>{ const talked=sess.suspectsTalked.includes(s.id); return `
        <div class="suspect">
          <div><div><strong>${s.name}</strong></div><div class="mini">${s.desc||''}</div></div>
          <div><button class="btn" data-action="talk" data-id="${s.id}" ${talked?'disabled':''}>${talked?'Conversado':'Conversar'}</button></div>
        </div>`; }).join('');
      box.onclick=(ev)=>{ const btn=ev.target.closest('[data-action="talk"]'); if(!btn) return; const sid=btn.getAttribute('data-id');
        if(!sess.suspectsTalked.includes(sid)){ sess.suspectsTalked.push(sid); save(); toast('Conversa registrada.'); UI.renderSuspects(caseId);
          const sel=$('#sceneSelect'); const sdef=(c.scenes||[]).find(x=>x.id===sel?.value)||(c.scenes||[])[0]; if(sdef) UI.renderScene(caseId, sdef); } };
    },
    renderAccuse(caseId){
      const c=(CASES||[]).find(x=>x.id===caseId), box=$('#accuseList');
      box.innerHTML=(c.suspects||[]).map(s=>`
        <div class="suspect">
          <div><strong>${s.name}</strong></div>
          <div><button class="btn" data-action="accuse" data-id="${s.id}">Acusar</button></div>
        </div>`).join('');
      box.onclick=(ev)=>{ const btn=ev.target.closest('[data-action="accuse"]'); if(!btn) return; const sid=btn.getAttribute('data-id');
        const ok=confirm('Confirmar acusacao de '+((c.suspects||[]).find(x=>x.id===sid)?.name||sid)+'?'); if(!ok) return;
        const right=c.solve && c.solve.culprit===sid; if(right){ S.stars+=3; S.coins+=3; save(); setHUD(); alert('Parabens! Voce resolveu o caso!\n\n'+(c.solve.reasonText||'')); UI.renderHome(); }
        else toast('Hmmm... isso nao parece certo. Continue investigando.'); };
    }
  };
  const Main = {
    startCase(id){
      const base=(CASES||[]).find(x=>x.id===id); if(!base) return;
      if(base.isGroup){
        const sessKey=id; const sess=S.sessions[sessKey] || (S.sessions[sessKey]={caseId:sessKey});
        if(!sess.variantId){
          const pool=(CASES||[]).filter(x=>x.group===base.group && x.variant);
          if(pool.length===0){ toast('Sem variantes disponiveis.'); return; }
          const pick=pool[Math.floor(Math.random()*pool.length)]; sess.variantId=pick.id; save();
        }
        UI.renderCase(S.sessions[sessKey].variantId); return;
      }
      UI.renderCase(id);
    }
  };
  async function boot(){ load(); ensureShell(); setHUD(); const ok=await ensureCasesLoaded(); if(!ok) return; preloadImages(); UI.renderHome();
    document.addEventListener('keydown', e=>{ if(e.key.toLowerCase()==='z' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); if(confirm('Zerar progresso?')){ S.sessions={}; S.coins=0; S.stars=0; save(); UI.renderHome(); } } }); }
  document.addEventListener('DOMContentLoaded', boot);
})();