# Sherlock Bia v1.4 - Cenas Cartoonizadas

## Descrição

Esta é uma versão melhorada do jogo Sherlock Bia que implementa **visual de cartoon realista** que se adapta dinamicamente ao tema/cenário sendo apresentado. Cada caso agora possui cenários detalhados em formato cartoon que correspondem ao ambiente da investigação.

## Principais Melhorias

### 🎨 Visual Cartoon Realista
- **Cenas Dinâmicas**: Cada caso carrega automaticamente uma imagem de fundo em estilo cartoon realista baseada no cenário
- **Biblioteca**: Ambiente acolhedor com estantes cheias de livros e iluminação natural
- **Corredor da Escola**: Corredor vibrante com armários coloridos e janelas
- **Cozinha**: Cozinha detalhada com fogão, geladeira, armários e mesa com bolo
- **Saguão**: Entrada principal da escola com vitrine de troféus

### 🔧 Melhorias Técnicas
- **Sistema de Cenas Aprimorado**: Novo módulo `SceneRenderer` que gerencia backgrounds cartoon
- **CSS Melhorado**: Novos estilos para integração perfeita entre imagens cartoon e elementos SVG
- **Hotspots Aprimorados**: Elementos interativos com backdrop-filter para melhor visibilidade
- **Responsividade**: Interface adaptada para diferentes tamanhos de tela

### 🎮 Funcionalidades Mantidas
- Sistema completo de investigação com pistas, diálogos e acusações
- Progresso do jogador com pontos, moedas e medalhas
- Painel dos pais para acompanhamento
- Sistema de cifras e quebra-cabeças
- Interface moderna e intuitiva

## Arquivos Incluídos

- `index.html` - SPA principal
- `style.css` - Estilos globais
- `script.js` - Lógica da investigação, cenas e diálogos
- `cases.json` - Casos e pistas em formato JSON
- `assets/` + arquivos PNG na raiz - Imagens de cenários e personagens

## Como Usar

1. **Extrair os arquivos**: Descompacte todos os arquivos em uma pasta
2. **Servir localmente**: Rode um servidor estático na raiz (ex.: `python3 -m http.server 8000`)
3. **Abrir no navegador**: Acesse `http://localhost:8000/index.html`
4. **Começar a jogar**: Clique em "Começar Investigação" e explore os casos com os cenários cartoon

## Publicar no Vercel

O projeto é totalmente estático. Você pode publicar de duas formas:

1. **Conectar ao GitHub** (recomendado):
   - Crie um projeto no Vercel apontando para este repositório.
   - Selecione o framework "Other" e deixe o comando de build vazio.
   - Defina o diretório de saída como `.` (raiz) ou `public/` se mover os arquivos para lá.
   - Cada push no GitHub gera um deploy automático.

2. **Upload manual**:
   - Baixe os arquivos (`index.html`, `style.css`, `script.js`, `cases.json` e as imagens).
   - No painel do Vercel, crie um projeto estático e arraste todos os arquivos para o upload.
   - O Vercel servirá `index.html` na raiz, carregando os demais recursos de forma relativa.

## Compatibilidade

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Dispositivos móveis (responsivo)

## Recursos Visuais

### Antes vs Depois
- **Antes**: Cenários simples em SVG com elementos básicos
- **Depois**: Cenários ricos em cartoon realista com profundidade e detalhes

### Adaptação Dinâmica
O sistema automaticamente carrega a imagem de fundo apropriada baseada no tipo de cena:
- `corridor` → Corredor da escola
- `kitchen` → Cozinha/Salão de festas  
- `hall` → Saguão com vitrine de troféus
- `library` → Biblioteca (para casos futuros)

## Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Estilos modernos com gradientes e transições
- **JavaScript ES6+**: Lógica modular e orientada a objetos
- **SVG**: Elementos interativos sobrepostos
- **PNG**: Imagens de alta qualidade para backgrounds

## Notas de Desenvolvimento

- As imagens cartoon foram geradas especificamente para cada ambiente
- O sistema é extensível para novos tipos de cena
- Mantém compatibilidade total com o código original
- Performance otimizada com carregamento eficiente de imagens

---

**Versão**: 1.4  
**Data**: Agosto 2025  
**Autor**: Melhorado com IA para visual cartoon realista

