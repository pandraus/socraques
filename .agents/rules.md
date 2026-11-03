# SóCraques - Regras & Diretrizes do Projeto

## Contexto do Projeto
- **Nome:** SóCraques (anteriormente PitchStat)
- **Repositório GitHub:** `https://github.com/pandraus/socraques`
- **Deploy:** Render.com (`https://socraques.onrender.com/`)
- **Conversa Original de Desenvolvimento:** ID `0f90d6f5-1803-4e88-a69c-58426e06bd7f`

## Paleta de Cores & Design Tokens (Seleção Canarinho Edition)
- Fundo & Superfícies: Deep Navy `#040916`, `#060D20`, `#0B1733`, bordas `#1A2E5A` e `#002776`.
- Destaque Principal: Amarelo Canarinho `#FFDF00` / `#FACC15` (botões principais, pinos de gol, destaques ativos).
- Telemetria & Status: Verde Esperança `#009B3A` / `#62df74`.
- Habilidades & Canetas: Azul Canarinho / Ciano `#002776` / `#00C2FF` e roxo suave para badges de drible.
- Tipografia: `Plus Jakarta Sans` para UI/títulos e `JetBrains Mono` para cronômetros, timecodes e códigos.

## Regras de Negócio e Implementação
- **Clipes de 20 segundos:** Toda gravação de gol ou caneta gera um clipe de 20s (10s antes e 10s depois) cortado via FFmpeg no backend (`/api/clips/download`).
- **Leaderboard:** Não utiliza `G+A`. As colunas oficiais são: Gols, Assistências, Canetas Dadas (`nutmegs_given`) e Canetas Sofridas (`nutmegs_taken`).
- **Nomenclatura do Timer:** Chamado de **Celular Timer** (rota `/live`), nunca "Sideline Live".
- **Idioma Padrão:** Português do Brasil (`pt-br`).
- **Crédito de Rodapé:** `© 2026 SóCraques Brasil. Feito por <a href="https://www.pandraus.com/">Paulo Andraus</a>`.
