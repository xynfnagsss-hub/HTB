const gray = s => '\x1b[90m' + s + '\x1b[0m';
const cyan = s => '\x1b[36m' + s + '\x1b[0m';
const blue = s => '\x1b[34m' + s + '\x1b[0m';
const green = s => '\x1b[32m' + s + '\x1b[0m';
const yellow = s => '\x1b[33m' + s + '\x1b[0m';
const bold = s => '\x1b[1m' + s + '\x1b[0m';

console.log(gray('[2026-08-10 20:38:00 UTC]') + ' ' + cyan('[GATEWAY_EVENT]') + ' MESSAGE_CREATE in #bot-commands');
console.log(gray('[2026-08-10 20:38:00 UTC]') + ' ' + blue('[DISPATCH]') + ' Author: ' + bold('rxserve') + ' | Content: ' + yellow('".unlockdown"'));
console.log(gray('[2026-08-10 20:38:01 UTC]') + ' ' + blue('[rxserve-handler]') + ' ' + green('[COMMAND]') + ' Executing command: ' + bold('.unlockdown'));
console.log(gray('[2026-08-10 20:38:01 UTC]') + ' ' + cyan('[rxserve-core]') + ' [INFO] Global unlock initiated across all categories and channels...');
console.log(gray('[2026-08-10 20:38:02 UTC]') + ' ' + yellow('[rxserve-sync]') + ' [OVERWRITE] Applying @everyone -> ViewChannel: ALLOW (True)');
console.log(gray('[2026-08-10 20:38:03 UTC]') + ' ' + cyan('[rxserve-sync]') + ' [PROCESSING] 48/48 channels unlocked:');
console.log('  ├── [PUBLIC_CHANNELS] -> ' + green('Unlocked'));
console.log('  ├── [COMMUNITY_VOICE] -> ' + green('Unlocked'));
console.log('  ├── [STAFF_HQ]        -> ' + yellow('Unlocked (Overwrites Cleared)'));
console.log('  └── [ADMIN_ZONES]     -> ' + yellow('Unlocked (Overwrites Cleared)'));
console.log(gray('[2026-08-10 20:38:04 UTC]') + ' ' + green('[rxserve-core]') + ' ' + green('[SUCCESS]') + ' ' + bold('".unlockdown"') + ' completed successfully. All server channels unlocked.');
