const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const SPACE_BEFORE_PAREN_DIRECTIVES = [
  "if",
  "elseif",
  "unless",
  "switch",
  "case",
  "break",
  "continue",
  "exit",
  "for",
  "foreach",
  "forelse",
  "while",
];

const TIGHT_PAREN_DIRECTIVES = [
  "isset",
  "php",
  "json",
  "unset",
  "extends",
  "include",
  "yield",
  "section",
  "method",
  "scope",
  "elsescope",
  "scopenot",
  "elsescopenot",
  "blank",
  "notblank",
  "inject",
  "slot",
  "error",
  "vite",
];

const PHP_SELECTOR = { language: "php" };
const ODO_SELECTOR = { language: "odo" };
const VIEW_FILE_EXTENSIONS = [".odo.php", ".blade.php", ".php"];
const HELPER_FILE_GLOBS = [
  "package/doppar/src/Phaseolies/Helpers/helpers.php",
  "vendor/**/doppar/**/src/Phaseolies/Helpers/helpers.php",
  "package/*/src/Helpers/*.php",
  "vendor/**/doppar/**/src/Helpers/*.php",
];

let helperIndexPromise = null;

function invalidateHelperIndex() {
  helperIndexPromise = null;
}

function getHelperIndex() {
  if (!helperIndexPromise) {
    helperIndexPromise = buildHelperIndex();
  }

  return helperIndexPromise;
}

async function buildHelperIndex() {
  const helperFiles = await findHelperFiles();
  const helpers = new Map();

  for (const uri of helperFiles) {
    const source = await readUriText(uri);

    for (const helper of parsePhpFunctions(source, uri)) {
      helpers.set(helper.name, helper);
    }
  }

  return helpers;
}

