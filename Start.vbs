If WScript.Arguments.Count > 0 Then
 CreateObject("WScript.Shell").Run "npm start """ + WScript.Arguments(0) + """", 0
Else
 CreateObject("WScript.Shell").Run "npm start", 0
End If
