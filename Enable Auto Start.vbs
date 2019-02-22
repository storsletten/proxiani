Dim ShellObj
Dim CurrentDirectory
Dim ShortcutFile
Set ShellObj = CreateObject("WScript.Shell")
CurrentDirectory = ShellObj.CurrentDirectory
ShortcutFile = ShellObj.SpecialFolders("Startup") & + "\Proxiani.lnk"

Set Shortcut = ShellObj.CreateShortcut(ShortcutFile)
Shortcut.WorkingDirectory = CurrentDirectory
Shortcut.TargetPath = CurrentDirectory + "\Start.vbs"
Shortcut.Arguments = "// -q"
Shortcut.Save

MsgBox "Auto start enabled.", 64, "Proxiani"
