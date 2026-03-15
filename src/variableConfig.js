// Variable Categories and Harmonization Configuration
// Based on comprehensive analysis of Asian Barometer Survey codebooks (Waves 1-5)

export const WAVE_CATEGORIES = {
  wave1: [
    { id: "A", name: "Economic Evaluations" },
    { id: "B", name: "Trust in Institutions" },
    { id: "C", name: "Social Capital" },
    { id: "D", name: "Guanxi-Based Social Capital" },
    { id: "E", name: "Participation in Elections" },
    { id: "F", name: "Electoral Mobilization" },
    { id: "G", name: "Psychological Involvement" },
    { id: "H", name: "Partisanship" },
    { id: "I", name: "Agreement/Disagreement with Specific Statements" },
    { id: "J", name: "Political Participation" },
    { id: "K", name: "Meaning of Democracy" },
    { id: "L", name: "Satisfaction with Government and Democracy" },
    { id: "M", name: "Preference for Democracy" },
    { id: "N", name: "Regime Evaluation" },
    { id: "O", name: "Democratic Legitimacy" },
    { id: "P", name: "Socio-Economic Background" }
  ],
  wave2: [
    { id: "A", name: "Economic Evaluations" },
    { id: "B", name: "Trust in Institutions" },
    { id: "C", name: "Social Capital" },
    { id: "D", name: "Human Security" },
    { id: "E", name: "Participation in Elections" },
    { id: "F", name: "Access to Public Service" },
    { id: "G", name: "Psychological Involvement" },
    { id: "H", name: "Partisanship" },
    { id: "I", name: "Traditionalism" },
    { id: "J", name: "Globalization" },
    { id: "K", name: "Political Participation" },
    { id: "L", name: "Satisfaction with Democracy" },
    { id: "M", name: "Quality of Governance" },
    { id: "N", name: "Democratic Legitimacy" },
    { id: "O", name: "Authoritarian/Democratic Values" },
    { id: "P", name: "Citizenship" },
    { id: "Q", name: "International Relations" },
    { id: "R", name: "Socio-Economic Background" }
  ],
  wave3: [
    { id: "A", name: "Economic Evaluations" },
    { id: "B", name: "Trust in Institutions" },
    { id: "C", name: "Social Capital" },
    { id: "D", name: "Participation in Elections" },
    { id: "E", name: "Access to Public Service" },
    { id: "F", name: "Psychological Involvement" },
    { id: "G", name: "Partisanship" },
    { id: "H", name: "Traditionalism" },
    { id: "I", name: "Political Participation" },
    { id: "J", name: "Regime Preference" },
    { id: "K", name: "Meaning of Democracy" },
    { id: "L", name: "Satisfaction with Democracy" },
    { id: "M", name: "Quality of Governance" },
    { id: "N", name: "Democratic Legitimacy" },
    { id: "O", name: "Globalization" },
    { id: "P", name: "Citizenship" },
    { id: "Q", name: "International Relations" },
    { id: "R", name: "Socio-Economic Background" }
  ],
  wave4: [
    { id: "A", name: "Economic Evaluations" },
    { id: "B", name: "Trust in Institutions" },
    { id: "C", name: "Social Capital" },
    { id: "D", name: "Participation in Elections" },
    { id: "E", name: "Access to Public Service" },
    { id: "F", name: "Psychological Involvement" },
    { id: "G", name: "Internet and Social Media" },
    { id: "H", name: "Partisanship" },
    { id: "I", name: "Traditionalism" },
    { id: "J", name: "Political Participation" },
    { id: "K", name: "Regime Preference" },
    { id: "L", name: "Meaning of Democracy" },
    { id: "M", name: "Satisfaction with Democracy" },
    { id: "N", name: "Quality of Governance" },
    { id: "O", name: "Democratic Legitimacy" },
    { id: "P", name: "Authoritarian/Democratic Values" },
    { id: "Q", name: "Globalization" },
    { id: "R", name: "Redistribution" },
    { id: "S", name: "Citizenship" },
    { id: "T", name: "International Relations" },
    { id: "U", name: "Socio-Economic Background" }
  ],
  wave5: [
    { id: "A", name: "Economic Evaluations" },
    { id: "B", name: "Trust in Institutions" },
    { id: "C", name: "Social Capital" },
    { id: "D", name: "Participation in Elections" },
    { id: "E", name: "Access to Public Service" },
    { id: "F", name: "Psychological Involvement" },
    { id: "G", name: "Internet and Social Media" },
    { id: "H", name: "Partisanship" },
    { id: "I", name: "Traditionalism" },
    { id: "J", name: "Political Participation" },
    { id: "K", name: "Regime Preference" },
    { id: "L", name: "Meaning of Democracy" },
    { id: "M", name: "Satisfaction with Democracy" },
    { id: "N", name: "Quality of Governance" },
    { id: "O", name: "Democratic Legitimacy" },
    { id: "P", name: "Authoritarian/Democratic Values" },
    { id: "Q", name: "Globalization" },
    { id: "R", name: "Redistribution" },
    { id: "S", name: "Citizenship" },
    { id: "T", name: "Democratic Deconsolidation" },
    { id: "U", name: "International Relations" },
    { id: "V", name: "Socio-Economic Background" }
  ]
};

