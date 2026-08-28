import 'dotenv/config';
import { data as licenseCommand } from './commands/license.js';
import { data as banCommand } from './commands/ban.js';
import { data as muteCommand } from './commands/mute.js';
import { data as warnCommand } from './commands/warn.js';
import { data as downloadCommand } from './commands/download.js';
import { registerCommands } from './registerCommands.js';

// Manual/CI use only — index.js now does this automatically on every
// startup, so you shouldn't need to run this by hand anymore. Kept around
// as an explicit way to (re)register without starting the whole bot.
try {
  const result = await registerCommands([licenseCommand, banCommand, muteCommand, warnCommand, downloadCommand]);
  console.log(`Registered ${result.count} command(s) to ${result.scope}.`);
} catch (err) {
  console.error('Failed to register commands:', err.message);
  process.exit(1);
}
