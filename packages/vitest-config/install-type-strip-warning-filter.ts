let installed = false;

export function installTypeStripWarningFilter(): void {
  if (installed || typeof process === "undefined" || !process.emitWarning) {
    installed = true;
    return;
  }

  const suppressedMessage = "Type Stripping is an experimental feature";
  const originalEmitWarning = process.emitWarning;

  process.emitWarning = function emitWarningProxy(
    warning: string | Error,
    ...rest: any[]
  ) {
    const message =
      typeof warning === "string"
        ? warning
        : warning instanceof Error
          ? warning.message
          : "";

    if (message.includes(suppressedMessage)) {
      return;
    }

    return originalEmitWarning.call(process, warning, ...(rest as []));
  };

  installed = true;
}