async function findHelperFiles() {
  const discovered = [];

  for (const pattern of HELPER_FILE_GLOBS) {
    const matches = await vscode.workspace.findFiles(pattern, null, 200);
    discovered.push(...matches);
  }

  const seen = new Set();

  return discovered.filter((uri) => {
    const key = uri.fsPath;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function readUriText(uri) {
  const bytes = await vscode.workspace.fs.readFile(uri);
  return Buffer.from(bytes).toString("utf8");
}

function parsePhpFunctions(source, uri) {
  const functions = [];
  const functionPattern = /function\s+([A-Za-z_]\w*)\s*\(([\s\S]*?)\)\s*(?::\s*([^{\n]+))?\s*\{/gm;

  for (const match of source.matchAll(functionPattern)) {
    const [matchedText, name, rawParameters, rawReturnType] = match;
    const linePrefix = source
      .slice(source.lastIndexOf("\n", match.index - 1) + 1, match.index)
      .trim();

    if (/^(public|protected|private|static|final|abstract)\b/.test(linePrefix)) {
      continue;
    }

    const functionOffset = match.index + matchedText.indexOf("function");
    const definitionPosition = positionFromOffset(source, functionOffset);
    const docblock = findNearestDocblock(source, match.index);
    const parameters = splitTopLevelParameters(rawParameters).map(cleanWhitespace);
    const label = `${name}(${parameters.join(", ")})${rawReturnType ? `: ${cleanWhitespace(rawReturnType)}` : ""}`;

    functions.push({
      name,
      label,
      detail: path.basename(uri.fsPath),
      parameters,
      summary: extractDocSummary(docblock),
      documentation: buildHelperDocumentation(label, docblock, uri),
      location: new vscode.Location(uri, definitionPosition),
    });
  }

  return functions;
}

function findNearestDocblock(source, functionIndex) {
  const slice = source.slice(Math.max(0, functionIndex - 1200), functionIndex);
  const match = slice.match(/\/\*\*([\s\S]*?)\*\/\s*(?:if\s*\(\s*!function_exists\([^)]*\)\s*\)\s*\{\s*)?$/);

  return match ? match[1] : "";
}

function extractDocSummary(docblock) {
  if (!docblock) {
    return "";
  }

  const lines = docblock
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line !== "");

  const summary = [];

  for (const line of lines) {
    if (line.startsWith("@")) {
      break;
    }

    summary.push(line);
  }

  return summary.join(" ").trim();
}

function buildHelperDocumentation(label, docblock, uri) {
  const markdown = new vscode.MarkdownString("", true);
  markdown.isTrusted = false;
  markdown.appendCodeblock(label, "php");

  const summary = extractDocSummary(docblock);

  if (summary) {
    markdown.appendMarkdown(`\n${summary}\n`);
  }

  markdown.appendMarkdown(`\nSource: \`${path.basename(uri.fsPath)}\``);

  return markdown;
}

function splitTopLevelParameters(source) {
  const parameters = [];
  let current = "";
  let depthRound = 0;
  let depthSquare = 0;
  let depthCurly = 0;
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];

    if (quote) {
      current += char;

      if (char === quote && previous !== "\\") {
        quote = null;
      }

      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      current += char;
      continue;
    }

    if (char === "(") {
      depthRound += 1;
    } else if (char === ")") {
      depthRound = Math.max(0, depthRound - 1);
    } else if (char === "[") {
      depthSquare += 1;
    } else if (char === "]") {
      depthSquare = Math.max(0, depthSquare - 1);
    } else if (char === "{") {
      depthCurly += 1;
    } else if (char === "}") {
      depthCurly = Math.max(0, depthCurly - 1);
    }

    if (
      char === "," &&
      depthRound === 0 &&
      depthSquare === 0 &&
      depthCurly === 0
    ) {
      const value = cleanWhitespace(current);

      if (value) {
        parameters.push(value);
      }

      current = "";
      continue;
    }

    current += char;
  }

  const tail = cleanWhitespace(current);

  if (tail) {
    parameters.push(tail);
  }

  return parameters;
}

function cleanWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function positionFromOffset(source, offset) {
  const lines = source.slice(0, offset).split(/\r?\n/);
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;

  return new vscode.Position(line, character);
}

function createHelperCompletionItem(helper) {
  const item = new vscode.CompletionItem(
    helper.name,
    vscode.CompletionItemKind.Function
  );

  item.detail = "Doppar global helper";
  item.documentation = helper.documentation;
  item.insertText = new vscode.SnippetString(`${helper.name}($0)`);
  item.filterText = helper.name;
  item.sortText = `0-${helper.name}`;

  return item;
}

async function provideHelperCompletions(document, position) {
  if (isMemberAccessContext(document, position)) {
    return [];
  }

  const helperIndex = await getHelperIndex();
  return Array.from(helperIndex.values()).map(createHelperCompletionItem);
}

function isMemberAccessContext(document, position) {
  const prefix = document
    .getText(
      new vscode.Range(
        new vscode.Position(position.line, 0),
        position
      )
    )
    .slice(-2);

  return prefix === "->" || prefix === "::";
}

async function provideHelperSignatures(document, position) {
  const call = getFunctionCallContext(document, position);

  if (!call) {
    return null;
  }

  const helperIndex = await getHelperIndex();
  const helper = helperIndex.get(call.name);

  if (!helper) {
    return null;
  }

  const signature = new vscode.SignatureInformation(
    helper.label,
    helper.summary || helper.documentation
  );

  signature.parameters = helper.parameters.map(
    (parameter) => new vscode.ParameterInformation(parameter)
  );

  const result = new vscode.SignatureHelp();
  result.signatures = [signature];
  result.activeSignature = 0;
  result.activeParameter = Math.min(call.argumentIndex, Math.max(helper.parameters.length - 1, 0));

  return result;
}

async function providePhpDefinitions(document, position) {
  const viewDefinition = await provideViewDefinition(document, position);

  if (viewDefinition.length > 0) {
    return viewDefinition;
  }

  const helperDefinition = await provideHelperDefinition(document, position);

  if (helperDefinition.length > 0) {
    return helperDefinition;
  }

  return [];
}

async function provideHelperDefinition(document, position) {
  const wordRange = document.getWordRangeAtPosition(position, /[A-Za-z_]\w*/);

  if (!wordRange) {
    return [];
  }

  const name = document.getText(wordRange);
  const after = document.getText(
    new vscode.Range(wordRange.end, document.lineAt(position.line).range.end)
  );

  if (!/^\s*\(/.test(after)) {
    return [];
  }

  const helperIndex = await getHelperIndex();
  const helper = helperIndex.get(name);

  return helper ? [helper.location] : [];
}

async function provideViewDefinition(document, position) {
  const stringValue = getQuotedStringAtPosition(document, position);

  if (!stringValue) {
    return [];
  }

  const call = getFunctionCallContext(document, position);

  if (!call || call.name !== "view" || call.argumentIndex !== 0) {
    return [];
  }

  const resolvedViews = await resolveViewTargets(document.uri, stringValue.value);

  return resolvedViews.map((uri) => new vscode.Location(uri, new vscode.Position(0, 0)));
}

function getQuotedStringAtPosition(document, position) {
  const line = document.lineAt(position.line).text;
  let start = -1;
  let quote = null;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = line[index - 1];

    if (!quote) {
      if ((char === "'" || char === '"') && previous !== "\\") {
        quote = char;
        start = index;
      }

      continue;
    }

    if (char === quote && previous !== "\\") {
      if (position.character >= start && position.character <= index) {
        return {
          value: line.slice(start + 1, index),
          range: new vscode.Range(
            new vscode.Position(position.line, start),
            new vscode.Position(position.line, index + 1)
          ),
        };
      }

      quote = null;
      start = -1;
    }
  }

  return null;
}

function getFunctionCallContext(document, position) {
  const text = document.getText();
  const offset = document.offsetAt(position);
  let depth = 0;
  let argumentIndex = 0;

  for (let index = offset - 1; index >= 0; index -= 1) {
    const char = text[index];

    if (char === ")") {
      depth += 1;
      continue;
    }

    if (char === "(") {
      if (depth === 0) {
        const before = text.slice(0, index).match(/([A-Za-z_]\w*)\s*$/);

        if (!before) {
          return null;
        }

        const between = text.slice(index + 1, offset);
        argumentIndex = countTopLevelCommas(between);

        return {
          name: before[1],
          argumentIndex,
        };
      }

      depth -= 1;
      continue;
    }
  }

  return null;
}

function countTopLevelCommas(source) {
  let depthRound = 0;
  let depthSquare = 0;
  let depthCurly = 0;
  let quote = null;
  let count = 0;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];

    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = null;
      }

      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (char === "(") {
      depthRound += 1;
    } else if (char === ")") {
      depthRound = Math.max(0, depthRound - 1);
    } else if (char === "[") {
      depthSquare += 1;
    } else if (char === "]") {
      depthSquare = Math.max(0, depthSquare - 1);
    } else if (char === "{") {
      depthCurly += 1;
    } else if (char === "}") {
      depthCurly = Math.max(0, depthCurly - 1);
    } else if (
      char === "," &&
      depthRound === 0 &&
      depthSquare === 0 &&
      depthCurly === 0
    ) {
      count += 1;
    }
  }

  return count;
}

