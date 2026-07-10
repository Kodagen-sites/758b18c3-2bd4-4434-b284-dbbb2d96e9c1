/**
 * Voice Bank — seven voice families that translate a chosen visual style
 * into a prescriptive copy rewrite target. Consumed by copy-refinement.ts
 * and, downstream, by the generator's copy-generator service.
 *
 * Ported from .cinematic-skill/cinematic-site-generator/references/voice-banks.md.
 * The style enum here uses the skill's S1..S18 system and is a PARALLEL
 * scheme to the existing Kodagen `Style` enum in meta-types.ts. The existing
 * enum stays unchanged; callers opt into voice-driven refinement by passing
 * a styleId.
 */

export type VoiceFamilyId = "V1" | "V2" | "V3" | "V4" | "V5" | "V6" | "V7";

export type StyleId =
  | "S1" | "S2" | "S3" | "S4" | "S5" | "S6"
  | "S7" | "S8" | "S9" | "S10" | "S11" | "S12"
  | "S13" | "S14" | "S15" | "S16" | "S17" | "S18";

export type HeadlineExample = { bad: string; good: string; why: string };
export type BodyCopyExample = { context: string; text: string };

export type VoiceFamily = {
  id: VoiceFamilyId;
  name: string;
  appliesToStyles: StyleId[];
  oneLine: string;
  character: string;
  toneKeywords: string[];
  sentenceRhythm: string[];
  openingFormulas: string[];
  banList: string[];
  signatureMoves: string[];
  exampleHeadlines: HeadlineExample[];
  exampleBodyCopy: BodyCopyExample[];
  ctaBank: string[];
  serviceLinePattern: { name: string; description: string };
  /** Style-specific patches on top of the base voice (see voice-banks.md §"Voice overrides"). */
  styleOverrides?: Partial<Record<StyleId, string>>;
};

// ─── V1 — Heritage Understated ──────────────────────────────────────────

export const V1_HERITAGE_UNDERSTATED: VoiceFamily = {
  id: "V1",
  name: "Heritage Understated",
  appliesToStyles: ["S1", "S2", "S11", "S12", "S13", "S15"],
  oneLine: "Old-money confidence. Specific, short, unhurried.",
  character:
    "Confidence without volume. The brand has nothing to prove because it already exists. Sentences are short because every word is weighted. Omissions are deliberate — if it didn't need to be said, it isn't said.",
  toneKeywords: ["considered", "earned", "unhurried", "specific", "materially-anchored"],
  sentenceRhythm: [
    "Mostly 4–11 words per sentence.",
    "Frequent sentence-fragments as emphasis (\"Movement 1874. Still running.\").",
    "Body paragraphs stay under 3 sentences; each does a different job: state → prove → stop.",
    "Avoid compound sentences with more than one conjunction. If you wrote 'and' twice, cut one clause.",
  ],
  openingFormulas: [
    "{{Proper noun}}. {{Stance}}. — \"Klosters. Still made by hand.\"",
    "{{Verb}} {{specific object}}. {{Superlative-free statement}}. — \"Build machines. Nothing else.\"",
    "{{Number/year}}. {{Present-tense verb-fragment}}. — \"Since 1912. Still answering the phone.\"",
    "{{Object}} that {{unexpected proof}}. — \"A sedan that has outlived its designer.\"",
  ],
  banList: [
    "premium", "luxury", "world-class", "bespoke", "curated", "elevated", "best-in-class",
    "we believe", "we're passionate", "we strive",
    "!",
    "journey", "experience", "solutions",
    "at [company], we",
  ],
  signatureMoves: [
    "Dates, serial numbers, calibers, place names used as authority signals rather than decoration.",
    "Materials named specifically: \"chronometer-grade steel\" not \"premium materials.\"",
    "Understatement where a competitor would boast. \"Adequate for most uses\" about something exceptional.",
    "End with a period, not a flourish. No call-to-actions that beg.",
  ],
  exampleHeadlines: [
    {
      bad: "Discover Exceptional Luxury Timepieces Handcrafted for Discerning Collectors",
      good: "Klosters. Still made by hand.",
      why: "Strips claim words, uses the place as authority, states a fact rather than a benefit.",
    },
    {
      bad: "Transform Your Business with Our Industry-Leading Platform",
      good: "Infrastructure for companies that ship.",
      why: "\"Companies that ship\" is a filter — it excludes and that's the point. Heritage voice filters.",
    },
    {
      bad: "Our Team of Expert Architects Creates Dream Homes",
      good: "Houses built for the third generation.",
      why: "Time-depth signals commitment to lineage, not novelty.",
    },
  ],
  exampleBodyCopy: [
    {
      context: "Luxury product (S12)",
      text:
        "Every movement is regulated by the hand that made it. The chronometer certificate sits in a drawer somewhere in Bienne; the watch on your wrist is the thing that matters. Fifty-two of these are built each year.",
    },
    {
      context: "Architectural (S11)",
      text:
        "The building sits lower than the street to cut wind exposure. Concrete in the north wall; warm oak everywhere a shoulder might touch it. Nothing else.",
    },
  ],
  ctaBank: [
    "Enquire",
    "Request a viewing",
    "Speak with a specialist",
    "See the calibre",
    "Arrange a fitting",
    "Book a consultation",
    "Request documentation",
  ],
  serviceLinePattern: {
    name: "Single noun or two-word nominal: \"Bespoke movements,\" \"Atelier restoration,\" \"Private placement.\"",
    description:
      "One sentence that names a specific practice, not a benefit. \"A single watchmaker assembles each piece; the serial traces to that person for the life of the watch.\"",
  },
  styleOverrides: {
    S12: "Allow French or Italian technical terms where genuine — \"guillochage,\" \"côtes de Genève,\" \"brevetto\" — but never as decoration. If the brand isn't Swiss or Italian, don't borrow the language.",
    S13: "Permit one era-anchored flourish — \"four-valve,\" \"naturally aspirated,\" \"three-box saloon.\" Car people hear these as authenticity signals; outsiders ignore them harmlessly.",
  },
};