// ===========================
// HARMONIZED VARIABLES FOR TIME SERIES
// ===========================

export const HARMONIZED_VARIABLES = [
  // ===== ECONOMIC EVALUATIONS =====
  {
    id: "national_econ_current",
    label: "National Economic Condition (Current)",
    description: "How would you rate the overall economic condition of our country today?",
    category: "Economic Evaluations",
    responseScale: { type: "5-point", labels: "1=Very bad/good → 5=Very good/bad" },
    waves: {
      wave1: { var: "q001", reversed: true, scale: [1, 5] },
      wave2: { var: "q1", reversed: false, scale: [1, 5] },
      wave3: { var: "q1", reversed: false, scale: [1, 5] },
      wave4: { var: "q1", reversed: false, scale: [1, 5] },
      wave5: { var: "q1", reversed: false, scale: [1, 5] }
    },
    notes: "W1 reversed (1=Bad→5=Good). W2-5: 1=Good→5=Bad. Harmonized so lower=better."
  },
  {
    id: "national_econ_retrospective",
    label: "National Economic Condition (Retrospective)",
    description: "How would you describe the change in the economic condition of our country over the last few years?",
    category: "Economic Evaluations",
    responseScale: { type: "5-point" },
    waves: {
      wave1: { var: "q002", reversed: true, scale: [1, 5] },
      wave2: { var: "q2", reversed: false, scale: [1, 5] },
      wave3: { var: "q2", reversed: false, scale: [1, 5] },
      wave4: { var: "q2", reversed: false, scale: [1, 5] },
      wave5: { var: "q2", reversed: false, scale: [1, 5] }
    },
    notes: "W1 reversed."
  },
  {
    id: "national_econ_prospective",
    label: "National Economic Condition (Prospective)",
    description: "What do you think will be the state of our country's economic condition a few years from now?",
    category: "Economic Evaluations",
    responseScale: { type: "5-point" },
    waves: {
      wave1: { var: "q003", reversed: true, scale: [1, 5] },
      wave2: { var: "q3", reversed: false, scale: [1, 5] },
      wave3: { var: "q3", reversed: false, scale: [1, 5] },
      wave4: { var: "q3", reversed: false, scale: [1, 5] },
      wave5: { var: "q3", reversed: false, scale: [1, 5] }
    },
    notes: "W1 reversed."
  },
  {
    id: "family_econ_current",
    label: "Family Economic Condition (Current)",
    description: "How do you rate the economic situation of your family today?",
    category: "Economic Evaluations",
    responseScale: { type: "5-point" },
    waves: {
      wave1: { var: "q004", reversed: true, scale: [1, 5] },
      wave2: { var: "q4", reversed: false, scale: [1, 5] },
      wave3: { var: "q4", reversed: false, scale: [1, 5] },
      wave4: { var: "q4", reversed: false, scale: [1, 5] },
      wave5: { var: "q4", reversed: false, scale: [1, 5] }
    },
    notes: "W1 reversed."
  },
  {
    id: "family_econ_retrospective",
    label: "Family Economic Condition (Retrospective)",
    description: "How would you compare the current economic condition of your family with a few years ago?",
    category: "Economic Evaluations",
    responseScale: { type: "5-point" },
    waves: {
      wave1: { var: "q005", reversed: true, scale: [1, 5] },
      wave2: { var: "q5", reversed: false, scale: [1, 5] },
      wave3: { var: "q5", reversed: false, scale: [1, 5] },
      wave4: { var: "q5", reversed: false, scale: [1, 5] },
      wave5: { var: "q5", reversed: false, scale: [1, 5] }
    },
    notes: "W1 reversed."
  },
  {
    id: "family_econ_prospective",
    label: "Family Economic Condition (Prospective)",
    description: "What do you think the economic situation of your family will be a few years from now?",
    category: "Economic Evaluations",
    responseScale: { type: "5-point" },
    waves: {
      wave1: { var: "q006", reversed: true, scale: [1, 5] },
      wave2: { var: "q6", reversed: false, scale: [1, 5] },
      wave3: { var: "q6", reversed: false, scale: [1, 5] },
      wave4: { var: "q6", reversed: false, scale: [1, 5] },
      wave5: { var: "q6", reversed: false, scale: [1, 5] }
    },
    notes: "W1 reversed."
  },

  // ===== TRUST IN INSTITUTIONS =====
  {
    id: "trust_courts_4pt",
    label: "Trust in Courts",
    description: "How much trust do you have in the courts?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point", labels: "1=None/Great deal → 4=Great deal/None" },
    waves: {
      wave1: { var: "q007", reversed: false, scale: [1, 4] },
      wave2: { var: "q8", reversed: false, scale: [1, 4] },
      wave3: { var: "q8", reversed: true, scale: [1, 4] },
      wave4: { var: "q8", reversed: true, scale: [1, 4] }
    },
    notes: "W1-2: 1=None→4=Great deal. W3-4: reversed. W5 excluded (6-point scale)."
  },
  {
    id: "trust_national_govt_4pt",
    label: "Trust in National Government",
    description: "How much trust do you have in the national government?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q008", reversed: false, scale: [1, 4] },
      wave2: { var: "q9", reversed: false, scale: [1, 4] },
      wave3: { var: "q9", reversed: true, scale: [1, 4] },
      wave4: { var: "q9", reversed: true, scale: [1, 4] }
    },
    notes: "W5 excluded (6-point scale)."
  },
  {
    id: "trust_parties_4pt",
    label: "Trust in Political Parties",
    description: "How much trust do you have in political parties?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q009", reversed: false, scale: [1, 4] },
      wave2: { var: "q10", reversed: false, scale: [1, 4] },
      wave3: { var: "q10", reversed: true, scale: [1, 4] },
      wave4: { var: "q10", reversed: true, scale: [1, 4] }
    },
    notes: "W5 excluded (6-point scale)."
  },
  {
    id: "trust_parliament_4pt",
    label: "Trust in Parliament",
    description: "How much trust do you have in Parliament?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q010", reversed: false, scale: [1, 4] },
      wave2: { var: "q11", reversed: false, scale: [1, 4] },
      wave3: { var: "q11", reversed: true, scale: [1, 4] },
      wave4: { var: "q11", reversed: true, scale: [1, 4] }
    },
    notes: "W5 excluded (6-point scale)."
  },
  {
    id: "trust_civil_service_4pt",
    label: "Trust in Civil Service",
    description: "How much trust do you have in the civil service?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q011", reversed: false, scale: [1, 4] },
      wave2: { var: "q12", reversed: false, scale: [1, 4] },
      wave3: { var: "q12", reversed: true, scale: [1, 4] },
      wave4: { var: "q12", reversed: true, scale: [1, 4] }
    },
    notes: "W5 excluded (6-point scale)."
  },
  {
    id: "trust_military_4pt",
    label: "Trust in Military",
    description: "How much trust do you have in the military?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q012", reversed: false, scale: [1, 4] },
      wave2: { var: "q13", reversed: false, scale: [1, 4] },
      wave3: { var: "q13", reversed: true, scale: [1, 4] },
      wave4: { var: "q13", reversed: true, scale: [1, 4] }
    },
    notes: "W5 excluded (6-point scale)."
  },
  {
    id: "trust_police_4pt",
    label: "Trust in Police",
    description: "How much trust do you have in the police?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q013", reversed: false, scale: [1, 4] },
      wave2: { var: "q14", reversed: false, scale: [1, 4] },
      wave3: { var: "q14", reversed: true, scale: [1, 4] },
      wave4: { var: "q14", reversed: true, scale: [1, 4] }
    },
    notes: "W5 excluded (6-point scale)."
  },
  {
    id: "trust_local_govt_4pt",
    label: "Trust in Local Government",
    description: "How much trust do you have in local government?",
    category: "Trust in Institutions",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q014", reversed: false, scale: [1, 4] },
      wave2: { var: "q15", reversed: false, scale: [1, 4] },
      wave3: { var: "q15", reversed: true, scale: [1, 4] },
      wave4: { var: "q15", reversed: true, scale: [1, 4] }
    },
    notes: "W5 excluded (6-point scale)."
  },

  // ===== SOCIAL CAPITAL =====
  {
    id: "interpersonal_trust",
    label: "Generalized Interpersonal Trust",
    description: "Generally speaking, would you say that most people can be trusted or that you must be very careful?",
    category: "Social Capital",
    responseScale: { type: "binary", labels: "1=Careful, 2=Trusted (harmonized)" },
    waves: {
      wave1: { var: "q024", reversed: false, scale: [1, 2] },
      wave2: { var: "q23", reversed: false, scale: [1, 2] },
      wave3: { var: "q23", reversed: true, scale: [1, 2] },
      wave4: { var: "q23", reversed: true, scale: [1, 2] },
      wave5: { var: "q22", reversed: true, scale: [1, 2] }
    },
    notes: "W1-2: 1=Careful, 2=Trust. W3-5: 1=Trust, 2=Careful (reversed). Harmonized so higher=more trust."
  },

  // ===== PSYCHOLOGICAL INVOLVEMENT =====
  {
    id: "political_interest",
    label: "Interest in Politics",
    description: "How interested would you say you are in politics?",
    category: "Psychological Involvement",
    responseScale: { type: "4-point", labels: "Harmonized: lower=more interested" },
    waves: {
      wave1: { var: "q056", reversed: true, scale: [1, 4] },
      wave2: { var: "q49", reversed: true, scale: [1, 4] },
      wave3: { var: "q43", reversed: false, scale: [1, 4] },
      wave4: { var: "q44", reversed: false, scale: [1, 4] },
      wave5: { var: "q46", reversed: false, scale: [1, 4] }
    },
    notes: "W1-2: 1=Not at all→4=Very. W3-5: 1=Very→4=Not at all. W1-2 reversed to match W3-5 direction."
  },

  // ===== TRADITIONALISM =====
  {
    id: "trad_obey_parents",
    label: "Children Should Obey Parents",
    description: "Even if parents' demands are unreasonable, children still should do what they ask.",
    category: "Traditionalism",
    responseScale: { type: "4-point", labels: "1=Strongly agree → 4=Strongly disagree" },
    waves: {
      wave1: { var: "q064", reversed: false, scale: [1, 4] },
      wave2: { var: "q56", reversed: false, scale: [1, 4] },
      wave3: { var: "q55", reversed: false, scale: [1, 4] },
      wave4: { var: "q60", reversed: false, scale: [1, 4] },
      wave5: { var: "q62", reversed: false, scale: [1, 4] }
    },
    notes: "Consistent 4-point agreement scale. Lower=more traditional."
  },
  {
    id: "trad_family_over_individual",
    label: "Family Over Individual",
    description: "For the sake of the family, the individual should put his personal interests second.",
    category: "Traditionalism",
    responseScale: { type: "4-point", labels: "1=Strongly agree → 4=Strongly disagree" },
    waves: {
      wave1: { var: "q069", reversed: false, scale: [1, 4] },
      wave2: { var: "q60", reversed: false, scale: [1, 4] },
      wave3: { var: "q50", reversed: false, scale: [1, 4] },
      wave4: { var: "q55", reversed: false, scale: [1, 4] },
      wave5: { var: "q58", reversed: false, scale: [1, 4] }
    },
    notes: "Consistent 4-point agreement scale. Lower=more traditional."
  },
  {
    id: "trad_teacher_authority",
    label: "Teacher Authority",
    description: "Being a student, one should not question the authority of their teacher.",
    category: "Traditionalism",
    responseScale: { type: "4-point", labels: "1=Strongly agree → 4=Strongly disagree" },
    waves: {
      wave2: { var: "q57", reversed: false, scale: [1, 4] },
      wave3: { var: "q57", reversed: false, scale: [1, 4] },
      wave4: { var: "q62", reversed: false, scale: [1, 4] },
      wave5: { var: "q64", reversed: false, scale: [1, 4] }
    },
    notes: "Not asked in Wave 1. Consistent 4-point agreement scale."
  },

  // ===== SATISFACTION WITH DEMOCRACY =====
  {
    id: "democracy_satisfaction",
    label: "Satisfaction with Democracy",
    description: "On the whole, how satisfied or dissatisfied are you with the way democracy works in our country?",
    category: "Satisfaction with Government and Democracy",
    responseScale: { type: "4-point" },
    waves: {
      wave1: { var: "q098", reversed: false, scale: [1, 4] },
      wave2: { var: "q93", reversed: false, scale: [1, 4] },
      wave3: { var: "q89", reversed: true, scale: [1, 4] },
      wave4: { var: "q92", reversed: true, scale: [1, 4] },
      wave5: { var: "q99", reversed: true, scale: [1, 4] }
    },
    notes: "W1-2: 1=Not at all→4=Very. W3-5: 1=Very→4=Not at all (reversed). Harmonized higher=more satisfied."
  },
  {
    id: "democracy_evaluation",
    label: "Democratic Evaluation",
    description: "In your opinion, how much of a democracy is [country]?",
    category: "Satisfaction with Government and Democracy",
    responseScale: { type: "4-point", labels: "Harmonized: 1=Not a democracy → 4=Full democracy" },
    waves: {
      wave2: { var: "q94", reversed: true, scale: [1, 4] },
      wave3: { var: "q90", reversed: true, scale: [1, 4] },
      wave4: { var: "q93", reversed: true, scale: [1, 4] },
      wave5: { var: "q100", reversed: true, scale: [1, 4] }
    },
    notes: "Not in W1. Original scale: 1=Full democracy→4=Not a democracy. All reversed so harmonized 1=Not a democracy→4=Full democracy (higher=more democratic)."
  },

  // ===== DEMOCRATIC LEGITIMACY =====
  {
    id: "democracy_vs_econ",
    label: "Democracy vs. Economic Development",
    description: "If you had to choose between democracy and economic development, which would you say is more important?",
    category: "Democratic Legitimacy",
    responseScale: { type: "5-point", labels: "1=Econ definitely → 4=Democracy definitely, 5=Both equally" },
    waves: {
      wave1: { var: "q119", reversed: false, scale: [1, 5] },
      wave2: { var: "q123", reversed: false, scale: [1, 5] },
      wave3: { var: "q126", reversed: false, scale: [1, 5] },
      wave4: { var: "q127", reversed: false, scale: [1, 5] },
      wave5: { var: "q134", reversed: false, scale: [1, 5] }
    },
    notes: "Consistent scale. Note: 5='Both equally important'."
  },
  {
    id: "democracy_suitability",
    label: "Democratic Suitability",
    description: "Do you think democracy is suitable for our country? (1-10 scale)",
    category: "Democratic Legitimacy",
    responseScale: { type: "10-point", labels: "1=Completely unsuitable → 10=Completely suitable" },
    waves: {
      wave1: { var: "q103", reversed: false, scale: [1, 10] },
      wave2: { var: "q98", reversed: false, scale: [1, 10] },
      wave3: { var: "q94", reversed: false, scale: [1, 10] },
      wave4: { var: "q97", reversed: false, scale: [1, 10] },
      wave5: { var: "q104", reversed: false, scale: [1, 10] }
    },
    notes: "Consistent 1-10 scale. Higher=more suitable."
  },

  // ===== AUTHORITARIAN/DEMOCRATIC VALUES =====
  // CORRECTED W4 variable numbers per user verification
  {
    id: "paternalistic_governance",
    label: "Paternalistic Governance",
    description: "Government leaders are like the head of a family; we should all follow their decisions.",
    category: "Authoritarian/Democratic Values",
    responseScale: { type: "4-point", labels: "1=Strongly agree → 4=Strongly disagree" },
    waves: {
      wave1: { var: "q133", reversed: false, scale: [1, 4] },
      wave2: { var: "q134", reversed: false, scale: [1, 4] },
      wave3: { var: "q141", reversed: false, scale: [1, 4] },
      wave4: { var: "q142", reversed: false, scale: [1, 4] },
      wave5: { var: "q149", reversed: false, scale: [1, 4] }
    },
    notes: "Consistent 4-point agreement scale. Lower=more authoritarian."
  },
  {
    id: "govt_censorship",
    label: "Government Censorship",
    description: "The government should decide whether certain ideas should be allowed to be discussed in society.",
    category: "Authoritarian/Democratic Values",
    responseScale: { type: "4-point", labels: "1=Strongly agree → 4=Strongly disagree" },
    waves: {
      wave1: { var: "q134", reversed: false, scale: [1, 4] },
      wave2: { var: "q135", reversed: false, scale: [1, 4] },
      wave3: { var: "q142", reversed: false, scale: [1, 4] },
      wave4: { var: "q143", reversed: false, scale: [1, 4] },
      wave5: { var: "q150", reversed: false, scale: [1, 4] }
    },
    notes: "Consistent 4-point agreement scale. Lower=more authoritarian."
  },
  {
    id: "morally_upright_leaders",
    label: "Morally Upright Leaders",
    description: "If we have political leaders who are morally upright, we can let them decide everything.",
    category: "Authoritarian/Democratic Values",
    responseScale: { type: "4-point", labels: "1=Strongly agree → 4=Strongly disagree" },
    waves: {
      wave1: { var: "q138", reversed: false, scale: [1, 4] },
      wave2: { var: "q139", reversed: false, scale: [1, 4] },
      wave3: { var: "q146", reversed: false, scale: [1, 4] },
      wave4: { var: "q147", reversed: false, scale: [1, 4] },
      wave5: { var: "q154", reversed: false, scale: [1, 4] }
    },
    notes: "Consistent 4-point agreement scale. Lower=more authoritarian."
  }
];