async function resolveViewTargets(documentUri, rawViewName) {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);

  if (!workspaceFolder) {
    return [];
  }

  const rootPath = workspaceFolder.uri.fsPath;
  const matches = [];
  const seen = new Set();

  const addCandidate = (candidatePath) => {
    if (!candidatePath || !fs.existsSync(candidatePath) || seen.has(candidatePath)) {
      return;
    }

    seen.add(candidatePath);
    matches.push(vscode.Uri.file(candidatePath));
  };

  if (rawViewName.includes("::")) {
    const [namespace, viewName] = rawViewName.split("::", 2);
    const relativeViewPath = viewName.split(".").join(path.sep);

    for (const extension of VIEW_FILE_EXTENSIONS) {
      addCandidate(
        path.join(rootPath, "resources", "views", "vendor", namespace, `${relativeViewPath}${extension}`)
      );
    }

    for (const extension of VIEW_FILE_EXTENSIONS) {
      const packageViewMatches = await vscode.workspace.findFiles(
        `package/*/resources/views/${viewName.split(".").join("/")}${extension}`,
        null,
        50
      );

      for (const uri of packageViewMatches) {
        addCandidate(uri.fsPath);
      }
    }

    return matches;
  }

  const relativeViewPath = rawViewName.split(".").join(path.sep);

  for (const extension of VIEW_FILE_EXTENSIONS) {
    addCandidate(
      path.join(rootPath, "resources", "views", `${relativeViewPath}${extension}`)
    );
  }

  return matches;
}

