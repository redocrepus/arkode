# arkode

Voice Coding extension for VS Code.
Uses fmedia to record, WhisperAPI to transcribe and ChatGPT To format the code.

## Features

Hit the `pause` key to start/stop dictating code.

### Help needed to describe the features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

Requires fmedia. You can get it here: https://stsaz.github.io/fmedia/

## Extension Settings

## Extension Settings

This extension contributes the following settings:

- `arkode.apiKey`: Your OpenAI API key. This key is required for the extension to communicate with OpenAI's services.

- `arkode.fmediaPath`: The path to the `fmedia` dir.

- `arkode.promptFileName`: The filename for the transcription prompt used by the Whisper API. The default value is `transcriptionPrompt.txt`. Change this if you have a different file or path for your transcription prompts.

To modify these settings, go to `File > Preferences > Settings` (on Windows) or `Code > Preferences > Settings` (on macOS), and search for `Arkode`. Alternatively, these settings can be set in your workspace's `settings.json` file.


## Known Issues

### Help needed to describe known issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### 0.0.1-alpha

Initial working prototype release.


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
