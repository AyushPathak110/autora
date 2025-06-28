const vscode = require("vscode");
const acorn = require("acorn");
const walk = require("acorn-walk");
const OpenAI = require("openai");

/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
  console.log("✅ CodeFixer AI Extension Activated");

  let timeout = null;
  let commentTimeout = null;
  let currentSuggestion = null;

  context.subscriptions.push(
    vscode.commands.registerCommand("autora.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter your OpenAI API Key",
        password: true,
        ignoreFocusOut: true,
      });

      if (key) {
        await context.secrets.store("openai-api-key", key);
        vscode.window.showInformationMessage("API key saved securely.");
      } else {
        vscode.window.showWarningMessage("API key not entered.");
      }
    })
  );

  context.subscriptions.push(
  vscode.commands.registerCommand("autora.clearApiKey", async () => {
    await context.secrets.delete("openai-api-key");
    vscode.window.showInformationMessage("API key removed.");
  })
);

  vscode.workspace.onDidChangeTextDocument((event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || event.document !== editor.document) return;

    const cursorPos = editor.selection.active;
    const currentLine = cursorPos.line;
    const currentLineText = editor.document.lineAt(currentLine).text.trim();

    const commentMatch = currentLineText.match(
      /^\/\/\s*(write|generate)\s+code\s+(for|to)\s+(.*)/i
    );

    // 💬 Handle comment-based generation separately with its own debounce
    if (commentMatch) {
      if (commentTimeout) clearTimeout(commentTimeout);

      commentTimeout = setTimeout(() => {
        if (!vscode.window.state.focused) {
          console.log("🔕 Skipping comment generation: window not focused");
          return;
        }

        const task = commentMatch[3];
        const prompt = `Write JavaScript code to ${task}. Only return code. No explanation, no markdown.`;
        fetchOpenAiSuggestion(prompt,"", context).then((generatedCode) => {
          if (!generatedCode) return;
          currentSuggestion = generatedCode;
          vscode.commands.executeCommand("editor.action.inlineSuggest.trigger");
          commentTimeout = null; // ✅ clear comment timeout after execution
        });
      }, 1500);
      return;
    }

    // Function improvement logic
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      if (!vscode.window.state.focused) {
        console.log("🔕 Skipping function logic: window not focused");
        return;
      }

      const fullText = editor.document.getText();

      try {
        const ast = acorn.parse(fullText, {
          ecmaVersion: "latest",
          locations: true,
        });

        let targetFunction = null;

        walk.simple(ast, {
          FunctionDeclaration(node) {
            if (
              node.loc.start.line - 1 <= currentLine &&
              node.loc.end.line - 1 >= currentLine
            ) {
              targetFunction = node;
            }
          },
          FunctionExpression(node) {
            if (
              node.loc.start.line - 1 <= currentLine &&
              node.loc.end.line - 1 >= currentLine
            ) {
              targetFunction = node;
            }
          },
          ArrowFunctionExpression(node) {
            if (
              node.loc.start.line - 1 <= currentLine &&
              node.loc.end.line - 1 >= currentLine
            ) {
              targetFunction = node;
            }
          },
        });

        const lineTextBeforeCursor = editor.document
          .getText(
            new vscode.Range(new vscode.Position(cursorPos.line, 0), cursorPos)
          )
          .trimEnd();

        if (lineTextBeforeCursor.endsWith("}")) {
          console.log("🔕 Skipping: line before cursor ends with }");
          return;
        }

        if (targetFunction) {
          const codeSlice = fullText.slice(
            targetFunction.start,
            targetFunction.end
          );

          console.log(codeSlice);

          fetchOpenAiSuggestion(
            `You are a senior JavaScript developer. The user has written a function that ends prematurely. It is not incorrect or flawed — it is simply unfinished. Assume the existing code is intentional and correct. Your only job is to complete the function from where it stops.

✋ STRICT RULES:
- DO NOT repeat or include any of the original code.
- DO NOT reformat or rewrite the existing code.
- DO NOT explain anything.
- DO NOT add backticks, language tags, or Markdown.
- DO NOT return the entire function.
- ONLY return the missing code that completes the function.
- Output must be plain JavaScript code — just the continuation.

Begin from where the user stopped writing:
`,
            codeSlice, context
          ).then((suggestion) => {
            if (suggestion) {
              currentSuggestion = suggestion;
              vscode.commands.executeCommand(
                "editor.action.inlineSuggest.trigger"
              );
            } else {
              console.log("⚠️ No suggestion returned.");
            }
          });
        } else {
          // ✅ Fallback: handle code after last closing brace (or all if no brace)
          const document = editor.document;
          const cursorOffset = document.offsetAt(cursorPos);
          const codeBeforeCursor = fullText.slice(0, cursorOffset);

          if (!codeBeforeCursor || currentLineText === "}") {
            console.log("🔕 Skipping fallback: empty or invalid line");
            return;
          }

          fetchOpenAiSuggestion(
            `You are a senior JavaScript developer. The user has finished writing all function code. They are now writing top-level logic. Continue the code from where the user stopped.

🚫 STRICT RULES:
- DO NOT repeat any of the original code.
- DO NOT explain or comment anything.
- DO NOT use markdown or backticks.
- ONLY return plain JavaScript continuation lines.

Code written so far:
${codeBeforeCursor}

Continue from:
${currentLineText}
`
          ,"", context).then((suggestion) => {
            if (suggestion) {
              currentSuggestion = suggestion;
              vscode.commands.executeCommand(
                "editor.action.inlineSuggest.trigger"
              );
            }
          });
        }
      } catch (err) {
        console.error("❌ AST parsing failed:", err.message);
      }
    }, 1500);
  });

  vscode.languages.registerInlineCompletionItemProvider(
    { language: "javascript", scheme: "file" },
    {
      provideInlineCompletionItems(document, position, context, token) {
        if (!currentSuggestion) return;

        return {
          items: [
            {
              insertText: currentSuggestion,
              range: new vscode.Range(position, position),
            },
          ],
        };
      },
    }
  );

  vscode.window.onDidChangeTextEditorSelection(() => {
    currentSuggestion = null;
  });
}

function deactivate() {}

async function fetchOpenAiSuggestion(prompt, code = "", context) {
  const apiKey = await context.secrets.get("openai-api-key");
if (!apiKey) {
  vscode.window
    .showErrorMessage("❌ Missing OpenAI API Key.", "Set Key Now")
    .then((selection) => {
      if (selection === "Set Key Now") {
        vscode.commands.executeCommand("autora.setApiKey");
      }
    });
  return null;
}

  const client = new OpenAI({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `${prompt}
${code}`,
        },
      ],
      temperature: 0.7,
    });

    return cleanLLMOutput(response.choices[0].message.content.trim());
  } catch (err) {
    vscode.window.showErrorMessage(
      "❌ OpenAI API error: " + (err.message || err)
    );
    return null;
  }
}

function cleanLLMOutput(rawText) {
  return rawText
    .replace(/^\s*```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}

module.exports = {
  activate,
  deactivate,
};