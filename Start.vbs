If WScript.Arguments.Count > 0 Then
 CreateObject("WScript.Shell").Run "node ./src/main.js """ + WScript.Arguments(0) + """", 0
Else
 CreateObject("WScript.Shell").Run "node ./src/main.js", 0
End If
