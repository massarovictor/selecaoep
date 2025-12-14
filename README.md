<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SIS Seleção EEEP

App web (Vite + React + TypeScript) para processar inscrições do Google Forms e gerar listas de classificação por curso e modalidade (cotas), com exportação em PDF/XLS/DOC.

## O que o sistema faz
- Importa arquivos `CSV` ou `XLS/XLSX` (primeira aba) exportados do Google Forms.
- Calcula a nota final a partir das médias do 6º ao 9º ano e aplica critérios de desempate (idade, Português, Matemática).
- Organiza os candidatos por curso e listas (PCD, Pública/Privada e Centro/Ampla), exibindo **classificados** e **classificáveis**.
- Mostra uma aba de **Visão Geral** com estatísticas e notas de corte (último classificado) por curso/lista.
- Exporta o resultado em **PDF**, **Excel** e **Word**.

> Observação: o processamento é feito no navegador; os dados não precisam ser enviados para um servidor.

## Como rodar localmente
**Pré-requisito:** Node.js

1. Instale as dependências: `npm install`
2. Rode o servidor de desenvolvimento: `npm run dev`
3. Acesse: `http://localhost:3000`

Outros comandos úteis:
- Build: `npm run build`
- Preview do build: `npm run preview`

## Licença
MIT. Veja `LICENSE`.
