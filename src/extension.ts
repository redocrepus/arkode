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


// import axios from 'axios';

import OpenAI from "openai";


const homeDir = os.homedir();
const extensionDir = path.join(homeDir, '.arkode');

// read API keyfrom extensionDir / apikey.txt
const apikeyFile = path.join(extensionDir, 'apikey.txt');
let apikey = '';
try {
	const content = fs.readFileSync(apikeyFile, 'utf8');
	apikey = content.toString();
}
catch (err) {
	console.error(err);
	vscode.window.showErrorMessage('Failed reading apikey from file: ' + err);
}

const openai = new OpenAI(
	{
  apiKey: apikey,
}
);

interface Config {
    openapiKey: string;
}

async function transcribe(inputFileName: string
//	, config: Config
	): Promise<string> {
	
    // const workspaceFolders = vscode.workspace.workspaceFolders;
    // if (!workspaceFolders) {
    //     vscode.window.showErrorMessage('No workspace folder found.');
    //     return '';
    // }
    // const workspaceRoot = workspaceFolders[0].uri.fsPath;
	vscode.window.showInformationMessage('transcribe');
	console.log('transcribe called');

    let prompt = "This is a transcription in English, mainly about programming, coding and software development.";
    let promptFileName = 'transcriptionPrompt.txt';
    let languageSymbol = 'en'; // default language symbol

    // if (vscode.workspace.getConfiguration().has('yourExtensionConfig.promptFileName')) {
    //     promptFileName = vscode.workspace.getConfiguration().get('yourExtensionConfig.promptFileName')!;
    // }

    // try {
    //     const content = await vscode.workspace.fs.readFile(vscode.Uri.file(`${extensionDir}/${promptFileName}`));
    //     prompt = content.toString();
    // } catch (err) {
    //     vscode.window.showErrorMessage('Failed reading file: ' + err);
    //     return '';
    // }




    try {
        const response = await openai.audio.transcriptions.create({
			model: "whisper-1",
			// prompt: prompt,
			file: fs.createReadStream(inputFileName),
			language: "en"});
        
        return response.text;
    } catch (err) {
        vscode.window.showErrorMessage('Error creating transcription: ' + err);
        return '';
    }
}




let isRecording = false;
let PATH = "c:/dev/ahk-whisper-paste/bin/fmedia-1.31-windows-x64/fmedia";
const options: ExecOptions = {
	env: {"PATH": PATH }
};


let audioFilePath: string;

function startRecording() {

	if (!fs.existsSync(extensionDir)) {
		fs.mkdirSync(extensionDir);
	}
	const audioFilePath = path.join(extensionDir, 'recording.wav');

	const fmediaCommand = `fmedia --record --overwrite --mpeg-quality=16 --rate=12000 --globcmd=listen --out=${audioFilePath}`;
	// print the command
	console.log(fmediaCommand);
	
    let chp = exec(fmediaCommand, options, async (error, stdout, stderr) => {
        if (error) {
            vscode.window.showInformationMessage(`Error starting recording: ${error}`);
			console.log(`Error starting recording: ${error}`);
            return;
        }
		vscode.window.showInformationMessage('Recording Completed.');
		console.log('Recording Completed.');
		isRecording = false;

		try {
			const transcription = await transcribe(audioFilePath);
			if (transcription) {
				// Do something with the transcription
				vscode.window.showInformationMessage('Transcription: ' + transcription);
				console.log('Transcription: ' + transcription);
			}
		} catch (err) {
			vscode.window.showErrorMessage('Error in transcription: ' + err);
		}

	});
	if (chp) {
		vscode.window.showInformationMessage('Recording started...');
		console.log('Recording started...');
		isRecording = true;
	}

}
function stopRecording() {
    const fmediaStopCommand = `fmedia --globcmd=stop`;

	vscode.window.showInformationMessage('stopRecording called');
	console.log('stopRecording called');

    let chp = exec(fmediaStopCommand, options, (error, stdout, stderr) => {
        if (error) {
            vscode.window.showInformationMessage(`Error stopping recording: ${error}`);
			console.log(`Error stopping recording: ${error}`);
            return;
        }
		vscode.window.showInformationMessage('fmedia stop sent.');
		console.log('fmedia stop sent.');
    });

	if (chp) {
		vscode.window.showInformationMessage('fmedia stop process started..');
		console.log('fmedia stop process started..');
	}



	vscode.window.showInformationMessage('stopRecording exiting.');
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {


	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "arkode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('arkode.inject', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Injecing from arkode!');




				if (!isRecording) {
					startRecording();
					// vscode.window.showInformationMessage('Recording started...');
				} else {
					stopRecording();
				}


			context.subscriptions.push(disposable);
		});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
