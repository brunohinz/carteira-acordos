@echo off
pushd "%~dp0" >nul 2>nul
if errorlevel 1 (
    echo Nao consegui acessar a pasta do projeto.
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js nao foi encontrado neste computador.
    echo Abrindo o modo sem Node.js no navegador.
    start "" "%~dp0inicio.html"
    pause
    popd
    exit /b 0
)

for /f "delims=" %%N in ('where node') do (
    set "NODE_EXE=%%N"
    goto node_encontrado
)

:node_encontrado
start "" "http://127.0.0.1:4173/inicio.html"

echo Controle de acordos aberto no navegador.
echo Mantenha esta janela aberta enquanto estiver usando o site.
"%NODE_EXE%" "%~dp0servidor-local.js"
pause
popd