// ─── V2 — Intellectual Editorial ────────────────────────────────────────

export const V2_INTELLECTUAL_EDITORIAL: VoiceFamily = {
  id: "V2",
  name: "Intellectual Editorial",
  appliesToStyles: ["S6", "S7", "S14"],
  oneLine: "Measured, research-y. Long-thinking sentences.",
  character:
    "Thinking out loud, but the thinking is good. This voice trusts the reader to follow long sentences and multi-part arguments. The voice of The New Yorker rewritten by a chemist or a researcher — measured, specific, slightly cool.",
  toneKeywords: ["measured", "observational", "specific", "generous with readers", "quietly authoritative"],
  sentenceRhythm: [
    "Longer than V1. A 28-word sentence is fine if it earns the length with multiple clauses doing distinct work.",
    "Mix: one long compound sentence, then one short punch sentence. The punch always lands after the long one.",
    "Body paragraphs run 3–5 sentences. They build.",
    "Comma-rich. Dashes and parentheticals are allowed — they're part of the voice.",
  ],
  openingFormulas: [
    "{{Gerund}} {{abstract object}} — \"Decoding the language of proteins.\"",
    "{{Definite article}} {{unexpected noun pairing}} — \"The cartography of human attention.\"",
    "{{Topic}}, {{reframe}} — \"Materials, considered from the inside out.\"",
    "{{Question or statement that implies inquiry}} — \"What shape does a decision take?\"",
  ],
  banList: [
    "premium", "luxury", "world-class", "best-in-class",
    "empowering", "unleashing", "transforming",
    "simple", "easy", "effortless",
  ],
  signatureMoves: [
    "Topic sentences that frame a problem rather than announce a solution.",
    "Scientific or editorial specificity. Proper names for things. \"Ab initio simulation\" not \"advanced modeling.\"",
    "Em-dashes — used for parenthetical insights — that feel like the writer is sharing their working.",
    "Willingness to be slightly abstract in the first sentence, then ground in the second.",
  ],
  exampleHeadlines: [
    {
      bad: "AI-Powered Research Platform for Breakthrough Discoveries",
      good: "Inference engines, for the scale of molecules.",
      why: "Specific domain, modest promise, and 'for' rather than 'that' signals tool-ness rather than hero-ness.",
    },
    {
      bad: "Beautiful Fashion for Confident Women",
      good: "Clothing, considered.",
      why: "The comma-and-past-participle formula is a V2 signature. Implies thought without describing it.",
    },
    {
      bad: "The Future of Biotechnology is Here",
      good: "Biology is a language. We are teaching machines to read it.",
      why: "Two sentences, metaphor then mechanism. Trusts the reader to hold both.",
    },
  ],
  exampleBodyCopy: [
    {
      context: "Research lab (S14)",
      text:
        "Most drug candidates fail in year four, after eleven billion dollars have already been committed to the pipeline. The failure is not scientific so much as informational — the molecule's behavior in a cell was, at the point of commitment, a guess. Our simulations reduce the guess.",
    },
    {
      context: "Fashion editorial (S6)",
      text:
        "The coat is cut from a single length of melton, which limits the shape to what the cloth will accept. This is a constraint we have chosen. The coat is not flattering in the way that a darted bodice is flattering; it is flattering in the way that a hand-written letter is more flattering than a form email.",
    },
  ],
  ctaBank: [
    "Read the paper",
    "See the research",
    "Explore the archive",
    "Request documentation",
    "Continue reading",
    "Browse the catalogue",
    "Schedule a reading",
  ],
  serviceLinePattern: {
    name: "Noun phrase, often with adjective or 'of': \"Reaction pathway prediction,\" \"The mathematics of binding affinity.\"",
    description: "Two sentences. First defines; second adds a non-obvious quality.",
  },
  styleOverrides: {
    S14: "Allow LaTeX-style math notation in body copy if the brand is academic-adjacent. \"∇²φ = ρ/ε₀\" sets a voice better than any adjective.",
  },
};

