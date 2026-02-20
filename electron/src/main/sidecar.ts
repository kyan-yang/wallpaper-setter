import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class Sidecar {
  private binaryPath: string;

  constructor(binaryPath: string) {
    this.binaryPath = binaryPath;
  }

  async run(command: string, args: string[] = []): Promise<any> {
    try {
      const { stdout } = await execFileAsync(this.binaryPath, [command, ...args], {
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10,
      });
      return JSON.parse(stdout.trim());
    } catch (error: any) {
      if (error.stderr) {
        try {
          return JSON.parse(error.stderr.trim());
        } catch {
          // fall through
        }
      }
      return {
        error: true,
        code: 'sidecar_failed',
        message: error.message || 'CLI command failed',
        suggestion: 'Make sure the Swift CLI is built. Run: swift build',
      };
    }
  }
}
