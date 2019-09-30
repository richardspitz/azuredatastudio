:: Runs unit tests for Extensions

setlocal

pushd %~dp0\..

set VSCODEUSERDATADIR=%TMP%\adsuser-%RANDOM%-%TIME:~6,5%
set VSCODEEXTENSIONSDIR=%TMP%\adsext-%RANDOM%-%TIME:~6,5%
echo %VSCODEUSERDATADIR%
echo %VSCODEEXTENSIONSDIR%
@echo OFF

REM echo starting admin tool extension windows tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\admin-tool-ext-win --extensionTestsPath=%~dp0\..\extensions\admin-tool-ext-win\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --disableExtensions --remote-debugging-port=9222
REM echo starting agent tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\agent --extensionTestsPath=%~dp0\..\extensions\agent\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --remote-debugging-port=9222
REM echo starting azurecore tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\azurecore --extensionTestsPath=%~dp0\..\extensions\azurecore\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --remote-debugging-port=9222
REM echo starting cms tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\cms --extensionTestsPath=%~dp0\..\extensions\cms\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --remote-debugging-port=9222
REM echo starting dacpac tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\dacpac --extensionTestsPath=%~dp0\..\extensions\dacpac\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --remote-debugging-port=9222
REM echo starting schema compare tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\schema-compare --extensionTestsPath=%~dp0\..\extensions\schema-compare\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --remote-debugging-port=9222
REM echo starting notebook tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\notebook --extensionTestsPath=%~dp0\..\extensions\notebook\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --remote-debugging-port=9222
REM echo starting resource deployment tests
REM call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\resource-deployment --extensionTestsPath=%~dp0\..\extensions\resource-deployment\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --remote-debugging-port=9222
echo starting markdown test
call .\scripts\code.bat --extensionDevelopmentPath=%~dp0\..\extensions\markdown-language-features --extensionTestsPath=%~dp0\..\extensions\markdown-language-features\out\test --user-data-dir=%VSCODEUSERDATADIR% --extensions-dir=%VSCODEEXTENSIONSDIR% --disable-telemetry --disable-crash-reporter --disable-updates --disable-extensions --disable-inspect

if %errorlevel% neq 0 exit /b %errorlevel%

rmdir /s /q %VSCODEUSERDATADIR%
rmdir /s /q %VSCODEEXTENSIONSDIR%

popd

endlocal
