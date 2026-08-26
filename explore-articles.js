import { TOPIC_BRIEFS } from "./explore-briefs.js";

const WORLD_GUIDES = {
  "universe-physics": {
    approach: "Physics builds models that connect measurable quantities such as distance, time, mass, energy and wavelength. A model is useful when it makes precise predictions, survives comparison with observation and explains more than one isolated fact. In astronomy, scientists cannot rerun the universe, so they compare light from many objects, look at systems at different ages and test whether one explanation fits all of the evidence at once.",
    evidence: "The important habit is to separate the object from the evidence it leaves behind. Light, motion, temperature and the distribution of matter are records. Scientists use instruments to turn those records into numbers, then ask whether competing models would have produced the same pattern. Agreement between independent measurements matters more than a single dramatic observation.",
    sources: [["NASA Science", "https://science.nasa.gov/"], ["ESA Science & Exploration", "https://www.esa.int/Science_Exploration"], ["CERN education", "https://home.cern/science"]],
  },
  "earth-nature": {
    approach: "Earth science treats the planet as a set of connected systems. Rock, water, air and life exchange energy and material at very different speeds: a storm may last hours, a forest may change over decades and a tectonic plate may move over millions of years. Understanding a topic therefore means identifying the stores, the flows and the feedbacks that connect them.",
    evidence: "Researchers combine direct measurements with records preserved in nature. Satellites, weather stations and ocean instruments show current conditions, while rocks, fossils, ice and sediments preserve earlier ones. No single record is perfect. Confidence grows when several independent records tell a compatible story and when a model successfully predicts patterns that were not used to build it.",
    sources: [["NASA Earth Science", "https://science.nasa.gov/earth/"], ["NOAA Education", "https://www.noaa.gov/education"], ["USGS Science", "https://www.usgs.gov/science"]],
  },
  "life-biology": {
    approach: "Biology explains living systems by moving between levels. Molecules interact inside cells; cells cooperate in tissues; organisms respond to environments; and populations change across generations. A useful explanation says what is happening at the relevant level while showing how it connects to the levels above and below it.",
    evidence: "Biologists compare observations, controlled experiments, genetic information and natural variation. Because living systems are noisy and individuals differ, repeated patterns and well-chosen comparison groups are essential. A biological explanation is strongest when it links a mechanism to an outcome and continues to work across different organisms or conditions.",
    sources: [["National Human Genome Research Institute", "https://www.genome.gov/"], ["NIH science education", "https://science.education.nih.gov/"], ["Smithsonian Human Origins", "https://humanorigins.si.edu/"]],
  },
  "mind-behaviour": {
    approach: "Psychology studies processes that cannot always be observed directly—attention, memory, emotion and judgment—by measuring their effects on behaviour, reports and the body. A useful mental model should explain both what the mind does well and the predictable conditions under which it struggles.",
    evidence: "One study rarely settles a question about human behaviour. Researchers look for effects that repeat across people and methods, distinguish correlation from causation and check whether laboratory findings survive in ordinary settings. Personal experience is valuable for generating questions, but it can be shaped by the same biases being studied.",
    sources: [["NIMH health information", "https://www.nimh.nih.gov/health"], ["American Psychological Association topics", "https://www.apa.org/topics"], ["NIH Brain Basics", "https://www.ninds.nih.gov/health-information/public-education/brain-basics"]],
  },
  "engineering-machines": {
    approach: "Engineering begins with a desired outcome and a set of constraints. Every design trades something—force for distance, strength for weight, speed for control, performance for cost or efficiency for simplicity. Learning how a machine works means following forces, energy and information through the whole system rather than admiring one component in isolation.",
    evidence: "Engineers use calculation, prototypes, simulation and testing. A design is not proven because it works once under ideal conditions; it must tolerate variation, wear, misuse and unexpected loads. Safety factors and feedback from failures turn uncertainty into design decisions that can be checked.",
    sources: [["NASA STEM", "https://www.nasa.gov/stem-content/"], ["NIST science resources", "https://www.nist.gov/topics"], ["Smithsonian Lemelson Center", "https://invention.si.edu/"]],
  },
  "computing-digital": {
    approach: "A digital system can be understood as layers of representation and rules. Physical devices manipulate signals; those signals represent bits; programs arrange bits into useful structures; and networks let separate machines coordinate. Each layer hides detail from the one above it, but the hidden layer still sets limits on speed, reliability and security.",
    evidence: "Computing explanations can often be tested by tracing a small input step by step. Specifications describe the intended rules, while logs, measurements and controlled experiments show what a real system did. Good analysis distinguishes the algorithm from its implementation and the output from the social decision made with that output.",
    sources: [["NIST Computer Science", "https://www.nist.gov/topics/computer-science"], ["MDN Web Docs", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/How_does_the_Internet_work"], ["CISA Secure Our World", "https://www.cisa.gov/secure-our-world"]],
  },
  "economics-systems": {
    approach: "Economics studies choices made under constraints and the patterns that emerge when many choices interact. Prices, rules, expectations and institutions change incentives, while feedback can amplify or dampen the result. A useful explanation identifies who chooses, what information they have, what they give up and who experiences effects that are not included in the decision.",
    evidence: "Economic evidence comes from administrative data, surveys, natural experiments, controlled trials and comparisons across time or place. Outcomes usually have several causes, so a visible association is not automatically a causal effect. Models simplify reality on purpose; the important question is whether the simplification helps answer the decision at hand.",
    sources: [["IMF Back to Basics", "https://www.imf.org/en/Publications/fandd/issues/Series/Back-to-Basics"], ["World Bank Data", "https://data.worldbank.org/"], ["OECD Education", "https://www.oecd.org/en/topics/education.html"]],
  },
  "civilizations-history": {
    approach: "History is an evidence-based argument about change over time. People act inside institutions, environments and inherited ideas, but outcomes are not automatic. A working explanation therefore combines long-term pressures with choices, accidents and the different experiences of people living through the same event.",
    evidence: "Historians ask who created a source, for whom, for what purpose and what the source could not have known. They compare documents with objects, landscapes, numbers and other accounts. Gaps and disagreements are normal; responsible history states the strength of a claim instead of turning uncertainty into a dramatic certainty.",
    sources: [["Smithsonian Learning Lab", "https://learninglab.si.edu/"], ["The British Museum collection", "https://www.britishmuseum.org/collection"], ["UNESCO World Heritage", "https://whc.unesco.org/"]],
  },
  "society-geopolitics": {
    approach: "Collective power is produced through institutions, resources, geography, legitimacy and networks. States and organisations rarely control everything they claim to control, and power can take military, economic, legal, technological or cultural forms. A useful map distinguishes formal rules from actual capacity and short-term pressure from durable influence.",
    evidence: "Claims about society should be checked against laws, budgets, demographic data, trade flows, surveys and behaviour. Public statements reveal goals and narratives but not necessarily capabilities. Comparisons across countries require care because the same label can hide different institutions and measurement practices.",
    sources: [["United Nations", "https://www.un.org/en/"], ["World Bank Data", "https://data.worldbank.org/"], ["UNHCR teaching resources", "https://www.unhcr.org/teaching-about-refugees.html"]],
  },
  "philosophy-ideas": {
    approach: "Philosophy slows an idea down until its assumptions become visible. It separates a claim from the reasons offered for it, tests definitions with counterexamples and compares what follows from different principles. The goal is not to make every question vague; it is to become more precise about where disagreement actually begins.",
    evidence: "Some philosophical questions use scientific evidence, but facts alone may not decide what is valuable, fair or meaningful. Progress comes from clear concepts, valid reasoning, attention to lived consequences and the willingness to revise a position when it produces contradictions or unacceptable implications.",
    sources: [["Stanford Encyclopedia of Philosophy", "https://plato.stanford.edu/"], ["Internet Encyclopedia of Philosophy", "https://iep.utm.edu/"], ["OpenLearn Philosophy", "https://www.open.edu/openlearn/history-the-arts/philosophy"]],
  },
  "art-design-culture": {
    approach: "Art and design organise attention through choices about form, material, sequence and context. Meaning is not stored in one colour or shape by itself; it develops through relationships inside the work and through conventions shared by makers and audiences. Learning to read a work means describing what is present before jumping to a verdict about it.",
    evidence: "Interpretation becomes stronger when it can point to specific features, compare related works and account for historical context. The artist's intention can matter without being the only possible meaning. Good criticism distinguishes a personal reaction from a claim about how the work is constructed and supports both honestly.",
    sources: [["The Metropolitan Museum of Art – Heilbrunn Timeline", "https://www.metmuseum.org/toah/"], ["Smithsonian Learning Lab", "https://learninglab.si.edu/"], ["Cooper Hewitt Education", "https://www.cooperhewitt.org/education/"]],
  },
  "everyday-science": {
    approach: "Everyday science becomes clearer when a familiar object is treated as a system. Identify what enters, what leaves, what changes form and which limits control the result. Ordinary experiences are useful starting points, but the explanation should still connect them to measurable ideas such as energy, force, pressure, temperature or chemical interaction.",
    evidence: "Small comparisons can reveal a mechanism: change one condition, keep the others as steady as practical and observe the difference. A household demonstration is not a perfect laboratory experiment, but it can expose a prediction. Safety and material compatibility come first; understanding a process is never a reason to mix substances or test risks casually.",
    sources: [["NIST How Do You Measure It?", "https://www.nist.gov/how-do-you-measure-it"], ["USDA Food Science", "https://www.nifa.usda.gov/topics/food-science"], ["U.S. Department of Energy Energy Saver", "https://www.energy.gov/energysaver/energy-saver"]],
  },
};

function firstSentence(value) {
  return String(value || "").match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || String(value || "").trim();
}

function articleWords(article) {
  return [
    article.lede,
    ...article.sections.flatMap((section) => section.paragraphs),
    article.analogy,
    ...article.essentialFacts,
    article.misconception,
    article.activity.prompt,
    article.activity.answer,
    article.reflectionQuestion,
  ].join(" ").trim().split(/\s+/).filter(Boolean).length;
}

export function buildExploreArticle({ topic, index, territory }) {
  const brief = TOPIC_BRIEFS[topic];
  if (!brief) throw new Error(`Missing preloaded Explore article brief for “${topic}”.`);
  const guide = WORLD_GUIDES[territory.worldId];
  const scope = brief.scope || `A useful working model has three layers. First, be able to state this accurately: ${firstSentence(brief.core)} Second, be able to describe the process rather than only naming it: ${firstSentence(brief.mechanism)} Third, use the example below to translate the abstract relationship into something you can picture, while remembering where the comparison stops being exact.`;
  const connection = brief.connection || `The example and the misconception mark the boundaries of the idea. ${brief.example} That picture is helpful only if it remains consistent with the mechanism above. The correction—${brief.misconception}—shows the point at which an intuitive first explanation becomes misleading. Together, these pieces turn a definition into a model you can actually use.`;
  const activity = brief.activity || `Without looking back, answer four questions in one sentence each: What is ${topic.toLowerCase()}? What process produces it? Which example makes it easier to picture? Which tempting explanation is wrong? Then reveal the model answer and correct only the missing links.`;
  const answer = brief.answer || `What it is: ${brief.core} How it works: ${brief.mechanism} A useful picture: ${brief.example} The boundary to remember: ${brief.misconception} Your wording does not need to match this version, but it should preserve these four relationships.`;
  const reflection = brief.reflection || `What part of ${topic.toLowerCase()} would you now feel confident explaining aloud, and which link would you still want to strengthen?`;
  const previousTopic = territory.topics[index - 1];
  const nextTopic = territory.topics[index + 1];
  const sequence = previousTopic && nextTopic
    ? `Yesterday's idea, ${previousTopic.toLowerCase()}, supplies part of the background for this topic. Tomorrow, ${nextTopic.toLowerCase()} will extend the model. The point of the sequence is cumulative: each new layer should make the earlier layer more usable, not replace it.`
    : nextTopic
      ? `This is the first layer of the territory. It establishes the vocabulary and causal picture needed for tomorrow's article on ${nextTopic.toLowerCase()}. Keep the central relationship in mind rather than trying to memorise every term at once.`
      : `This final day connects the territory's earlier ideas into one working explanation. You should now be able to move from the first topic, ${territory.topics[0].toLowerCase()}, through the intermediate mechanisms and arrive at this wider view without treating the five articles as isolated facts.`;

  const article = {
    lede: brief.core,
    sections: [
      {
        heading: "Build the main idea",
        paragraphs: [
          brief.core,
          `${territory.description} In this article, the focus is narrower: ${topic.toLowerCase()}. ${scope}`,
        ],
      },
      {
        heading: "How it works",
        paragraphs: [brief.mechanism, sequence],
      },
      {
        heading: "How to reason about it",
        paragraphs: [guide.approach, guide.evidence],
      },
      {
        heading: "Connect the pieces",
        paragraphs: [
          connection,
          `A working knowledge does not require every specialist detail. It does require you to identify the main parts, describe what changes, name the mechanism that connects cause to effect and recognise what kind of evidence would count. If you can do those four things for ${topic.toLowerCase()}, you can follow a serious conversation and know where your understanding needs more depth.`,
        ],
      },
    ],
    analogy: brief.example,
    essentialFacts: [
      firstSentence(brief.core),
      firstSentence(brief.mechanism),
      firstSentence(connection),
      `This is Day ${index + 1} of a five-part explanation of ${territory.title}.`,
    ],
    misconception: brief.misconception,
    activity: {
      prompt: activity,
      answer,
    },
    reflectionQuestion: reflection,
    sources: guide.sources,
  };
  const wordCount = articleWords(article);
  return {
    ...article,
    wordCount,
    readingMinutes: Math.max(5, Math.ceil(wordCount / 160)),
  };
}
