import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function prepareExtendedTemplate() {
  const sourcePath = '/Users/yashjee/Downloads/study-leaderboard.svg';
  let svg = readFileSync(sourcePath, 'utf8');

  const names = [
    { rank: 12, name: 'Riya', slug: 'riya', boxX: 146, textX: 173, userX: 327, hoursX: 729 },
    { rank: 13, name: 'Aryan', slug: 'aryan', boxX: 146, textX: 173, userX: 327, hoursX: 729 },
    { rank: 14, name: 'Meera', slug: 'meera', boxX: 146, textX: 173, userX: 327, hoursX: 729 },
    { rank: 15, name: 'Rohit', slug: 'rohit', boxX: 146, textX: 173, userX: 327, hoursX: 729 },
    { rank: 16, name: 'Siya', slug: 'siya', boxX: 146, textX: 173, userX: 327, hoursX: 729 },
    { rank: 17, name: 'Vivaan', slug: 'vivaan', boxX: 146, textX: 173, userX: 327, hoursX: 729 },
    { rank: 18, name: 'Naina', slug: 'naina', boxX: 146, textX: 173, userX: 327, hoursX: 729 },
    { rank: 19, name: 'Arjun', slug: 'arjun', boxX: 797, textX: 824, userX: 985, hoursX: 1390 },
    { rank: 20, name: 'Kavya', slug: 'kavya', boxX: 797, textX: 824, userX: 985, hoursX: 1390 },
    { rank: 21, name: 'Manav', slug: 'manav', boxX: 797, textX: 824, userX: 985, hoursX: 1390 },
    { rank: 22, name: 'Zara', slug: 'zara', boxX: 797, textX: 824, userX: 985, hoursX: 1390 },
    { rank: 23, name: 'Yash', slug: 'yash', boxX: 797, textX: 824, userX: 985, hoursX: 1390 },
    { rank: 24, name: 'Aanya', slug: 'aanya', boxX: 797, textX: 824, userX: 985, hoursX: 1390 },
    { rank: 25, name: 'Harsh', slug: 'harsh', boxX: 797, textX: 824, userX: 985, hoursX: 1390 },
  ];

  for (const item of names) {
    const { rank, name, boxX, textX, userX, hoursX } = item;

    // 1. Tag rank box
    const boxTarget = `<rect x="${boxX}"`;
    const boxReplacement = `<rect id="study-ext-rank-box-${rank}" x="${boxX}"`;
    const rankTextTarget = `>${rank}</text>`;
    const rankPos = svg.indexOf(rankTextTarget);
    if (rankPos !== -1) {
      const preceding = svg.lastIndexOf(boxTarget, rankPos);
      if (preceding !== -1) {
        svg = svg.substring(0, preceding) + boxReplacement + svg.substring(preceding + boxTarget.length);
      }
    }

    // 2. Tag rank text
    const textTarget = `<text x="${textX}" y="`;
    const textPos = svg.indexOf(rankTextTarget);
    if (textPos !== -1) {
      const textTagStart = svg.lastIndexOf(textTarget, textPos);
      if (textTagStart !== -1) {
        const textReplacement = `<text id="study-ext-rank-num-${rank}" x="${textX}" y="`;
        svg = svg.substring(0, textTagStart) + textReplacement + svg.substring(textTagStart + textTarget.length);
      }
    }

    // 3. Tag username
    const userTarget = `>${name}</text>`;
    const userPos = svg.indexOf(userTarget);
    if (userPos !== -1) {
      const userTagStart = svg.lastIndexOf(`<text x="${userX}"`, userPos);
      if (userTagStart !== -1) {
        const userReplacement = `<text id="study-ext-user-${rank}" x="${userX}"`;
        svg = svg.substring(0, userTagStart) + userReplacement + svg.substring(userTagStart + `<text x="${userX}"`.length);
      }
    }

    // 4. Tag rank pill and hours
    // Everything between `id="study-ext-user-${rank}"...>${name}</text>` and `<text x="${hoursX}"`
    const pillRegex = new RegExp(
      `(<text id="study-ext-user-${rank}"[^>]*>${name}</text>\\s*)(<rect x="[^"]*"[^>]*>[\\s\\S]*?</text>)(\\s*<text )(x="${hoursX}")`
    );

    svg = svg.replace(pillRegex, (_match, p1, p2, p3, p4) => {
      return `${p1}<g id="study-ext-rank-pill-${rank}">\n${p2}\n</g>${p3}id="study-ext-hours-${rank}" ${p4}`;
    });
  }

  const destPath = resolve(process.cwd(), 'templates', 'voice-leaderboard', 'study-leaderboard.svg');
  const extDestPath = resolve(process.cwd(), 'templates', 'voice-leaderboard', 'study-leaderboard-extended.svg');

  writeFileSync(destPath, svg, 'utf8');
  writeFileSync(extDestPath, svg, 'utf8');

  console.log(`Saved study-leaderboard.svg and study-leaderboard-extended.svg clean`);
}

prepareExtendedTemplate();
