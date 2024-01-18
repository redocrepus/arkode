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


const gSettingWhisperPromptFilePath = 'arkode.whisperPromptFilePath';
const gSettingSystemMessagePath = 'arkode.systemMessageFilePath';
const gSettingModel = 'arkode.model';
const gSettingFmediaPath = 'arkode.fmediaPath';
const gSettingApikey = 'arkode.apiKey';
const gSettingDebugTranscription = 'arkode.debugTranscription';





let gDebug = false;


const gHomeDir = os.homedir();
const gExtensionDir = path.join(gHomeDir, '.arkode__a9a21d80-ce47-4c6f-bf44-c903eb7eef11');



let gOpenAI = new OpenAI(
	{
		apiKey: '',
	}
);




let gCurrentFileContents = '';



function initializeStringSetting(name: string, defaultValue: string): void {
    const settingValue = vscode.workspace.getConfiguration().get<string>(name);
    if (!settingValue) {
        vscode.workspace.getConfiguration().update(name, defaultValue, vscode.ConfigurationTarget.Global);
    }
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

async function transcribe(inputFileName: string): Promise<string> {
	
	vscode.window.showInformationMessage('transcribe');
	console.log('transcribe called');

	if (gDebug){
		let debugTranscription = '';
		try {
			debugTranscription = vscode.workspace.getConfiguration().get<string>(gSettingDebugTranscription) || '';
		} catch (err) {
			vscode.window.showErrorMessage('Failed getting debug transcription from settings: ' + err);
		}
		if (debugTranscription !== '') {
			return debugTranscription;
		}
	}

    let languageSymbol = 'en'; // default language symbol
	// default prompt
    let prompt = "This is a transcription in English, mainly about programming, coding and software development.";
	let promptFilePath = '';
    if (vscode.workspace.getConfiguration().has(gSettingWhisperPromptFilePath)) {
        promptFilePath = vscode.workspace.getConfiguration().get(gSettingWhisperPromptFilePath)!;
    }

    try {
        const content = await vscode.workspace.fs.readFile(vscode.Uri.file(promptFilePath));
		// console.log('extensionDir: ' + gExtensionDir);
        prompt = content.toString();
		gCurrentFileContents = getActiveFileContent();
		prompt += "\n" + gCurrentFileContents;
		console.log('whisper prompt: ' + prompt);
    } catch (err) {
        vscode.window.showErrorMessage('Failed reading file: ' + err);
        return '';
    }

    try {
        const response = await gOpenAI.audio.transcriptions.create({
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

let PATH = vscode.workspace.getConfiguration().get<string>(gSettingFmediaPath)!;
const options: ExecOptions = {
	env: {"PATH": PATH }
};


// gAudioFilePath holds the path to the audio file used in the recording process
let gAudioFilePath: string;

async function codify(text: string): Promise<string> {
	let code = text;

	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		vscode.window.showInformationMessage('No active text editor found');
		return '';
	}

	const document = activeEditor.document;
	const selection = activeEditor.selection;
	const currentFileContents = document.getText();
	const selectedText = document.getText(selection);

	// Construct the prompt for ChatGPT
	let prompt = `Current Code:\n\`\`\`\n${currentFileContents}\n\`\`\`\nSelected Text:\n\`\`\`\n${selectedText}\n\`\`\`\nTranscribed Coding Description:\n${text}\n\n`;
	// dump the prompt to a file
	const promptFileName = 'lastChatGPT_prompt.txt';
	fs.writeFileSync(path.join(gExtensionDir, promptFileName), prompt);

	// print the prompt to log
	console.log('ChatGPT prompt: ' + prompt);
	let model = "gpt-4";
	if (vscode.workspace.getConfiguration().has(gSettingModel)) {
		model = vscode.workspace.getConfiguration().get(gSettingModel)!;
	}

	// default system message (fallback)
	let systemMessage = 'You are a coding assistant. Given some "Current Code", a "Transcribed Coding Description" and "Selected Text", you should generate the code that implements the Coding description. The output should be suitable to replace the Selected Text. The output must contain only the code without any other text or symbols. Do not enclose the code in quotes or ticks, because if you do, it will not compile in context.\n\n';

	let systemMessagePath = vscode.workspace.getConfiguration().get<string>(gSettingSystemMessagePath);
	if (systemMessagePath) {
		try {
			systemMessage = (await vscode.workspace.fs.readFile(vscode.Uri.file(systemMessagePath))).toString();
		} catch (err) {
			vscode.window.showErrorMessage(`Failed reading system message file: ${err} Using default system message.`);
		}
	} else {
		vscode.window.showErrorMessage('System message file path not set in settings. Using default system message.');
	}

	try {
		const response = await gOpenAI.chat.completions.create({
			model: model,
			messages: [	{"role": "system", "content": systemMessage},
						{"role": "user", "content": prompt}]
		});
		let c = response.choices[0].message.content;
		if (c){
			code = c;
		}
			
		
	} catch (err) {
		vscode.window.showErrorMessage('Error creating transcription: ' + err);
		return '';
	}

	return code;
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
					await vscode.commands.executeCommand('editor.action.formatSelection');
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


	//========== Initialize settings and generate default files ==========
	let transcriptionPromptPath = path.join(gExtensionDir, 'whisperPrompt.txt');
	initializeStringSetting(gSettingWhisperPromptFilePath, transcriptionPromptPath);
	if (!fs.existsSync(transcriptionPromptPath)) {
		fs.writeFileSync(transcriptionPromptPath, 'This is a transcription in English, mainly about programming, coding and software development.\n\n');
	}

	let systemMessagePath = path.join(gExtensionDir, 'systemMessage.txt');
	initializeStringSetting(gSettingSystemMessagePath, systemMessagePath);
	if (!fs.existsSync(systemMessagePath)) {
		fs.writeFileSync(systemMessagePath, 'You are a coding assistant. Given some "Current Code", a "Transcribed Code Description" and "Selected Text", you should generate the code that implements the Transcribed Code Description. The Transcribed Code Description This is a transcription made by Whisper API of a recording of the code description. The code description could be just a spoken code or a description of a code change. The output should be suitable to replace the Selected Text. The output must contain only the code without any other text or symbols. Do not enclose the code in quotes or ticks, because if you do, it will not compile in context.\n\n');
	}
	// ========== End of Initialize settings and generate default files ==========
	
	let gApikey = vscode.workspace.getConfiguration().get<string>(gSettingApikey);
	if (!gApikey) {
		const gApikeyFile = path.join(gExtensionDir, 'apikey.txt'); // This is for development environment
		vscode.window.showWarningMessage(`API key not set in extension settings, trying to read it from ${gApikeyFile}.`);
		// try to read it from file

		try {
			const content = fs.readFileSync(gApikeyFile, 'utf8');
			gApikey = content.toString();
		}
		catch (err) {
			console.error(err);
			vscode.window.showErrorMessage(`Failed reading apikey from ${gApikeyFile}: ${err}`);
		}

	}

	if (gApikey) {
		gOpenAI.apiKey = gApikey;
	}
	else {
		vscode.window.showErrorMessage(`API key not set in extension settings or in apikey.txt file.`);
	}





	// print context.globalStorageUri.fsPath to log
	console.log('globalStorageUri.fsPath: ' + context.globalStorageUri.fsPath);

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