// ─── V3 — Organic Grounded ──────────────────────────────────────────────

export const V3_ORGANIC_GROUNDED: VoiceFamily = {
  id: "V3",
  name: "Organic Grounded",
  appliesToStyles: ["S3", "S9", "S16"],
  oneLine: "Plain-spoken warmth. Nature-adjacent vocabulary.",
  character:
    "Plain-spoken and unhurried. Nothing in this voice is trying to be cool. Words are common, sentences are complete, and the tone is the tone of someone telling you something true without needing you to be impressed.",
  toneKeywords: ["plain", "unhurried", "honest", "warm", "anchored"],
  sentenceRhythm: [
    "8–18 words typical. Rarely fragments — fragments feel too stylized for this voice.",
    "Subject-verb-object grammar with minimal inversion.",
    "Body paragraphs 2–4 sentences; each one slows the reader down rather than speeding them up.",
    "If a sentence has more than one adjective, cut one.",
  ],
  openingFormulas: [
    "{{Plain subject}} {{plain verb}} {{plain object}}. — \"Good tea takes time.\"",
    "{{Statement of something obvious that turns out not to be}} — \"Sleep is work.\"",
    "{{Plural noun}}, {{present-tense verb}}. — \"Routes, walked.\"",
    "Built/grown/made {{for/from/with}} {{specific thing}}. — \"Grown without rush.\"",
  ],
  banList: [
    "holistic", "wellness journey", "self-care", "mindful", "intentional", "sacred", "aligned",
    "we're grateful", "thank you for being",
    "&",
  ],
  signatureMoves: [
    "Concrete nouns preferred over abstract ones. \"A walk\" not \"movement.\" \"A pot of soup\" not \"nourishment.\"",
    "Present tense, plain verbs. \"We cook it here\" beats \"our preparation process involves.\"",
    "Silence around benefits. If something is good for you, the voice trusts you to notice.",
    "Anchoring to specific things: a place, a time of day, a season, a kind of light.",
  ],
  exampleHeadlines: [
    {
      bad: "Holistic Wellness for the Modern Mindful Woman",
      good: "Slow mornings. Warmer evenings.",
      why: "Two noun-phrases describing a day, not a product category.",
    },
    {
      bad: "Experience Nature's Healing Power",
      good: "Colder water than you'd expect.",
      why: "Specific, surprising, earns a curious reader. Nothing vague.",
    },
    {
      bad: "Ethically Sourced Sustainable Organic Tea",
      good: "Grown in a field we can walk to.",
      why: "Replaces three buzzwords with one proof point.",
    },
  ],
  exampleBodyCopy: [
    {
      context: "Wellness studio (S3)",
      text:
        "Classes run sixty minutes and start on time. We light candles, close the door, and do the work. If you want music you can bring headphones. If you want quiet, that's easier to arrange.",
    },
    {
      context: "Sustainability / outdoors (S9)",
      text:
        "The route is twelve miles and takes most of a day if you stop for lunch. There's no phone signal for the middle four miles. We thought that was a feature, so we've left it alone.",
    },
  ],
  ctaBank: [
    "Come by",
    "Book a class",
    "See the calendar",
    "Start here",
    "Plan your visit",
    "Walk with us",
    "Send a note",
  ],
  serviceLinePattern: {
    name: "Short everyday words: \"Morning class,\" \"Long route,\" \"Quiet corner.\"",
    description: "Plain sentence describing what happens, not what you'll gain. \"Held outdoors when the weather cooperates.\"",
  },
  styleOverrides: {
    S16: "Leans slightly more literary than S3 / S9. One well-placed metaphor per page is fine.",
  },
};

