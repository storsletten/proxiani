# Proxiani
Proxiani is a proxy server designed to optimize communication between Miriani and VIP Mud. It also comes with features that enhance the gaming experience in conjunction with the Miriani Soundpack for VIP Mud.

## Installation
Download and install the latest recommended version of Node.js from [nodejs.org](https://nodejs.org/).
Node 10 or newer is required.

## Usage
If you would like to run Proxiani with a console window (mostly just for developers), then use:
```
$ npm start
```

If you prefer to run Proxiani without a console window (recommended for most users), then launch the file called Start.vbs that is located inside the Proxiani folder.

Then use VIP Mud to connect to:
- Host: localhost
- Port: 1234

Alternatively, if localhost doesn't work for some reason, then try the localhost IP address instead:
```
127.0.0.1
```

There are also some helpful VBScripts located in the root of this package:
- Start.vbs - Starts Proxiani without a console window.
- Enable Auto Start.vbs - Creates a Proxiani shortcut for Start.vbs in the startup folder.
- Disable Auto Start.vbs - Removes the Proxiani shortcut from the startup folder.

## Features
- Supports SSL/TLS for encrypting all communication with Miriani.
- Automatically reconnects to Miriani if network issues break the connection.
- Addresses an issue in VIP Mud that causes lines of text to randomly break.
- Improves stability for VIP Mud and the soundpack.
- Makes sms, smc, and other starmap commands lightning fast.
- Makes the conf command much faster.
- Creates clean and timestamped logs of incoming text from Miriani.
... and much more!

## Parameters
You can pass the following parameters to Proxiani:

- -q: Suppresses message boxes that indicate whether Proxiani started successfully or if another instance is already running.
- -d <directory>: Use this flag to set a user data directory for Proxiani.

Examples:
```
$ npm start -- -d C:\Users\MyName\Proxiani
```

The -- (double hyphen) tells npm to pass the subsequent parameters directly to Proxiani.

```
$ npm start -- -q -d ../Proxiani Data
```

When using relative paths with the -d flag, it will be relative to current working directory.

All these parameters can also be passed to Start.vbs if you would like to run Proxiani without a console window. The only difference is that you use // (double slash) instead of -- (double hyphen). For example:
```
$ .\Start.vbs // -q -d ../Proxiani Data
```
