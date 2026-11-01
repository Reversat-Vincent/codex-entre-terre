@echo off
rem Lance la session du chef de projet du Codex de l'Entre-terre (voir CLAUDE.md).
rem
rem --setting-sources project,local : ignore ~/.claude/settings.json pour cette session.
rem   Sa variable CLAUDE_CODE_EFFORT_LEVEL=max imposerait sinon l'effort max a tous les
rem   sous-agents, alors que chacun a son propre effort dans .claude/agents/.
rem --model opus --effort max : le chef de projet reste sur Opus en effort max.
rem --permission-mode auto : pas de demande d'autorisation pour les actions courantes.
rem Les arguments ajoutes sont transmis a claude.
rem
rem Utilisation, depuis ce dossier :
rem   lancer-dev.cmd             nouvelle session, puis demander "Lance le developpement selon CLAUDE.md"
rem   lancer-dev.cmd --continue  reprend la derniere conversation du dossier
rem Limite d'usage : Claude Code reprend seul a la reinitialisation si la session reste ouverte.
rem   Cas particuliers (veille, limite hebdomadaire) : https://code.claude.com/docs/en/interactive-mode

rem Se placer dans le dossier du projet, meme en cas de lancement par double-clic.
cd /d "%~dp0"

rem Retirer aussi la variable si elle est un jour definie dans Windows.
set "CLAUDE_CODE_EFFORT_LEVEL="

claude --setting-sources project,local --model opus --effort max --permission-mode auto %*