// ─── V4 — Humane Professional ───────────────────────────────────────────

export const V4_HUMANE_PROFESSIONAL: VoiceFamily = {
  id: "V4",
  name: "Humane Professional",
  appliesToStyles: ["S17"],
  oneLine: "Warm but competent. Zero jargon. Reads human.",
  character:
    "The founder is a person you'd actually enjoy a coffee with, and they happen to be really good at a complicated thing. Warm, smart, unpretentious, willing to say \"most of this is boring but I'll handle the boring part.\"",
  toneKeywords: ["warm", "unpretentious", "competent", "direct", "slightly self-aware"],
  sentenceRhythm: [
    "10–20 words typical, varied.",
    "'You' and 'we' freely — the voice is conversational.",
    "Mild humor is okay. Sarcasm is not.",
    "Contractions are fine (\"we're,\" \"you'll,\" \"can't\"). Formal voice without contractions reads stiff.",
  ],
  openingFormulas: [
    "{{You}} {{do the thing}}. {{We}} {{handle the other thing}}. — \"You run the business. We run the numbers.\"",
    "{{Plain problem}} {{doesn't need to be complicated}} — \"Tax returns shouldn't ruin your April.\"",
    "{{Specific promise}} — {{short caveat}} — \"Bookkeeping that actually balances — without the lectures.\"",
    "{{Industry}}, {{done differently}} — \"Accountancy, done by humans.\"",
  ],
  banList: [
    "leverage", "synergy", "value-add", "stakeholder",
    "we're family", "our tribe",
  ],
  signatureMoves: [
    "Addressing the reader's real concern directly. \"Most accountants can't explain retentions. Ours can.\"",
    "Naming the boring-but-specific tasks. Specificity signals competence.",
    "Sentences that feel like they came from a real person writing at night. Slight rhythmic imperfection is fine.",
    "Willingness to state what the brand won't do. \"We don't do offshore schemes.\"",
  ],
  exampleHeadlines: [
    {
      bad: "Premier Accounting Solutions for Modern Businesses",
      good: "You handle the art. We handle the tax.",
      why: "You/we structure is the V4 anchor; \"art\" is specific to the audience.",
    },
    {
      bad: "Empowering Creative Entrepreneurs Through Financial Excellence",
      good: "For freelancers who aren't great with numbers (most of you).",
      why: "Addresses the reader's real feeling; the parenthetical is the V4 move.",
    },
    {
      bad: "Your Trusted Partner for Business Success",
      good: "Bookkeeping that doesn't pretend to be fun.",
      why: "Self-aware honesty signals the brand isn't selling hype.",
    },
  ],
  exampleBodyCopy: [
    {
      context: "Accountant for creatives (S17)",
      text:
        "We specialize in creatives because the rules are weirder for you — royalties, IR35, multi-platform revenue, the odd grant that landed on the wrong side of a tax year. Most accountants handle this once a year and hope for the best. We handle it monthly and sleep fine.",
    },
    {
      context: "Boutique consultancy (S17)",
      text:
        "Engagements are typically six months. The first month is mostly us listening. The remaining five involve doing the work with you, not handing you a deck and leaving. We're small on purpose — four consultants, no juniors, no offshore.",
    },
  ],
  ctaBank: [
    "Book a consultation",
    "Send us a note",
    "Start a conversation",
    "See pricing",
    "Ask a question",
    "Meet the team",
  ],
  serviceLinePattern: {
    name: "Plain language with light specificity: \"Monthly bookkeeping,\" \"Tax returns for creatives,\" \"IR35 reviews.\"",
    description: "1-2 sentences naming what's actually done and when. \"Done quarterly; we handle the filing and remind you before deadlines.\"",
  },
};

