import yoctoSpinner from "yocto-spinner";

export interface SpinnerOptions {
  text: string;
  successText?: string;
  silent?: boolean;
}

export async function withSpinner<T>(opts: SpinnerOptions, run: () => Promise<T>): Promise<T> {
  if (opts.silent) return run();
  const spinner = yoctoSpinner({ text: opts.text }).start();
  try {
    const result = await run();
    if (opts.successText) {
      spinner.success(opts.successText);
    } else {
      spinner.stop();
    }
    return result;
  } catch (err) {
    spinner.error(`${opts.text} failed`);
    throw err;
  }
}