// ===========================
// HELPER FUNCTIONS
// ===========================

export function getVariableCategory(waveKey, varName) {
  return "Other Variables";
}

export function getCategoriesForWave(waveKey, allVariables) {
  return {
    "All Variables": {
      id: "A",
      description: "All survey variables",
      variables: allVariables
    }
  };
}

export function getHarmonizedMapping(harmonizedId, waveKey) {
  const harmonized = HARMONIZED_VARIABLES.find(h => h.id === harmonizedId);
  if (!harmonized) return null;
  return harmonized.waves[waveKey] || null;
}

export function getAllHarmonizedVariables() {
  return HARMONIZED_VARIABLES;
}

export function isHarmonizedVariable(waveKey, varName) {
  const varLower = varName.toLowerCase();
  return HARMONIZED_VARIABLES.some(h => {
    const waveMapping = h.waves[waveKey];
    return waveMapping && waveMapping.var.toLowerCase() === varLower;
  });
}

export function getHarmonizedInfo(waveKey, varName) {
  const varLower = varName.toLowerCase();
  return HARMONIZED_VARIABLES.find(h => {
    const waveMapping = h.waves[waveKey];
    return waveMapping && waveMapping.var.toLowerCase() === varLower;
  });
}

// Non-response detection
export const NON_RESPONSE_CODES = new Set([-1, 0, 7, 8, 9, 95, 96, 97, 98, 99]);
export const NON_RESPONSE_KEYWORDS = [
  'missing', "don't know", 'do not understand', "can't choose", 
  'decline to answer', 'not applicable', 'refused', 'no answer',
  'cannot choose', "can't determine", "don't understand"
];

export function isNonResponse(value, label) {
  if (label) {
    const labelLower = label.toLowerCase();
    if (NON_RESPONSE_KEYWORDS.some(keyword => labelLower.includes(keyword))) {
      return true;
    }
  }
  if (NON_RESPONSE_CODES.has(value)) {
    if (!label) return true;
    const labelLower = label.toLowerCase();
    return NON_RESPONSE_KEYWORDS.some(keyword => labelLower.includes(keyword));
  }
  return false;
}

export default {
  WAVE_CATEGORIES,
  HARMONIZED_VARIABLES,
  NON_RESPONSE_CODES,
  NON_RESPONSE_KEYWORDS,
  getVariableCategory,
  getCategoriesForWave,
  getHarmonizedMapping,
  getAllHarmonizedVariables,
  isHarmonizedVariable,
  getHarmonizedInfo,
  isNonResponse
};
