# arkode

Voice Coding extension for VS Code.
Uses fmedia to record, WhisperAPI to transcribe and ChatGPT To format the code.

My objective is to bootstrap a tool for hands-off coding using only voice.
At every phase I add a little piece of functionality supporting handless coding.
I have started with https://github.com/redocrepus/ahk-whisper-paste,
and then used it to develop this extension.
Now I'm using the extension to improve it.

## Warnings !!!

- This extension is a POC. I have no prior experience developing VS Code extensions and there might be severe issues. Use it at your own risk
- This extension sends your code to OpenAI.
Neither security nor privacy was a consideration when writing this extension.

## Prerequisites

Requires fmedia. You can get it here: https://stsaz.github.io/fmedia/

## Usage

Hit the `pause` key to start/stop dictating your coding request.
Optionally, you can first select a unique section of your code,
the selection will be replaced by the implementation of your request.
If no code was selected, first the extension will inject placeholder at the cursor position and then replace it with the code you've described.
Processing your requests may take some time and there is no progress indicator yet,
so, please be patient.

### Help needed improve features description

## Extension Settings

This extension contributes the following settings:

- `arkode.apiKey`: Your OpenAI API key.
- `arkode.fmediaPath`: The path to the `fmedia` directory.
- `arkode.whisperPromptFilePath`: The file path for the transcription prompt used for WhisperAPI.
- `arkode.systemMessageFilePath`: Path to the system message file for ChatGPT.
- `arkode.model`: ChatGPT model (for best results use `"gpt-4-1106-preview"`
- `arkode.debugTranscription`: If not empty, your recordings are ignored and this text is be used (for saving fees and time when debugging).

To modify these settings, go to `File > Preferences > Settings` (Windows) and search for `Arkode`.


## Known Issues

### Help needed to describe known issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Changelog

### 0.0.2-alpha

#### New
- ChatGPT enhanced coding:
  - [Optional] Select a code section to be modified.
  - Dictate a code change request for ChatGPT to implement on current text selection or at the current cursor position.
- New settings
  - `arkode.whisperPromptFilePath` for customized WhisperAPI prompt files.
  - `arkode.systemMessageFilePath` for specifying the system message file path for ChatGPT.
  - `arkode.model`: Recommended default ChatGPT model is `"gpt-4-1106-preview"`.
  - `arkode.debugTranscription` for predefined requests instead of live whisper AI queries - for debugging.

### Improvements

- Slightly better information messages

#### Changes
- Renamed the command `arkode.inject` to `arkode.dictateCodingRequest`

### 0.0.1-alpha

Initial release only does context-based transcription, but doesn't do any syntax/semantics based post processing yet.


---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
