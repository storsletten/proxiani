Function qq(str)
 qq = Chr(34) & str & Chr(34)
End Function

args = ""
With WScript.Arguments
 For Each arg in .Named
  args = args & " /" & arg & ":" & qq(.Named(arg))
 Next
 For Each arg in .Unnamed
  args = args & " " & qq(arg)
 Next
End With

On Error Resume Next
CreateObject("WScript.Shell").Run "node .\src\main.js " & Trim(args), 0, True

If Err.Number <> 0 Then
 MsgBox "Couldn't start Proxiani. Please make sure that NodeJS is installed and then try again.", 64, "Proxiani"
 Err.Clear
End If
