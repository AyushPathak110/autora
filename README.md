# Autora

Autora is a VS Code extension that enhances your JavaScript development experience by using OpenAI to intelligently complete and generate code based on your context. It supports secure, user-supplied API keys and provides seamless inline suggestions without sending any of your data to third-party servers (other than OpenAI).

## Features

- Inline completion of partially written JavaScript functions
- Comment-driven code generation from natural language prompts
- Secure API key storage using VS Code’s Secrets API
- Uses OpenAI’s gpt-4o-mini model by default

## Installation

1. Open the Extensions view in VS Code.
2. Search for "Autora" and install it.

## Getting Started

### Set Your OpenAI API Key

After installation, you must provide your own OpenAI API key.

1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
2. Run the command:  
   `Autora: Set OpenAI API Key`
3. Enter your OpenAI API key.  
   
# About API Key Storage and Security

 When you set your OpenAI API key using the 'Autora: Set OpenAI API Key' command,
 it is securely stored using Visual Studio Code’s built-in Secrets API.

 - The API key is stored locally on your device and encrypted by VS Code.
 - It is scoped to your user profile and never exposed to extension developers or third parties.
 - The key is used only to make authenticated requests to OpenAI’s API. It is never transmitted elsewhere.
 - This extension does not include telemetry, analytics, or tracking of any kind.
 - No code, prompts, completions, or metadata are collected, stored, or logged.

 Your data and API key remain entirely private. You have full control over your usage, and can revoke the key at any time by running the 'Autora: Clear OpenAI API Key' command, which will delete the key from secure storage.

 This architecture ensures your key is handled responsibly.

### Clear Your API Key

To remove your saved key at any time:

- Run: `Autora: Clear OpenAI API Key` from the Command Palette

## Usage

Autora automatically activates when you're working in JavaScript files.

It supports two main modes:

### 1. Inline Function Completion

When you pause while writing a JavaScript function, Autora uses AST parsing to detect incomplete functions and suggests context-aware completions.

Example:

```js
function isEven(n) {
  return 
```

Autora will suggest an appropriate return statement based on the function name and context.

### 2. Comment-Driven Code Generation

Write a comment that begins with:

```js
// generate code for a login form
```

Autora will generate relevant code based on the intent described in your comment.

## License

This extension is proprietary software.  
All rights reserved © 2025 Ayush Pathak.  
You may use this software for personal or internal use only.  
Redistribution, modification, or commercial use without permission is prohibited.