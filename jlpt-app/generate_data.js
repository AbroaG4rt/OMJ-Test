const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const adminDir = path.join(__dirname, 'admin-format');

// Create directories if they don't exist
[dataDir, adminDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Users DB
const users = [
    { name: "Satoshi Nakamoto", password: "pwd123" },
    { name: "Test User", password: "123" }
];
fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2));

// Question levels setup
const levelsConfig = {
    "N5": { kanji: 30, bunpou: 35, choukai: 30, time: 120 },
    "N4": { kanji: 30, bunpou: 40, choukai: 30, time: 125 },
    "N3": { kanji: 35, bunpou: 50, choukai: 45, time: 130 },
    "N2": { kanji: 40, bunpou: 55, choukai: 40, time: 140 },
    "N1": { kanji: 45, bunpou: 60, choukai: 35, time: 150 }
};

const templates = {
    kanji: [
        { type: 'reading', q: "What does '先生 (Sensei)' mean?", opts: ["Student", "School", "Teacher", "Doctor"], ans: "Teacher" },
        { type: 'image', q: "Is this correct kanji for water? 水", opts: ["Yes", "No", "Maybe", "Unknown"], ans: "Yes", image: "water.jpg" },
        { type: 'reading', q: "Fill in the correct kanji: ___曜日", opts: ["月", "犬", "猫", "空"], ans: "月" }
    ],
    bunpou: [
        { type: 'grammar', q: "Which particle is correct? 本_読みます。", opts: ["を", "が", "は", "と"], ans: "を" },
        { type: 'grammar', q: "Choose the correct translation: 'I eat apple.'", opts: ["りんごを食べます。", "りんごが食べます。", "りんごに食べます。", "りんごは食べます。"], ans: "りんごを食べます。" },
        { type: 'reading', q: "Fill in the blank: 私_学生です。", opts: ["は", "が", "を", "に"], ans: "は" }
    ],
    choukai: [
        { type: 'listening', q: "Listen to the audio and find the meaning.", opts: ["Hello", "Goodbye", "Thank you", "Sorry"], ans: "Hello", audio: "hello.mp3" }
    ]
};

for (const [level, config] of Object.entries(levelsConfig)) {
    const data = {
        sections: [
            {
                id: 'kanji',
                title: '文字・語彙 (Kanji & Vocabulary)',
                questions: []
            },
            {
                id: 'bunpou',
                title: '文法・読解 (Grammar & Reading)',
                questions: []
            },
            {
                id: 'choukai',
                title: '聴解 (Listening)',
                questions: []
            }
        ]
    };
    
    // Generate Kanji
    for(let i = 0; i < config.kanji; i++) {
        const tmpl = templates.kanji[Math.floor(Math.random() * templates.kanji.length)];
        let qItem = {
            id: `${level}-K-${i+1}`,
            type: tmpl.type,
            question: `${level} Kanji - Q${i+1}: ` + tmpl.q,
            options: { 'A': tmpl.opts[0], 'B': tmpl.opts[1], 'C': tmpl.opts[2], 'D': tmpl.opts[3] },
            correctAnswer: ["A", "B", "C", "D"][tmpl.opts.indexOf(tmpl.ans)]
        };
        if (tmpl.image) qItem.image = tmpl.image;
        data.sections[0].questions.push(qItem);
    }
    
    // Generate Bunpou
    for(let i = 0; i < config.bunpou; i++) {
        const tmpl = templates.bunpou[Math.floor(Math.random() * templates.bunpou.length)];
        let qItem = {
            id: `${level}-B-${i+1}`,
            type: tmpl.type,
            question: `${level} Bunpou - Q${i+1}: ` + tmpl.q,
            options: { 'A': tmpl.opts[0], 'B': tmpl.opts[1], 'C': tmpl.opts[2], 'D': tmpl.opts[3] },
            correctAnswer: ["A", "B", "C", "D"][tmpl.opts.indexOf(tmpl.ans)]
        };
        data.sections[1].questions.push(qItem);
    }
    
    // Generate Choukai
    for(let i = 0; i < config.choukai; i++) {
        const tmpl = templates.choukai[Math.floor(Math.random() * templates.choukai.length)];
        let qItem = {
            id: `${level}-C-${i+1}`,
            type: tmpl.type,
            question: `${level} Choukai - Q${i+1}: ` + tmpl.q,
            options: { 'A': tmpl.opts[0], 'B': tmpl.opts[1], 'C': tmpl.opts[2], 'D': tmpl.opts[3] },
            correctAnswer: ["A", "B", "C", "D"][tmpl.opts.indexOf(tmpl.ans)]
        };
        if (tmpl.audio) qItem.audio = tmpl.audio;
        data.sections[2].questions.push(qItem);
    }
    
    fs.writeFileSync(path.join(dataDir, `${level}.json`), JSON.stringify(data, null, 2));
    console.log(`Generated ${level}.json with ${config.kanji + config.bunpou + config.choukai} questions.`);
}

const templateFormat = {
  sections: [
    {
      id: "kanji",
      title: "Kanji & Vocabulary",
      questions: [
        {
          id: "N5-K-1",
          type: "image | reading",
          question: "Question text goes here",
          options: {
            "A": "Option 1",
            "B": "Option 2",
            "C": "Option 3",
            "D": "Option 4"
          },
          correctAnswer: "A",
          image: "optional_image_url.png"
        }
      ]
    }
  ]
};

fs.writeFileSync(path.join(adminDir, 'question-template.json'), JSON.stringify(templateFormat, null, 2));
console.log('Generated Data.');
