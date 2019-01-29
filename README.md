# Proxiani
Proxiani is a proxy server designed to optimize communication between Miriani and VIP Mud. It also comes with features that enhance the gaming experience in conjunction with the Miriani Soundpack for VIP Mud.

## Install

```
$ npm install proxiani
```

## Usage

```
$ npm start
```

Then use VIP Mud to connect to:
- Host: localhost
- Port: 1234

There are also some helpful VBScripts located in the root of this module:
- Start.vbs - Starts Proxiani without a console window.
- Enable Auto Start.vbs - Creates a Proxiani shortcut for Start.vbs in the startup folder.
- Disable Auto Start.vbs - Removes the Proxiani shortcut from the startup folder.

## Features
- Supports SSL/TLS for encrypting all communication with Miriani.
- Automatically reconnects to Miriani if network issues break the connection.
- Addresses an issue in VIP Mud that causes lines of text to randomly break.
- Improves stability for VIP Mud and the soundpack.
- Makes sms, smc, and other starmap commands lightning fast.
- Addresses issues with VIP Mud not managing to load the soundpack after connecting to Miriani.
- Makes the conf command much faster.
- Creates clean and timestamped logs of incoming text from Miriani.
... and much more!
