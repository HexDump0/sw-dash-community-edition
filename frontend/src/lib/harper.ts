/* eslint-disable @typescript-eslint/no-explicit-any */
let linterPromise: Promise<any> | null = null;

async function getLinter(): Promise<any> {
  if (!linterPromise) {
    linterPromise = (async () => {
      const harper = await import('harper.js');
      const { binaryInlined } = await import('harper.js/binaryInlined');
      const linter = new harper.WorkerLinter({ binary: binaryInlined });
      await linter.setup();
      return linter;
    })();
  }
  return linterPromise;
}

export async function fixGrammar(text: string): Promise<string> {
  if (!text.trim()) return text;
  const linter = await getLinter();
  const lints = await linter.lint(text);
  if (!lints || lints.length === 0) return text;

  const corrections: { start: number; end: number; replacement: string }[] = [];
  for (const lint of lints) {
    const suggestions = lint.suggestions ? lint.suggestions() : [];
    if (!suggestions || suggestions.length === 0) continue;
    const span = lint.span ? lint.span() : { start: 0, end: 0 };
    corrections.push({
      start: span.start,
      end: span.end,
      replacement: suggestions[0].get_replacement_text ? suggestions[0].get_replacement_text() : '',
    });
  }

  let result = text;
  for (const { start, end, replacement } of corrections.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + replacement + result.slice(end);
  }
  return result;
}