// ─── V5 — Appetite Kinetic ──────────────────────────────────────────────

export const V5_APPETITE_KINETIC: VoiceFamily = {
  id: "V5",
  name: "Appetite Kinetic",
  appliesToStyles: ["S18"],
  oneLine: "Fragments. Active verbs. Hunger in the sentence.",
  character:
    "The voice eats. Sentences are short because you don't pause while eating. Active verbs, specific ingredients, zero apology. Writes like a chef talking about the dish — what's in it, why it works, next question.",
  toneKeywords: ["active", "specific", "hungry", "confident", "zero-apology"],
  sentenceRhythm: [
    "3–9 words typical. Fragments everywhere.",
    "Ingredient lists as sentences: \"Beef. Cheese. Bun. Done.\"",
    "Action verbs lead: smashed, seared, dripping, folded, griddled, cold-brewed, pulled.",
    "Capitalization for emphasis on product names is allowed: \"The Double.\" \"Our Hot Honey.\"",
  ],
  openingFormulas: [
    "{{Product name}}. {{Three ingredients or moves}}. {{Close}}. — \"The Double. Smash. Cheese. Done.\"",
    "{{Verb}} {{adjective noun}}. — \"Griddled Texas-style.\"",
    "{{Big number}}. {{Plain claim}}. — \"Seven years. One burger.\"",
    "{{Negation of something expected}} — \"No salad. No apologies.\"",
  ],
  banList: [
    "artisanal", "gourmet",
    "nutritious", "balanced", "clean eating",
  ],
  signatureMoves: [
    "Specific ingredient callouts. Not \"cheese\" — \"aged Cheddar.\" Not \"sauce\" — \"our chipotle aioli.\"",
    "Negative space. \"No lettuce. No tomato.\" The things you leave out are a statement.",
    "Price as part of the copy. \"$9.\" \"Five for $20.\"",
    "Temperature and texture words: hot, cold, crispy, melted, pulled, dripping, charred.",
  ],
  exampleHeadlines: [
    {
      bad: "Premium Handcrafted Gourmet Burgers Made with the Finest Ingredients",
      good: "Smash. Stack. Eat.",
      why: "Three verbs describing the experience. Nothing between you and the burger.",
    },
    {
      bad: "Our Signature Fried Chicken Sandwich",
      good: "The Chicken. Hot. Honey. Brioche.",
      why: "Ingredient telegraphy, definite article gives it stature.",
    },
    {
      bad: "Refreshing Specialty Beverages for Every Occasion",
      good: "Cold. Loud. Caffeinated.",
      why: "Three adjectives describing the drink's personality. That's the whole pitch.",
    },
  ],
  exampleBodyCopy: [
    {
      context: "Burger joint (S18)",
      text:
        "Beef ground in-house every morning. Smashed thin on a 600-degree flat top. Two slices of American, pickle, raw onion, our sauce. Served on a potato bun. That's the Double. Everything else on the menu is extra.",
    },
    {
      context: "Drink-led concept (S18)",
      text:
        "Cold-brewed overnight. Sweetened before it hits ice so nothing gets watery. Oat milk if you want. No syrups, no foam art. Just the coffee you wanted when you woke up this morning, an hour later than planned.",
    },
  ],
  ctaBank: [
    "Order now",
    "Find a location",
    "Grab one",
    "See the menu",
    "Open in Uber Eats",
    "Visit us",
  ],
  serviceLinePattern: {
    name: "Name + three to five words. \"The Double — beef, cheese, onion, sauce.\"",
    description: "One-sentence punch: \"Made in-house every morning.\"",
  },
  styleOverrides: {
    S18: "Permit brand-specific catchphrases if the brand has earned them (\"Have it your way,\" \"Eat mor chikin\"). These are voice, not fluff.",
  },
};

// ─── V6 — Systems Precise ───────────────────────────────────────────────

