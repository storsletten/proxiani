Dim FileSysObj
Dim ShellObj
Dim ShortcutFile
Set FileSysObj = CreateObject("Scripting.FileSystemObject")
Set ShellObj = CreateObject("WScript.Shell")
ShortcutFile = ShellObj.SpecialFolders("Startup") & + "\Proxiani.lnk"

If FileSysObj.FileExists(ShortcutFile) Then
 FileSysObj.DeleteFile ShortcutFile
 MsgBox "Disabled auto start for Proxiani.", 64, "Proxiani"
Else
 MsgBox "Auto start for Proxiani is already disabled.", 64, "Proxiani"
End If
