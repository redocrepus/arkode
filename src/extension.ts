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


const gDefaultSystemMessage = 'You are a coding assistant.\n' +
	'Given some "Current Code", a "Transcribed Coding Request Task Description" and "text-to-replace",\n' +
	'you should generate the code that implements the described coding taks.\n' +
	'The output should be suitable to be pasted instead of "text-to-replace".\n' +
	'"text-to-replace" might be part of the code or a special placeholder string.' +
	'The output must contain only the code without any other text or symbols.\n' +
	'Do not enclose the code in quotes or ticks, because if you do, it will not compile in context.\n\n';

const gDefaultPrompt = 'This is a transcription in English, mainly about programming, coding and software development. It might include code snippets.\n';





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

	console.log('transcribe called');

	if (gDebug) {
		let debugTranscription = '';
		try {
			debugTranscription = vscode.workspace.getConfiguration().get<string>(gSettingDebugTranscription) || '';
		} catch (err) {
			vscode.window.showErrorMessage('Failed getting debug transcription from settings: ' + err);
		}
		if (debugTranscription !== '') {
			vscode.window.showWarningMessage('Debug transcription is being used.');
			return debugTranscription;
		}
	}

	let languageSymbol = 'en'; // default language symbol
	let prompt = gDefaultPrompt;
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
		console.log('WhisperAI prompt: ' + prompt);
	} catch (err) {
		vscode.window.showErrorMessage('Failed reading file: ' + err);
		return '';
	}

	try {
		vscode.window.showInformationMessage('Transcribing your request with WhisperAI...');
		const response = await gOpenAI.audio.transcriptions.create({
			model: "whisper-1",
			prompt: prompt,
			file: fs.createReadStream(inputFileName),
			language: "en"});
		vscode.window.showInformationMessage('Transcription: ' + response.text);
		console.log('Transcription: ' + response.text);
		return response.text;
	} catch (err) {
		vscode.window.showErrorMessage('Error creating transcription: ' + err);
		return '';
	}
}




let gIsRecording = false;

let PATH = vscode.workspace.getConfiguration().get<string>(gSettingFmediaPath)!;
const options: ExecOptions = {
	env: { "PATH": PATH }
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
	let selectedText = document.getText(selection);
	const currentFileContents = document.getText();

	// Construct the prompt for ChatGPT
	let prompt = `Current Code:\n\`\`\`\n${currentFileContents}\n\`\`\`\n"text-to-replace":\n\`\`\`\n${selectedText}\n\`\`\`\nTranscribed Coding Task Request Description:\n${text}\n\n`;
	// dump the prompt to a file
	const promptFileName = 'lastChatGPT_prompt.txt';
	fs.writeFileSync(path.join(gExtensionDir, promptFileName), prompt);

	console.log(`ChatGPT prompt: ${prompt}`);
	let model = "gpt-4-1106-preview";
	if (vscode.workspace.getConfiguration().has(gSettingModel)) {
		model = vscode.workspace.getConfiguration().get(gSettingModel)!;
	}

	let useJson = (model === "gpt-4-1106-preview" || model === "gpt-3.5-turbo-1106");

	// default system message (fallback)
	let systemMessage = gDefaultSystemMessage;
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

		let response;
		
		if (useJson) {
			systemMessage += '\nThe response must be a JSON object with a single key "code" whose value is the generated code.\n\n';
			vscode.window.showInformationMessage('Sending request to ChatGPT...');
			response = await gOpenAI.chat.completions.create({
				messages: [
					{ "role": "system", "content": systemMessage },
					{ "role": "user", "content": prompt }
				],
				model: model,
				response_format: { type: "json_object" },
			});
			vscode.window.showInformationMessage('Received response from ChatGPT.');

			let c = response.choices[0].message.content;

			if (c) {
				try {
					code = JSON.parse(c).code;
				} catch (err) {
					vscode.window.showErrorMessage('Failed to parse the response: ' + err);
				}
			}


		} else { // not useJson
			vscode.window.showInformationMessage('Sending request to ChatGPT...');
			response = await gOpenAI.chat.completions.create({
				messages: [
					{ "role": "system", "content": systemMessage },
					{ "role": "user", "content": prompt }
				],
				model: model
			});
			vscode.window.showInformationMessage('Received response from ChatGPT.');
			let c = response.choices[0].message.content;
			if (c) {
				code = c;
			}
		}


	} catch (err) {
		vscode.window.showErrorMessage(`We're sorry, but there was an error processing your request with ChatGPT: ${err}. Please try again.`);
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

	let chp = exec(fmediaCommand, options,
		async (error, stdout, stderr) => { // callback function when the command finishes
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
					const editor = vscode.window.activeTextEditor;
					if (editor) {
						const document = editor.document;
						const selection = editor.selection;
						let newSelection = selection;
						if (selection.isEmpty) {
							const uniqueString = 'Arkode__' + new Date().getTime().toString();
							await editor.edit(editBuilder => {
								editBuilder.replace(selection, uniqueString);
							});
							newSelection = new vscode.Selection(selection.start, selection.start.translate(0, uniqueString.length));
							editor.selection = newSelection;
						}

						const code = await codify(transcription);

						console.log('Replacing: ' + document.getText(newSelection) + ' with: ' + code);

						await editor.edit(editBuilder => {
							editBuilder.replace(newSelection, code);
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

//	vscode.window.showInformationMessage('stopRecording called');
	console.log('stopRecording called');

	let chp = exec(fmediaStopCommand, options,
		(error, stdout, stderr) => { // callback function when the command finishes
		if (error) {
			vscode.window.showInformationMessage(`Error stopping recording: ${error}`);
			console.log(`Error stopping recording: ${error}`);
			return;
		}
		// vscode.window.showInformationMessage('fmedia stop sent.');
		console.log('fmedia stop sent.');
	});

	if (chp) {
		// vscode.window.showInformationMessage('fmedia stop process started..');
		console.log('fmedia stop process started..');
	}



	console.log('stopRecording exiting.');
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	console.log('The arkode extension "activate" started.');

	//========== Initialize settings and generate default files ==========
	let transcriptionPromptPath = path.join(gExtensionDir, 'whisperPrompt.txt');
	initializeStringSetting(gSettingWhisperPromptFilePath, transcriptionPromptPath);
	if (!fs.existsSync(transcriptionPromptPath)) {
		fs.writeFileSync(transcriptionPromptPath, gDefaultPrompt);
	}

	let systemMessagePath = path.join(gExtensionDir, 'systemMessage.txt');
	initializeStringSetting(gSettingSystemMessagePath, systemMessagePath);
	if (!fs.existsSync(systemMessagePath)) {
		fs.writeFileSync(systemMessagePath, gDefaultSystemMessage);
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



	// console.log('globalStorageUri.fsPath: ' + context.globalStorageUri.fsPath);

	if (context.extensionMode === vscode.ExtensionMode.Development) {
		// This code will only execute if the extension is in debugging mode
		console.log('Extension is running in debug mode');
		gDebug = true;
	}



	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('arkode.dictateCodingRequest', async () => {
		// The code you place here will be executed every time your command is executed

		if (!gIsRecording) {
			startRecording();
		} else {
			stopRecording();
		}

	});

	context.subscriptions.push(disposable);

	console.log('The arkode extension "activate" finished.');
}

// This method is called when your extension is deactivated
export function deactivate() {}