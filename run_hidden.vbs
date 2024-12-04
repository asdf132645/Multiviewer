Set WshShell = CreateObject("WScript.Shell")

' LOCALAPPDATA 환경 변수 가져오기
localAppData = WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%")

' 실행할 경로 설정
exePath = localAppData & "\Programs\UIMD\web\viewer\viewerServer.exe"

' 프로그램 실행
WshShell.Run exePath, 0, False
