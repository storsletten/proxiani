Dim ShellObj
Dim CurrentDirectory
Dim ShortcutFile
Set ShellObj = CreateObject("WScript.Shell")
CurrentDirectory = ShellObj.CurrentDirectory
ShortcutFile = ShellObj.SpecialFolders("Startup") & + "\Proxiani.lnk"

Set Shortcut = ShellObj.CreateShortcut(ShortcutFile)
Shortcut.WorkingDirectory = CurrentDirectory
Shortcut.TargetPath = CurrentDirectory + "\Start.vbs"
Shortcut.Save

MsgBox "Enabled auto start for Proxiani.", 64, "Proxiani"
