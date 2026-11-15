// Copyright (c) 2026 Vegte Media Group. SPDX-License-Identifier: MIT
// VS Code support for VMGX: live error checking, formatting and JSON conversion.
// Uses the reference parser (vmgx.js), so VS Code agrees with every other VMGX tool.

const vscode = require("vscode");
const VMGX = require("./vmgx.js");

/** Where the problem in `text` is, as zero-based line and character, or null if valid. */
function findProblem(text) {
  try {
    VMGX.parse(text);
    return null;
  } catch (e) {
    if (!(e instanceof VMGX.VMGXError)) throw e;
    return {
      line: Math.max(0, (e.line || 1) - 1),
      character: Math.max(0, (e.column || 1) - 1),
      message: e.reason || e.message
    };
  }
}

function activate(context) {
  const diagnostics = vscode.languages.createDiagnosticCollection("vmgx");
  context.subscriptions.push(diagnostics);
  const timers = new Map();

  function check(document) {
    if (document.languageId !== "vmgx") return;
    const problem = findProblem(document.getText());
    if (!problem) {
      diagnostics.set(document.uri, []);
      return;
    }
    const line = Math.min(problem.line, document.lineCount - 1);
    const lineText = document.lineAt(line).text;
    const start = Math.min(problem.character, lineText.length);
    // Underline the word at the problem, or the rest of the line.
    const word = document.getWordRangeAtPosition(new vscode.Position(line, start));
    const range = word || new vscode.Range(line, start, line, Math.max(start + 1, lineText.length));
    const diagnostic = new vscode.Diagnostic(range, problem.message, vscode.DiagnosticSeverity.Error);
    diagnostic.source = "VMGX";
    diagnostics.set(document.uri, [diagnostic]);
  }

  function schedule(document) {
    if (document.languageId !== "vmgx") return;
    const key = document.uri.toString();
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => { timers.delete(key); check(document); }, 250));
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(check),
    vscode.workspace.onDidChangeTextDocument((event) => schedule(event.document)),
    vscode.workspace.onDidCloseTextDocument((document) => diagnostics.delete(document.uri)),

    vscode.languages.registerDocumentFormattingEditProvider("vmgx", {
      provideDocumentFormattingEdits(document, options) {
        let formatted;
        try {
          formatted = VMGX.stringify(VMGX.parse(document.getText()), {
            indent: options.insertSpaces ? options.tabSize : 2
          });
        } catch (e) {
          vscode.window.showWarningMessage("VMGX: fix the error in this file before formatting.");
          return [];
        }
        const whole = new vscode.Range(0, 0, document.lineCount, 0);
        return [vscode.TextEdit.replace(whole, formatted)];
      }
    }),

    vscode.commands.registerCommand("vmgx.toJSON", () => convert(false)),
    vscode.commands.registerCommand("vmgx.toTypedJSON", () => convert(true))
  );

  vscode.workspace.textDocuments.forEach(check);
}

async function convert(typed) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== "vmgx") return;
  let json;
  try {
    json = VMGX.toJSON(editor.document.getText(), { typed });
  } catch (e) {
    vscode.window.showErrorMessage("VMGX: " + (e.reason || e.message));
    return;
  }
  const document = await vscode.workspace.openTextDocument({ language: "json", content: json + "\n" });
  await vscode.window.showTextDocument(document, vscode.ViewColumn.Beside);
}

function deactivate() {}

module.exports = { activate, deactivate, findProblem };
