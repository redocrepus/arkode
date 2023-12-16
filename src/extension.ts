// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as os from 'os';
import * as vscode from 'vscode';
//import * as record from 'node-record-lpcm16';
// const record = require('node-record-lpcm16');
import { exec, ExecOptions } from 'child_process';


import * as fs from 'fs';
import * as path from 'path';
import { error } from 'console';





let isRecording = false;
let PATH = "c:/dev/ahk-whisper-paste/bin/fmedia-1.31-windows-x64/fmedia";
const options: ExecOptions = {
	env: {"PATH": PATH }
};


let audioFilePath: string;

function startRecording() {

	const homeDir = os.homedir();
	const extensionDir = path.join(homeDir, '.myVscodeExtension');
	if (!fs.existsSync(extensionDir)) {
		fs.mkdirSync(extensionDir);
	}
	const audioFilePath = path.join(extensionDir, 'recording.wav');

	const fmediaCommand = `fmedia --record --overwrite --mpeg-quality=16 --rate=12000 --globcmd=listen --out=${audioFilePath}`;
	// print the command
	console.log(fmediaCommand);
	
    let chp = exec(fmediaCommand, options, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showInformationMessage(`Error starting recording: ${error}`);
            return;
        }
		vscode.window.showInformationMessage('Recording Completed.');
        console.log(`Recording started: ${stdout}`);
        isRecording = true;
    });
	if (chp) {
		vscode.window.showInformationMessage('Recording started...');
		isRecording = true;
	}

}
function stopRecording() {
    const fmediaStopCommand = `fmedia --globcmd=stop`;


    exec(fmediaStopCommand, options, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showInformationMessage(`Error stopping recording: ${error}`);
            return;
        }
		vscode.window.showInformationMessage('Recording stopped...');
        console.log(`Recording stopped: ${stdout}`);
        isRecording = false;
    });
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "arkode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('arkode.inject', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Injecing from arkode!');




				if (!isRecording) {
					startRecording();
					// vscode.window.showInformationMessage('Recording started...');
				} else {
					stopRecording();
					/*
					vscode.window.showInformationMessage('Recording stopped. Transcribing...');
					const transcription = await transcribeAudio('path/to/recorded/audio/file');
					if (transcription) {
						pasteTranscription(transcription);
					}
					*/
				}

		
			context.subscriptions.push(disposable);
		});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