export const V6_SYSTEMS_PRECISE: VoiceFamily = {
  id: "V6",
  name: "Systems Precise",
  appliesToStyles: ["S5", "S8"],
  oneLine: "Technical specificity. Trust through exact terms.",
  character:
    "Engineers reading this voice believe the product is real. Claims are exact. Numbers have units. Abstractions have referents. Credibility through specificity, not enthusiasm.",
  toneKeywords: ["precise", "technical", "credible", "compressed", "respectful-of-the-reader's-time"],
  sentenceRhythm: [
    "10–22 words typical. Compound sentences fine when each clause carries distinct information.",
    "Technical vocabulary expected and not defined (the audience knows). \"p99 latency,\" \"eventual consistency,\" \"cold start.\"",
    "Active voice, present tense, third-person or direct second-person.",
    "Lists are okay here — engineers read lists. Each bullet carries a distinct atom of information.",
  ],
  openingFormulas: [
    "{{Noun}} for {{specific scale/constraint}} — \"Observability for the p99.\"",
    "{{Verb}} {{technical object}} {{without friction claim}} — \"Ship features without shipping bugs.\"",
    "{{Number}} {{metric}} — \"Sub-millisecond reads. At petabyte scale.\"",
    "{{Exact technical promise}} — \"Zero-downtime schema migrations.\"",
  ],
  banList: [
    "powerful", "flexible", "scalable",
    "revolutionary", "disruptive", "next-generation",
    "empowering developers",
  ],
  signatureMoves: [
    "Numbers with units: \"4ms p50, 12ms p99.\" \"128 GB per node.\"",
    "Named technical approaches. \"Raft consensus\" not \"consensus.\" \"Postgres logical replication\" not \"replication.\"",
    "Trade-off acknowledgments. \"Slower than an in-memory cache by design — durability is the point.\" Admitting trade-offs builds trust.",
    "Compressed APIs shown in the copy. If three lines of code can demonstrate the thing, do.",
  ],
  exampleHeadlines: [
    {
      bad: "The Next Generation Database Platform for Modern Developers",
      good: "Postgres, horizontally scaled.",
      why: "Names the exact thing, names the exact feature. No claims.",
    },
    {
      bad: "Powerful AI Tools for Your Business",
      good: "LLM orchestration with retries, timeouts, and budgets.",
      why: "Lists the actual features. Engineers scan for these words.",
    },
    {
      bad: "Revolutionary DevOps Platform",
      good: "Deploy in 40ms. Rollback in 40ms.",
      why: "Symmetric specifics. The symmetry itself is a voice move.",
    },
  ],
  exampleBodyCopy: [
    {
      context: "Infrastructure product (S5)",
      text:
        "Queries hit a router that sticks sessions to the same shard for read-after-write consistency within a session. Across sessions, reads are eventually consistent with a window of ~200ms under normal load. If you need strict consistency, set `consistency=strong` — adds 8ms median.",
    },
    {
      context: "AI platform (S8)",
      text:
        "The orchestrator retries on 429s with exponential backoff, caches idempotent calls by content hash, and enforces per-workspace token budgets. You get structured error types for the three failure modes that matter: rate limit, timeout, content refusal.",
    },
  ],
  ctaBank: [
    "Read the docs",
    "See the API",
    "Start building",
    "View pricing",
    "Deploy a sample",
    "Request access",
    "Talk to engineering",
  ],
  serviceLinePattern: {
    name: "Technical noun phrase: \"Horizontal sharding,\" \"Per-region replication,\" \"Token budgets.\"",
    description: "One specific sentence with at least one number, unit, or named approach.",
  },
};

// ─── V7 — Narrative Imaginative ─────────────────────────────────────────

