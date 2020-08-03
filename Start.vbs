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

CreateObject("WScript.Shell").Run "node .\src\main.js " & Trim(args), 0, True
