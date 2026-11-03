# SóCraques 🇧🇷

**SóCraques** é uma plataforma completa para transmissão, gravação e estatísticas de peladas de futebol (society, salão e campo), com sincronização multi-câmera de celulares, corte automático de clipes de 20 segundos e leaderboard de artilharia e canetas.

Deploy ao vivo: [https://socraques.onrender.com/](https://socraques.onrender.com/)  
Repositório GitHub: [https://github.com/pandraus/socraques](https://github.com/pandraus/socraques)

---

## 🚀 Funcionalidades Principais

1. **Página Inicial (Landing Page):**
   - Apresentação completa com fluxo em 4 passos:
     1. Posicione 2 Celulares no Campo
     2. Sincronização com 1 Clique
     3. Marque Gols e Canetas ao Vivo
     4. Clipes & Tabela do Grupo
   - Comparativo Antes vs. Depois e FAQ dos peladeiros.
   - Logo clicável que retorna à Home de qualquer aba.

2. **Match Studio (Deck Tático Multi-Câmera):**
   - Alternância instantânea de ângulo: **Celular 1 (Meio de Campo)** e **Celular 2 (Atrás do Gol)**.
   - Micro-calibrador de sincronia de áudio/vídeo em passos de ±0.25s.
   - Linha do tempo de alta precisão com pinos clicáveis para pular direto para cada lance (gols e canetas).
   - Botão em destaque: **"Marcar Gol aos MM:SS"**.
   - Barra de transporte com play/pause, saltos de ±5s e seletor de velocidade (0.5x a 2.0x).

3. **Corte e Download Automático de Clipes (20 segundos):**
   - Para qualquer gol ou caneta marcada, o sistema corta exatamente **10 segundos antes e 10 segundos depois** do lance usando FFmpeg (`/api/clips/download`).
   - Botões de download direto em cada card no feed de lances.

4. **Tabela de Craques (Leaderboard):**
   - Rankings filtráveis por:
     - ⚽ **Mais Gols**
     - 🎯 **Mais Assistências**
     - 🪄 **Canetas Dadas**
     - 🫣 **Canetas Sofridas**
   - Pódio dos 3 melhores colocados e tabela completa.

5. **Celular Timer (`/live`):**
   - Interface rápida e otimizada para mobile para uso na beira do campo.
   - Cronômetro mestre de gravação e marcação instantânea de quem fez o gol, quem deu assistência e quem deu/tomou caneta.

6. **Gerenciamento de Jogadores & Upload de Vídeos:**
   - Adição individual ou em lote (copiar/colar lista de nomes).
   - Upload direto de vídeos (arrastar e soltar) ou seleção direta de arquivos na pasta do Mac via AirDrop.

---

## 🛠️ Arquitetura e Estrutura de Arquivos

```
socraques/
├── server.py                   # Servidor HTTP / API REST em Python (porta 8000 / $PORT)
├── pitchstat.db                # Banco de dados SQLite com tabelas: players, matches, goals, nutmegs
├── requirements.txt            # Dependências (legacy-cgi, etc.)
├── Procfile / render.yaml      # Configurações de deploy no Render.com
├── .python-version             # Versão do Python fixada (3.11.10)
├── static/
│   ├── index.html              # Aplicação principal (Landing Page + Match Studio + Tabela + Jogadores)
│   ├── live.html               # Interface mobile Celular Timer (/live)
│   ├── app.js                  # Lógica interativa, player de vídeo, scrubbing e chamadas de API
│   ├── i18n.js                 # Motor de internacionalização (padrão pt-br)
│   ├── style.css               # Tema e estilos Seleção Canarinho Edition
│   └── videos/                 # Diretório de vídeos e clipes de 20s cortados
└── .agents/
    └── rules.md                # Regras e contexto do projeto para o agente Antigravity
```

---

## 💻 Como Rodar Localmente

```bash
# 1. Navegue até o diretório do projeto
cd /Users/pandraus/.gemini/antigravity/scratch/socraques

# 2. Inicie o servidor
python3 server.py

# 3. Abra no navegador:
# Aplicação principal: http://localhost:8000
# Celular Timer:       http://localhost:8000/live
```