export const V7_NARRATIVE_IMAGINATIVE: VoiceFamily = {
  id: "V7",
  name: "Narrative Imaginative",
  appliesToStyles: ["S4", "S10"],
  oneLine: "Evocative, story-driven, slightly poetic.",
  character:
    "The voice of a writer, not a marketer. Willing to be evocative, willing to sit inside a metaphor for a sentence before earning it back. For products that are a little bit about feeling and a little bit about imagination.",
  toneKeywords: ["evocative", "curious", "story-forward", "warm", "unapologetically literary"],
  sentenceRhythm: [
    "Wide range. Short sentence, then a long rolling one. Fragments allowed when rhythmic, not when punchy (that's V5).",
    "Willing to start with a scene or a memory rather than a claim.",
    "One metaphor per paragraph. More than one and the voice tips into purple prose.",
    "Present or past tense both work. Second person (\"you\") is allowed but should be rare.",
  ],
  openingFormulas: [
    "{{Scene-setting fragment}} — \"A small door in a wall that wasn't there yesterday.\"",
    "{{Imperative verb}} {{evocative object}} — \"Remember the first time you saw snow.\"",
    "{{If/when}} {{condition}}, {{what becomes possible}} — \"When a machine learns to wonder, things get interesting.\"",
    "{{Story opener borrowed from fiction}} — \"There used to be a third coast.\"",
  ],
  banList: [
    "unlock your potential", "journey of discovery", "find yourself", "embrace the journey",
    "!",
  ],
  signatureMoves: [
    "Start with a concrete image, move to the idea.",
    "Use weather, time of day, and light as mood anchors.",
    "Willing to ask questions without answering them.",
    "Reference fiction, myth, common childhood experiences. Signals imagination as a shared language.",
  ],
  exampleHeadlines: [
    {
      bad: "Revolutionary Game That Will Change How You Play",
      good: "A map you draw by forgetting.",
      why: "V7 is willing to be slightly cryptic — the mystery earns a click.",
    },
    {
      bad: "Creative Tools for Modern Artists",
      good: "For the things you only make after midnight.",
      why: "Specificity of context, implication of a kind of work.",
    },
    {
      bad: "Experience the Magic of Storytelling",
      good: "Stories, for readers who remember when stories were longer.",
      why: "Generational-aware, slightly melancholy, clearly for a specific reader.",
    },
  ],
  exampleBodyCopy: [
    {
      context: "Creative studio (S10)",
      text:
        "We make the kind of work that takes a year and returns in pieces — a short film here, a book there, a soundtrack somebody else will release. What we're really doing is maintaining a garden. Some of what grows in it gets picked.",
    },
    {
      context: "Game / narrative product (S4)",
      text:
        "The first time you play, you won't finish. You'll get to a river and stop, not because the game stops you, but because the river feels worth sitting next to for a while. That's the design. The thirty-hour playtime is actually more like a hundred, if you're the kind of player we made this for.",
    },
  ],
  ctaBank: [
    "Begin",
    "Open the door",
    "Enter",
    "Read the first chapter",
    "See what's there",
    "Step inside",
    "Keep reading",
  ],
  serviceLinePattern: {
    name: "Evocative noun phrase or gerund: \"The Map,\" \"Finding your way back,\" \"The third act.\"",
    description: "1-2 sentences that place the feature inside a tiny scene.",
  },
};

// ─── Registry ───────────────────────────────────────────────────────────

export const VOICE_FAMILIES: Record<VoiceFamilyId, VoiceFamily> = {
  V1: V1_HERITAGE_UNDERSTATED,
  V2: V2_INTELLECTUAL_EDITORIAL,
  V3: V3_ORGANIC_GROUNDED,
  V4: V4_HUMANE_PROFESSIONAL,
  V5: V5_APPETITE_KINETIC,
  V6: V6_SYSTEMS_PRECISE,
  V7: V7_NARRATIVE_IMAGINATIVE,
};

/**
 * Style → voice family map, verbatim from voice-banks.md.
 * Every styleId maps to exactly one voice; this is the pipeline's source
 * of truth for which voice to refine against.
 */
export const STYLE_TO_VOICE: Record<StyleId, VoiceFamilyId> = {
  S1: "V1", S2: "V1", S11: "V1", S12: "V1", S13: "V1", S15: "V1",
  S6: "V2", S7: "V2", S14: "V2",
  S3: "V3", S9: "V3", S16: "V3",
  S17: "V4",
  S18: "V5",
  S5: "V6", S8: "V6",
  S4: "V7", S10: "V7",
};

/** Narrow a string to StyleId if it matches. Returns null otherwise. */
export function asStyleId(s: string | null | undefined): StyleId | null {
  if (!s) return null;
  return (s in STYLE_TO_VOICE) ? (s as StyleId) : null;
}

/** Look up the voice family for a style. Throws on unknown styleId. */
export function getVoiceForStyle(styleId: StyleId): VoiceFamily {
  const id = STYLE_TO_VOICE[styleId];
  const voice = VOICE_FAMILIES[id];
  if (!voice) throw new Error(`No voice family for styleId=${styleId}`);
  return voice;
}

/** Return the style-specific override text, if any, for (voice, style). */
export function getStyleOverride(voice: VoiceFamily, styleId: StyleId): string | null {
  return voice.styleOverrides?.[styleId] ?? null;
}
