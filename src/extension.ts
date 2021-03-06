import { homedir } from "os";
import { join } from "path";
import * as vscode from "vscode";
import { getFormattedDate } from "./date";
import {
  completeTodo,
  createChildTodo,
  createSiblingTodo,
  format,
  parse,
  Todo,
  toggleTodo,
  uncompleteTodo,
} from "./todo";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("vs-todo.open", async () => {
      const value = await vscode.window.showInputBox();
      if (value === undefined) {
        return;
      }
      const formattedDate = getFormattedDate(value);
      const todoPath = join(homedir(), "todos", `${formattedDate}.md`);
      const uri = vscode.Uri.file(todoPath);
      const edit = new vscode.WorkspaceEdit();
      edit.createFile(uri, { ignoreIfExists: true });
      await vscode.workspace.applyEdit(edit);
      vscode.commands.executeCommand("vscode.open", uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vs-todo.completeTodo", () => {
      runTodoCommand(completeTodo);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vs-todo.uncompleteTodo", () => {
      runTodoCommand(uncompleteTodo);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vs-todo.toggleTodo", () => {
      runTodoCommand(toggleTodo);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vs-todo.createChildTodo", () => {
      runTodoCommand(createChildTodo, moveCursorToEndOfLine);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vs-todo.createSiblingTodo", () => {
      let numLinesToMoveCursorDown = 1;
      const command = (todos: Todo[], currentLine: number) => {
        numLinesToMoveCursorDown =
          createSiblingTodo(todos, currentLine) - currentLine;
      };
      const onDidFormat = () => {
        moveCursorToEndOfLine(numLinesToMoveCursorDown);
      };

      runTodoCommand(command, onDidFormat);
    })
  );
}

function runTodoCommand(
  command: (todos: Todo[], currentLine: number) => void,
  onDidFormat?: () => void
) {
  const editor = vscode.window.activeTextEditor;

  if (editor) {
    const todos = parse(editor.document.getText());
    const currentLine = editor.selection.active.line;

    command(todos, currentLine);
    formatFile(todos, editor);

    if (onDidFormat) {
      onDidFormat();
    }
  }
}

function formatFile(todos: Todo[], editor: vscode.TextEditor) {
  const startPosition = new vscode.Position(0, 0);
  const endPosition = new vscode.Position(editor.document.lineCount, 0);
  const range = new vscode.Range(startPosition, endPosition);

  editor.edit((editBuilder) => {
    editBuilder.replace(range, format(todos) + "\n");
  });
}

async function moveCursorToEndOfLine(numLinesDown: number = 0) {
  await vscode.commands.executeCommand("cursorMove", {
    to: "down",
    by: "line",
    value: numLinesDown,
  });
  await vscode.commands.executeCommand("cursorMove", {
    to: "wrappedLineEnd",
  });
}

export function deactivate() {}
