Dim FileSysObj
Dim ShellObj
Dim CurrentDirectory
Dim ShortcutFile
Set FileSysObj = CreateObject("Scripting.FileSystemObject")
Set ShellObj = CreateObject("WScript.Shell")
CurrentDirectory = ShellObj.CurrentDirectory
ShortcutFile = ShellObj.SpecialFolders("Startup") & + "\Proxiani.lnk"

If FileSysObj.FileExists(ShortcutFile) Then
 FileSysObj.DeleteFile ShortcutFile
End If

Set Shortcut = ShellObj.CreateShortcut(ShortcutFile)
Shortcut.WorkingDirectory = CurrentDirectory
Shortcut.TargetPath = CurrentDirectory + "\Start.vbs"
Shortcut.Arguments = "// -q"
Shortcut.Save

MsgBox "Auto start enabled.", 64, "Proxiani"