function normalizeInlineTag(open, inner, close) {
  const value = inner.trim();

  return value === "" ? `${open} ${close}` : `${open} ${value} ${close}`;
}

function applyDirectiveSpacing(text, directives, spacer) {
  const pattern = new RegExp(
    `(^|[^#\\w])#(${directives.join("|")})\\s*\\(`,
    "gm"
  );

  return text.replace(pattern, (_, prefix, directive) => {
    return `${prefix}#${directive}${spacer}(`;
  });
}

function formatOdo(source) {
  let text = source;

  text = text.replace(/\[\[\[\s*([\s\S]*?)\s*\]\]\]/g, (_, inner) => {
    return normalizeInlineTag("[[[", inner, "]]]");
  });

  text = text.replace(/\[\[!\s*([\s\S]*?)\s*!\]\]/g, (_, inner) => {
    return normalizeInlineTag("[[!", inner, "!]]");
  });

  text = text.replace(/\[\[--\s*([\s\S]*?)\s*--\]\]/g, (_, inner) => {
    return normalizeInlineTag("[[--", inner, "--]]");
  });

  text = text.replace(/\[\[(?!\[|!|--)\s*([\s\S]*?)\s*\]\]/g, (_, inner) => {
    return normalizeInlineTag("[[", inner, "]]");
  });

  text = applyDirectiveSpacing(text, SPACE_BEFORE_PAREN_DIRECTIVES, " ");
  text = applyDirectiveSpacing(text, TIGHT_PAREN_DIRECTIVES, "");

  return text;
}

function formatOdoLine(line) {
  return formatOdo(line);
}

function fullDocumentRange(document) {
  const firstLine = document.lineAt(0);
  const lastLine = document.lineAt(document.lineCount - 1);

  return new vscode.Range(
    firstLine.range.start,
    lastLine.range.end
  );
}

function buildEdits(document) {
  const original = document.getText();
  const formatted = formatOdo(original);

  if (formatted === original) {
    return [];
  }

  return [vscode.TextEdit.replace(fullDocumentRange(document), formatted)];
}

function buildLineEdits(document, position) {
  const line = document.lineAt(position.line);
  const original = line.text;
  const formatted = formatOdoLine(original);

  if (formatted === original) {
    return [];
  }

  return [vscode.TextEdit.replace(line.range, formatted)];
}

function activate(context) {
  const helperWatcher = vscode.workspace.createFileSystemWatcher(
    "**/{helpers.php,notifier.php,broadcast.php}"
  );

  helperWatcher.onDidCreate(invalidateHelperIndex);
  helperWatcher.onDidChange(invalidateHelperIndex);
  helperWatcher.onDidDelete(invalidateHelperIndex);

  context.subscriptions.push(helperWatcher);

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(ODO_SELECTOR, {
      provideDocumentFormattingEdits(document) {
        return buildEdits(document);
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider(ODO_SELECTOR, {
      provideDocumentRangeFormattingEdits(document) {
        return buildEdits(document);
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerOnTypeFormattingEditProvider(
      ODO_SELECTOR,
      {
        provideOnTypeFormattingEdits(document, position) {
          return buildLineEdits(document, position);
        },
      },
      "]",
      ")"
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(PHP_SELECTOR, {
      provideCompletionItems(document, position) {
        return provideHelperCompletions(document, position);
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerSignatureHelpProvider(
      PHP_SELECTOR,
      {
        provideSignatureHelp(document, position) {
          return provideHelperSignatures(document, position);
        },
      },
      "(",
      ","
    )
  );

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(PHP_SELECTOR, {
      provideDefinition(document, position) {
        return providePhpDefinitions(document, position);
      },
    })
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
