const fs = require('fs');
const path = require('path');

const replacements = [
  // 1. Brand removal
  { from: /OpenSpec/g, to: 'Superspec' },
  { from: /Superpowers/g, to: 'Superspec' },
  { from: /Double-Star Workflow/g, to: 'Superspec Autonomous Engine' },
  { from: /双星工作流/g, to: 'Superspec 自律引擎' },

  // 4. Folder & File Pathing
  { from: /openspec\/changes\//g, to: '.superspec/missions/' },
  { from: /openspec\/archive\//g, to: '.superspec/missions/archive/' },
  { from: /proposal\.md/g, to: 'intent.md' },
  { from: /design\.md/g, to: 'blueprint.md' },
  { from: /tasks\.md/g, to: 'roadmap.md' },
  { from: /docs\/superpowers\/specs\//g, to: '.superspec/specs/' },
  { from: /docs\/superpowers\/plans\//g, to: '.superspec/missions/' },

  // 5. State File
  { from: /\.superspec\.yaml/g, to: 'state.yaml' },

  // Variables, Events, Skills (specific patterns only)
  { from: /verify_result/g, to: 'Refine_result' },
  { from: /verifyResult/g, to: 'RefineResult' },
  { from: /verify_mode/g, to: 'Refine_mode' },
  { from: /verifyMode/g, to: 'RefineMode' },
  { from: /design_doc/g, to: 'Blueprint_doc' },
  { from: /designDoc/g, to: 'BlueprintDoc' },
  { from: /open-complete/g, to: 'Vision-complete' },
  { from: /design-complete/g, to: 'Blueprint-complete' },
  { from: /build-complete/g, to: 'Forge-complete' },
  { from: /verify-pass/g, to: 'Refine-pass' },
  { from: /verify-fail/g, to: 'Refine-fail' },
  { from: /archive-reopen/g, to: 'Deliver-reopen' },
  { from: /superspec-open/g, to: 'superspec-Vision' },
  { from: /superspec-design/g, to: 'superspec-Blueprint' },
  { from: /superspec-build/g, to: 'superspec-Forge' },
  { from: /superspec-verify/g, to: 'superspec-Refine' },
  { from: /superspec-archive/g, to: 'superspec-Deliver' },

  // Rule files
  { from: /superspec-phase-open/g, to: 'superspec-phase-Vision' },
  { from: /superspec-phase-design/g, to: 'superspec-phase-Blueprint' },
  { from: /superspec-phase-build/g, to: 'superspec-phase-Forge' },
  { from: /superspec-phase-verify-archive/g, to: 'superspec-phase-Refine-Deliver' },

  // Command Files and Imports
  { from: /initCommand/g, to: 'igniteCommand' },
  { from: /statusCommand/g, to: 'gaugeCommand' },
  { from: /doctorCommand/g, to: 'mendCommand' },
  { from: /updateCommand/g, to: 'syncCommand' },
  { from: /commands\/init\.js/g, to: 'commands/ignite.js' },
  { from: /commands\/status\.js/g, to: 'commands/gauge.js' },
  { from: /commands\/doctor\.js/g, to: 'commands/mend.js' },
  { from: /commands\/update\.js/g, to: 'commands/sync.js' },

  // 2. Phase Renaming — ONLY in Superspec phase context
  //    Match "phase: open", "'open'", phase names in quotes or after colons
  //    Do NOT match generic words like "open a file", "build a project"
  { from: /(?<=phase:\s*)open\b/g, to: 'Vision' },
  { from: /(?<=phase:\s*)design\b/g, to: 'Blueprint' },
  { from: /(?<=phase:\s*)build\b/g, to: 'Forge' },
  { from: /(?<=phase:\s*)verify\b/g, to: 'Refine' },
  { from: /(?<=phase:\s*)archive\b/g, to: 'Deliver' },
  { from: /(?<=['"])open(?=['"])/g, to: 'Vision' },
  { from: /(?<=['"])design(?=['"])/g, to: 'Blueprint' },
  { from: /(?<=['"])build(?=['"])/g, to: 'Forge' },
  { from: /(?<=['"])verify(?=['"])/g, to: 'Refine' },
  { from: /(?<=['"])archive(?=['"])/g, to: 'Deliver' },

  // 3. Command Renaming — specific CLI commands only
  { from: /(?<=\s)init\b(?=\s|$)/g, to: 'ignite' },
  { from: /(?<=\s)status\b(?=\s|$)/g, to: 'gauge' },
  { from: /(?<=\s)doctor\b(?=\s|$)/g, to: 'mend' },
  { from: /(?<=\s)update\b(?=\s|$)/g, to: 'sync' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walkSync(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, callback);
    } else {
      callback(filepath);
    }
  }
}

// Target paths:
// - src/**/*.ts
// - bin/superspec.js
// - assets/skills/**/*.md
// - assets/skills/superspec/scripts/*.sh
// - assets/manifest.json
// - package.json

const filesToProcess = [
  'bin/superspec.js',
  'assets/manifest.json',
  'package.json'
];

walkSync('src', (filepath) => {
  if (filepath.endsWith('.ts')) filesToProcess.push(filepath);
});

walkSync('assets/skills', (filepath) => {
  if (filepath.endsWith('.md')) filesToProcess.push(filepath);
  if (filepath.includes(path.normalize('superspec/scripts')) && filepath.endsWith('.sh')) {
    filesToProcess.push(filepath);
  }
});

for (const file of filesToProcess) {
  if (fs.existsSync(file)) {
    processFile(file);
  }
}

console.log('Rebranding script complete.');
