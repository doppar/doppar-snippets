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
  const selector = { language: "odo" };

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(selector, {
      provideDocumentFormattingEdits(document) {
        return buildEdits(document);
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider(selector, {
      provideDocumentRangeFormattingEdits(document) {
        return buildEdits(document);
      },
    })
  );

  context.subscriptions.push(
    vscode.languages.registerOnTypeFormattingEditProvider(
      selector,
      {
        provideOnTypeFormattingEdits(document, position) {
          return buildLineEdits(document, position);
        },
      },
      "]",
      ")"
    )
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
