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
import { get } from 'http';

let gDebug = false;


const gHomeDir = os.homedir();
const gExtensionDir = path.join(gHomeDir, '.arkode__a9a21d80-ce47-4c6f-bf44-c903eb7eef11');

// read API keyfrom extensionDir / apikey.txt
const gApikeyFile = path.join(gExtensionDir, 'apikey.txt');
let apikey = '';
try {
	const content = fs.readFileSync(gApikeyFile, 'utf8');
	apikey = content.toString();
}
catch (err) {
	console.error(err);
	vscode.window.showErrorMessage('Failed reading apikey from file: ' + err);
}

let gCurrentFileContents = '';


// read API keyfrom extensionDir / apikey.txt
// const apikeyFile = path.join(extensionDir, 'apikey.txt');
// let apikey = '';
// try {
// 	const content = fs.readFileSync(apikeyFile, 'utf8');
// 	apikey = content.toString();
// }
// catch (err) {
// 	console.error(err);
// 	vscode.window.showErrorMessage('Failed reading apikey from file: ' + err);
// }



// let apikey = '';
// apikey = vscode.workspace.getConfiguration().get('arkode.apikey')!;

const gOpenai = new OpenAI(
	{
  apiKey: apikey,
}
);

interface Config {
    openapiKey: string;
}

function getActiveFileContent(): string {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showInformationMessage('No active text editor found');
        return '';
    }

    const document = activeEditor.document;
    const text = document.getText();
    return text;
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

	if (gDebug){
		let debugTranscriptionFileName = vscode.workspace.getConfiguration().get('arkode.debugTranscriptionFileName');
		let debugTranscription = '';
		try {
			debugTranscription = (await vscode.workspace.fs.readFile(vscode.Uri.file(`${gExtensionDir}/${debugTranscriptionFileName}`))).toString();
		} catch (err) {
			vscode.window.showErrorMessage('Failed reading file: ' + err);
		}
		// If the bugged transcription is not empty, return it
		if (debugTranscription !== '') {
			return debugTranscription;
		}
	}

    let prompt = "This is a transcription in English, mainly about programming, coding and software development.";
    let promptFileName = 'transcriptionPrompt.txt';
    let languageSymbol = 'en'; // default language symbol

    if (vscode.workspace.getConfiguration().has('arkode.promptFileName')) {
        promptFileName = vscode.workspace.getConfiguration().get('arkode.promptFileName')!;
    }

    try {
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(`${gExtensionDir}/${promptFileName}`));
		// print extension dir
		console.log('extensionDir: ' + gExtensionDir);
        prompt = content.toString();
		gCurrentFileContents = getActiveFileContent();
		prompt += "\n" + gCurrentFileContents;
		console.log('prompt: ' + prompt);
    } catch (err) {
        vscode.window.showErrorMessage('Failed reading file: ' + err);
        return '';
    }

    try {
        const response = await gOpenai.audio.transcriptions.create({
			model: "whisper-1",
			prompt: prompt,
			file: fs.createReadStream(inputFileName),
			language: "en"});
        
        return response.text;
    } catch (err) {
        vscode.window.showErrorMessage('Error creating transcription: ' + err);
        return '';
    }
}




let gIsRecording = false;

let PATH = vscode.workspace.getConfiguration().get<string>('arkode.fmediaPath')!;
const options: ExecOptions = {
	env: {"PATH": PATH }
};


let gAudioFilePath: string;

async function codify(text: string): Promise<string> {
	/*
	let prompt = "```{currentFileContents}```\n\"";
	let model="gpt-4";
	if (vscode.workspace.getConfiguration().has('arkode.model')) {
        model = vscode.workspace.getConfiguration().get('arkode.model')!;
    }

	try {
        const response = await openai.chat.completions.create({
			model: model,
			messages: [	{"role": "system", "content": "You are a coding assistant. "},
        				{"role": "user", "content": "Who won the world series in 2020?"},
        				{"role": "assistant", "content": "The Los Angeles Dodgers won the World Series in 2020."},
        				{"role": "user", "content": "Where was it played?"}]
			
        
        return response.text;
    } catch (err) {
        vscode.window.showErrorMessage('Error creating transcription: ' + err);
        return '';
    }*/
	return text;
}

function startRecording() {

	if (!fs.existsSync(gExtensionDir)) {
		fs.mkdirSync(gExtensionDir);
	}
	const audioFilePath = path.join(gExtensionDir, 'recording.wav');

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
		gIsRecording = false;

		try {
			const transcription = await transcribe(audioFilePath);
			if (transcription) {
				vscode.window.showInformationMessage('Transcription: ' + transcription);
				console.log('Transcription: ' + transcription);

				const editor = vscode.window.activeTextEditor;
				if (editor) {
					const document = editor.document;
					const selection = editor.selection;

					const code = await codify(transcription);		

					console.log('Replacing: ' + document.getText(selection) + ' with: ' + code);

					editor.edit(editBuilder => {
						editBuilder.replace(selection, code);
					});
				}


			}
		} catch (err) {
			vscode.window.showErrorMessage('Error in transcription: ' + err);
		}

	});
	if (chp) {
		vscode.window.showInformationMessage('Recording started...');
		console.log('Recording started...');
		gIsRecording = true;
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

    if (context.extensionMode === vscode.ExtensionMode.Development) {
        // This code will only execute if the extension is in debugging mode
        console.log('Extension is running in debug mode');

		gDebug = true;
    }


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




				if (!gIsRecording) {
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