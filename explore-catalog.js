import { buildExploreArticle } from "./explore-articles.js";

export const EXPLORE_WORLDS = [
  {
    id: "universe-physics",
    title: "Universe & Physics",
    symbol: "✦",
    color: "#8fa9e8",
    description: "Build an intuitive map of matter, energy, space and the rules that connect them.",
    territories: [
      ["cosmic-origins", "Cosmic Origins", "Follow the universe from its hot early state to the large-scale structure we see today.", ["The expanding universe", "The first atoms", "Cosmic background light", "Galaxies take shape", "How origin models are tested"]],
      ["stars-elements", "Stars & Elements", "See how stars live, die and make much of the matter around us.", ["A star begins", "Fusion and stellar balance", "Why stars have different colours", "Supernovae and heavy elements", "Our material connection to stars"]],
      ["gravity-spacetime", "Gravity & Spacetime", "Move from falling objects to curved spacetime and orbiting worlds.", ["Gravity as attraction", "Orbits are continuous falling", "Mass shapes spacetime", "Black holes and event horizons", "Gravity across cosmic scales"]],
      ["quantum-world", "The Quantum World", "Explore the counter-intuitive rules that govern matter at very small scales.", ["Particles and probability", "Waves of possibility", "Measurement and uncertainty", "Quantum tunnelling", "Quantum effects in daily technology"]],
      ["light-telescopes", "Light & Telescopes", "Learn how light carries information across enormous distances.", ["Light as a messenger", "The electromagnetic spectrum", "Lenses, mirrors and resolution", "Reading spectra", "Seeing the invisible universe"]],
    ],
  },
  {
    id: "earth-nature",
    title: "Earth & Nature",
    symbol: "◒",
    color: "#6fb79b",
    description: "Read Earth as a changing system of rock, water, air and living relationships.",
    territories: [
      ["dynamic-earth", "Dynamic Earth", "Understand the slow engine that continually reshapes the planet.", ["Earth's layered interior", "Moving tectonic plates", "Mountains and ocean basins", "The rock cycle", "Reading deep time"]],
      ["weather-climate", "Weather & Climate", "Separate daily weather from the long patterns and feedbacks of climate.", ["Weather versus climate", "Air pressure and wind", "Clouds and precipitation", "Earth's energy balance", "Climate feedback loops"]],
      ["living-oceans", "Living Oceans", "Discover how currents, chemistry and life make the oceans a planetary engine.", ["The shape of an ocean", "Currents move heat", "Ocean food webs", "Carbon and ocean chemistry", "A connected blue planet"]],
      ["ecosystem-webs", "Ecosystem Webs", "See nature as flows of energy, nutrients and interdependence rather than isolated species.", ["Energy enters a food web", "Nutrients cycle", "Niches and competition", "Keystone relationships", "Resilience after disturbance"]],
      ["natural-hazards", "Natural Hazards", "Learn why hazards become disasters and how risk can be reduced.", ["Hazard, exposure and vulnerability", "Earthquakes", "Volcanoes", "Cyclones and floods", "Designing for resilience"]],
    ],
  },
  {
    id: "life-biology",
    title: "Life & Biology",
    symbol: "♧",
    color: "#92c96f",
    description: "Explore the nested systems that let life persist, adapt and reproduce.",
    territories: [
      ["cell-city", "The Cell as a City", "Tour the structures, membranes and chemical work inside living cells.", ["A boundary that manages exchange", "DNA and cellular instructions", "Proteins do the work", "Energy from mitochondria", "Cells cooperate in tissues"]],
      ["genetics", "Genes & Inheritance", "Understand how biological information is copied, varied and expressed.", ["DNA stores information", "Genes become traits", "Inheritance and probability", "Mutation creates variation", "Genes meet environment"]],
      ["evolution", "Evolution in Action", "See how variation, selection and time produce adaptation and diversity.", ["Populations contain variation", "Natural selection", "Adaptation is not intention", "Species branch", "Evolution happening now"]],
      ["human-body", "The Coordinated Body", "Connect the body's major systems as one regulated, adaptive whole.", ["Maintaining internal balance", "Nervous and hormonal signals", "Circulation and respiration", "Movement and repair", "Systems under stress"]],
      ["microbiome", "Your Microbial World", "Meet the microbial communities that live with us and shape wider ecosystems.", ["Microbes are everywhere", "The gut ecosystem", "Cooperation and competition", "Antibiotics and resistance", "Living as a multispecies system"]],
    ],
  },
  {
    id: "mind-behaviour",
    title: "Mind & Behaviour",
    symbol: "◎",
    color: "#d7a6d9",
    description: "Examine how attention, memory, emotion and context shape what people do.",
    territories: [
      ["attention", "Attention Under Pressure", "Learn why attention is selective and how environments compete for it.", ["Attention is selection", "The cost of switching", "Salience captures the mind", "Deep focus needs conditions", "Designing an attention environment"]],
      ["memory", "How Memory Changes", "Replace the idea of a perfect recording with a reconstructive, trainable system.", ["Encoding begins with attention", "Working memory is limited", "Retrieval strengthens access", "Forgetting can be useful", "Memory is reconstructed"]],
      ["emotion", "Emotion as Information", "Understand emotions as coordinated signals, body states and action tendencies.", ["An emotion has several parts", "Body signals and interpretation", "Emotions prepare action", "Regulation is not suppression", "Using emotion without obeying it"]],
      ["habits", "The Habit Loop", "See how cues, repetition and rewards turn effortful actions into defaults.", ["Cue, response and outcome", "Repetition builds automaticity", "Environment beats intention", "Rewards teach the brain", "Changing a loop"]],
      ["decisions", "Decision Traps", "Recognise shortcuts that help thinking but can also produce predictable errors.", ["Why minds use shortcuts", "Anchors and first numbers", "Availability feels like probability", "Losses loom larger", "Building better decision checks"]],
    ],
  },
  {
    id: "engineering-machines",
    title: "Engineering & Machines",
    symbol: "⚙",
    color: "#e6a56f",
    description: "Learn how constraints, forces, energy and feedback become useful designed systems.",
    territories: [
      ["simple-machines", "Levers, Gears & Advantage", "Use simple machines to understand how engineers trade force for distance and speed.", ["Work, force and distance", "Levers and moments", "Gears change torque and speed", "Pulleys share loads", "Combining simple machines"]],
      ["structures", "Why Structures Stand", "Read buildings and bridges as paths that carry forces safely to the ground.", ["Loads need a path", "Tension and compression", "Triangles create stability", "Bending and buckling", "Safety factors and failure"]],
      ["energy-systems", "Energy Systems", "Trace how energy is converted, transported, stored and lost.", ["Energy changes form", "Power is a rate", "Heat and efficiency", "Storage solves timing", "Designing an energy mix"]],
      ["flight", "The Logic of Flight", "Connect airflow, lift, drag, thrust and control in flying machines.", ["Air exerts pressure", "Lift and airflow", "Drag and streamlining", "Thrust balances resistance", "Stability and control surfaces"]],
      ["robotics", "Robots & Feedback", "See a robot as sensing, deciding and acting in a repeating loop.", ["Sense, decide, act", "Actuators create movement", "Feedback corrects error", "Autonomy has limits", "Designing human-robot cooperation"]],
    ],
  },
  {
    id: "computing-digital",
    title: "Computing & Digital Systems",
    symbol: "⌘",
    color: "#78b8d8",
    description: "Look beneath screens to understand computation, networks, algorithms and digital trust.",
    territories: [
      ["computer-inside", "Inside a Computer", "Follow information from binary representation through memory, processors and programs.", ["Bits represent choices", "Instructions and processors", "Memory has layers", "Operating systems coordinate", "From input to visible result"]],
      ["internet", "How the Internet Moves", "Trace how packets, addresses and protocols connect devices across networks.", ["Networks connect networks", "Packets take routes", "Names become addresses", "Protocols create agreement", "Cloud services are physical systems"]],
      ["algorithms", "Thinking in Algorithms", "Turn vague goals into precise procedures and evaluate their trade-offs.", ["An algorithm is a procedure", "Breaking problems into steps", "Searching and sorting", "Efficiency matters at scale", "Algorithms encode choices"]],
      ["ai", "Artificial Intelligence", "Build a grounded map of learning systems, models, data and their limits.", ["Rules versus learned patterns", "Training from examples", "Prediction is not understanding", "Bias enters the pipeline", "Human judgment around AI"]],
      ["cybersecurity", "Everyday Cybersecurity", "Understand common threats through identity, access and layers of defence.", ["Threats exploit trust", "Passwords and authentication", "Encryption protects exchange", "Phishing targets people", "Security as layered risk reduction"]],
    ],
  },
  {
    id: "economics-systems",
    title: "Economics & Systems",
    symbol: "↗",
    color: "#dfbf63",
    description: "Explore how choices, incentives, institutions and feedback shape shared resources.",
    territories: [
      ["scarcity-choice", "Scarcity & Choice", "Use opportunity cost to see the hidden alternatives behind everyday decisions.", ["Wants exceed resources", "Every choice has an alternative", "Marginal thinking", "Time is a scarce resource", "Trade-offs can be redesigned"]],
      ["markets-prices", "Markets & Prices", "See prices as signals emerging from many buyers, sellers and constraints.", ["Demand reflects willingness", "Supply reflects cost and capacity", "Prices coordinate", "Competition and market power", "When markets miss important costs"]],
      ["money-banking", "Money & Banking", "Understand money as a social technology for exchange, accounting and deferred value.", ["What money does", "Trust supports currency", "Banks connect saving and lending", "Interest and time", "Inflation changes purchasing power"]],
      ["incentives-games", "Incentives & Games", "Predict behaviour by looking at payoffs, rules and responses between people.", ["Incentives change behaviour", "People respond strategically", "Cooperation dilemmas", "Rules shape the game", "Good incentives need monitoring"]],
      ["growth-inequality", "Growth & Inequality", "Separate total prosperity from how gains, risks and opportunities are distributed.", ["Productivity supports growth", "Compounding changes economies", "Distribution is a separate question", "Mobility and opportunity", "Measuring what matters"]],
    ],
  },
  {
    id: "civilizations-history",
    title: "Civilizations & History",
    symbol: "⌛",
    color: "#c9916f",
    description: "Study change across time through evidence, institutions, exchange and human choices.",
    territories: [
      ["first-cities", "The First Cities", "Explore why settled communities grew into dense centres of power and exchange.", ["Farming changes settlement", "Surplus supports specialisation", "Writing and administration", "Cities organise inequality", "Urban life reshapes nature"]],
      ["empires-power", "Empires & Power", "Compare how large states expand, govern difference and eventually fragment.", ["Expansion needs resources", "Administration at distance", "Legitimacy and identity", "Resistance and negotiation", "Why empires weaken"]],
      ["trade-networks", "Trade Networks", "Follow goods, ideas, diseases and technologies along connected routes.", ["Exchange follows uneven resources", "Routes need trust", "Ports and crossroads gain power", "Ideas travel with goods", "Networks spread shocks"]],
      ["revolutions", "Revolutions & Change", "Examine how pressures, ideas, organisation and triggering events combine.", ["Long pressures accumulate", "Ideas make alternatives imaginable", "Networks coordinate action", "Triggers accelerate change", "Revolutions create unintended outcomes"]],
      ["historical-thinking", "Thinking Like a Historian", "Learn to build careful claims from incomplete, interested and sometimes conflicting evidence.", ["Sources have perspectives", "Context changes meaning", "Corroboration strengthens claims", "Silences are evidence too", "History is argued, not invented"]],
    ],
  },
  {
    id: "society-geopolitics",
    title: "Society & Geopolitics",
    symbol: "◇",
    color: "#8d9cc4",
    description: "Understand how institutions, populations, narratives and geography organise collective power.",
    territories: [
      ["states-borders", "States & Borders", "Explore how territories become governed spaces with contested boundaries.", ["A state claims authority", "Borders are made and maintained", "Citizenship defines membership", "Sovereignty meets interdependence", "Maps can hide disputes"]],
      ["institutions", "Institutions & Trust", "See how formal rules and unwritten norms make large-scale cooperation possible.", ["Institutions stabilise expectations", "Formal and informal rules", "Legitimacy supports compliance", "Capacity turns rules into outcomes", "Trust is slow to build"]],
      ["migration", "Population & Migration", "Connect demographic change with opportunity, conflict, family and policy.", ["Populations have age structures", "People move for mixed reasons", "Networks shape destinations", "Migration changes both places", "Policy filters movement"]],
      ["global-power", "Global Power", "Compare military, economic, technological and cultural sources of influence.", ["Power has several forms", "Geography creates constraints", "Alliances pool influence", "Trade creates leverage and dependence", "Power shifts over time"]],
      ["media-opinion", "Media & Public Opinion", "Learn how attention, framing, networks and incentives shape shared perceptions.", ["Attention is limited", "Frames select meaning", "Repetition creates familiarity", "Networks amplify emotion", "Information habits protect judgment"]],
    ],
  },
  {
    id: "philosophy-ideas",
    title: "Philosophy & Big Ideas",
    symbol: "∞",
    color: "#b79bc9",
    description: "Practise clearer thinking about truth, value, freedom, identity and a meaningful life.",
    territories: [
      ["logic", "Logic & Good Arguments", "Learn to separate conclusions, reasons, validity and evidence.", ["Arguments connect reasons to claims", "Validity differs from truth", "Hidden assumptions", "Common reasoning fallacies", "Charity improves disagreement"]],
      ["ethics", "Ways of Thinking About Ethics", "Compare moral lenses without reducing hard choices to one slogan.", ["Consequences matter", "Duties and rights matter", "Character and virtue matter", "Care and relationships matter", "Moral lenses can conflict"]],
      ["knowledge", "How Do We Know?", "Explore evidence, perception, testimony and the limits of certainty.", ["Belief is not yet knowledge", "Perception can mislead", "Testimony extends our reach", "Evidence comes in degrees", "Intellectual humility"]],
      ["freedom", "Freedom & Responsibility", "Examine choice within biology, history, circumstance and social constraint.", ["Several meanings of freedom", "Causes shape choices", "Agency can be partial", "Responsibility comes in degrees", "Designing conditions for better choice"]],
      ["meaning-identity", "Meaning & Identity", "Consider how stories, commitments and relationships shape a life.", ["Identity has many layers", "Stories organise experience", "Meaning can be made", "Commitments shape the self", "A life remains revisable"]],
    ],
  },
  {
    id: "art-design-culture",
    title: "Art, Design & Culture",
    symbol: "✎",
    color: "#e79a9e",
    description: "Learn how form, story, sound, space and objects carry meaning across communities.",
    territories: [
      ["visual-language", "Visual Language", "Read composition, colour, contrast and symbol as deliberate choices.", ["Composition guides attention", "Contrast creates hierarchy", "Colour carries context", "Symbols compress meaning", "Style is a system of choices"]],
      ["architecture", "Architecture & Place", "See buildings as negotiations between bodies, climate, materials and power.", ["Space shapes behaviour", "Structure enables form", "Climate influences design", "Buildings express values", "Places accumulate memory"]],
      ["music", "How Music Works", "Build a listening map from rhythm, melody, harmony, texture and form.", ["Rhythm organises time", "Melody creates a path", "Harmony shapes expectation", "Texture layers sound", "Form makes return meaningful"]],
      ["storytelling", "Why Stories Move Us", "Understand how character, desire, conflict and change focus human attention.", ["A character wants something", "Conflict creates pressure", "Point of view filters reality", "Structure manages expectation", "Stories rehearse possibilities"]],
      ["everyday-design", "Design in Everyday Objects", "Notice how ordinary objects guide action, reveal assumptions and create consequences.", ["Affordances suggest use", "Feedback makes action legible", "Constraints prevent error", "Defaults shape behaviour", "Inclusive design widens access"]],
    ],
  },
  {
    id: "everyday-science",
    title: "Everyday Science & How Things Work",
    symbol: "⌂",
    color: "#7fc6bf",
    description: "Turn familiar routines and household systems into practical scientific understanding.",
    territories: [
      ["cooking-science", "The Science of Cooking", "Use heat, water, proteins and browning to understand what happens in a pan.", ["Heat moves into food", "Proteins change shape", "Water controls texture", "Browning builds flavour", "Recipes are controlled experiments"]],
      ["sleep-science", "Why We Sleep", "Connect sleep pressure, body clocks, light and routine to nightly rest.", ["Sleep pressure accumulates", "The circadian clock", "Light sets timing", "Sleep cycles change overnight", "Protecting a repeatable sleep window"]],
      ["home-electricity", "Electricity at Home", "Follow voltage, current, resistance and safety through a household circuit.", ["Voltage creates a push", "Current needs a circuit", "Resistance limits flow", "Power measures energy rate", "Fuses and grounding protect people"]],
      ["movement-vehicles", "How Vehicles Move", "Connect grip, gearing, braking, balance and energy in everyday transport.", ["Tyres exchange forces with the road", "Gears trade speed for force", "Brakes turn motion into heat", "Balance and steering", "Efficiency and resistance"]],
      ["materials-cleaning", "Materials & Cleaning", "Understand why water, soap, acids, bases and surfaces behave differently.", ["Water has polarity", "Soap bridges oil and water", "Acids and bases react", "Friction removes particles", "Match the cleaner to the material"]],
    ],
  },
];

export function allExploreTerritories() {
  return EXPLORE_WORLDS.flatMap((world) => world.territories.map(([id, title, description, topics]) => ({
    id,
    title,
    description,
    topics,
    worldId: world.id,
    worldTitle: world.title,
    worldSymbol: world.symbol,
    color: world.color,
  })));
}

export function exploreLessonsForTerritory(territory) {
  return territory.topics.map((topic, index) => {
    const article = buildExploreArticle({ topic, index, territory });
    return {
      id: `explore:${territory.id}:${index + 1}`,
      packId: `explore:${territory.id}`,
      explore: true,
      territoryId: territory.id,
      worldId: territory.worldId,
      order: index + 1,
      title: topic,
      summary: article.lede,
      reflection: article.reflectionQuestion,
      tags: [territory.worldTitle, territory.title, topic],
      exploreDayLabel: topic,
      article,
    };
  });
}

export function allExploreLessons() {
  return allExploreTerritories().flatMap(exploreLessonsForTerritory);
}
