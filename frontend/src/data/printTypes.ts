export interface StylePreset {
  label: string;
  prompt: string;
}

export interface PrintType {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  heroTagline: string;
  defaultMode: 'text' | 'image';
  defaultDimensions: { value: number; unit: string; target: string };
  suggestedPrompts: string[];
  /** System prompt override for the initial fal.ai variations */
  variationSystemPrompt: string;
  /** System prompt override for the 4 angle views */
  angleSystemPrompt: string;
  /** Emoji or icon identifier for the card */
  icon: string;
  /** Pre-defined style options for image mode (shown as selectable cards) */
  stylePresets?: StylePreset[];
}

const BASE_VARIATION_PROMPT = `You are an expert image-generation engine. You must ALWAYS produce an image. Produce NO TEXT. Just an Image.

The image will be used for the creation of a full-color 3D printed model. Follow these principles:
- Show the FULL object from a clear 3/4 perspective angle — no cropping, no partial views
- Place the object on a plain neutral background with no distractions
- CRITICAL: Preserve ALL original colors from the reference image. The model must be FULLY COLORED — skin tones, clothing colors, hair color, accessories, etc. Do NOT render in grayscale, white, clay, or monochrome. Match the colors as closely as possible to the reference image.
- Ensure the object has a SOLID, STABLE BASE that can sit flat on a surface
- Avoid thin protruding parts, delicate overhangs, or floating elements
- Make surfaces smooth and well-defined with clear edges; Use bold, solid forms over intricate filigree or fine detail`;

const BASE_ANGLE_PROMPT = `You are an expert image-generation engine. You must ALWAYS produce an image. Produce NO TEXT. Just an Image.

You are creating various views of a full-color 3D object that will be used for 3D rendering. Therefore be extremely consistent with the object.

The style must be REALISTIC — not cartoon, not stylized. Render the object as it would appear in real life.
CRITICAL: Preserve ALL original colors from the reference image. The model must be FULLY COLORED — skin tones, clothing colors, hair color, accessories, etc. Do NOT render in grayscale, white, clay, or monochrome. Match the colors as closely as possible to the reference image.

Do NOT change details, or add features that are not in the reference image.
Use flat, even lighting that shows the geometry clearly without washing out the colors.`;

export const PRINT_TYPES: PrintType[] = [
  {
    slug: 'statue-bust',
    title: 'Custom Statue Bust',
    subtitle: 'Turn any photo into a stunning statue bust',
    description: 'Upload a photo of anyone and we\'ll create a realistic 3D printed bust — perfect for gifts, decor, or keepsakes.',
    heroTagline: 'Immortalize anyone in a custom 3D printed bust.',
    defaultMode: 'image',
    defaultDimensions: { value: 7, unit: 'cm', target: 'height' },
    suggestedPrompts: [
      'A classical marble-style bust',
      'A modern realistic portrait bust',
      'A bust with a pedestal base',
    ],
    icon: '🗿',
    variationSystemPrompt: `${BASE_VARIATION_PROMPT}

SPECIFIC TO THIS TASK: You are creating a statue bust — a head and shoulders sculpture on a pedestal base. The bust should be:
- Cut off cleanly at the chest/shoulders, sitting on a simple cylindrical or rectangular pedestal
- Highly detailed facial features — eyes, nose, mouth, hair texture
- Proportional and anatomically accurate
- Styled as a realistic portrait sculpture`,
    angleSystemPrompt: `${BASE_ANGLE_PROMPT}

SPECIFIC TO THIS TASK: This is a statue bust (head and shoulders on a pedestal). Keep the pedestal base consistent across all views. Maintain exact facial features and proportions.`,
  },
  {
    slug: 'pet-portrait',
    title: 'Print My Pet',
    subtitle: 'Turn your pet into a 3D printed figurine',
    description: 'Upload a photo of your furry friend and get a custom 3D printed figurine that captures their personality perfectly.',
    heroTagline: 'Your best friend, forever in 3D.',
    defaultMode: 'image',
    defaultDimensions: { value: 7, unit: 'cm', target: 'longest' },
    suggestedPrompts: [
      'My dog sitting with a happy expression',
      'My cat in a playful pose',
      'A realistic figurine of my pet',
    ],
    icon: '🐾',
    variationSystemPrompt: `${BASE_VARIATION_PROMPT}

SPECIFIC TO THIS TASK: You are creating a 3D figurine of a pet (dog, cat, or other animal). The figurine should be:
- A full-body pose (sitting, standing, or lying down) — NOT just the head
- Realistic fur/coat texture and coloring that matches the reference photo
- A solid flat base underneath for stability
- Proportional and lifelike — capture the pet's breed characteristics and personality`,
    angleSystemPrompt: `${BASE_ANGLE_PROMPT}

SPECIFIC TO THIS TASK: This is a pet figurine. Maintain the exact fur coloring, markings, breed characteristics, and pose across all views. Keep the base consistent.`,
  },
  {
    slug: 'action-figure',
    title: 'Me as an Action Figure',
    subtitle: 'Turn yourself into a custom action figure',
    description: 'Upload your photo and we\'ll transform you into an epic action figure — complete with a dynamic pose and display base.',
    heroTagline: 'Become your own action figure.',
    defaultMode: 'image',
    defaultDimensions: { value: 10, unit: 'cm', target: 'height' },
    suggestedPrompts: [
      'An action hero version of me',
      'Me as a superhero with a cape',
      'A dynamic action figure with a cool pose',
    ],
    icon: '🦸',
    variationSystemPrompt: `${BASE_VARIATION_PROMPT}

SPECIFIC TO THIS TASK: You are creating an action figure of a real person. The figure should be:
- Full body, standing in a dynamic or heroic pose on a display base
- Realistic facial likeness matching the reference photo
- Wearing their actual clothing from the reference, or a stylized action-hero version of it
- Bold, solid proportions suitable for a collectible figurine (slightly stylized is OK but keep the face realistic)
- A circular or rectangular display base for stability`,
    angleSystemPrompt: `${BASE_ANGLE_PROMPT}

SPECIFIC TO THIS TASK: This is an action figure. Maintain exact facial likeness, clothing details, and pose across all views. Keep the display base consistent.`,
    stylePresets: [
      { label: 'Superhero', prompt: 'Transform this person into a superhero action figure with a cape, dynamic heroic pose, and a display base' },
      { label: 'Bobblehead', prompt: 'Transform this person into a bobblehead figurine with an oversized head, small body, and a round base' },
      { label: 'Anime Style', prompt: 'Transform this person into an anime-style action figure with stylized features, dynamic pose, and a display base' },
      { label: 'Warrior', prompt: 'Transform this person into a fantasy warrior action figure with armor, a weapon, and a rocky display base' },
    ],
  },
  {
    slug: 'cake-topper',
    title: 'Custom Cake Toppers',
    subtitle: 'Create personalized 3D printed cake toppers',
    description: 'Perfect for weddings, birthdays, and celebrations. Upload a photo and get a custom cake topper printed and shipped to you.',
    heroTagline: 'Make your celebration unforgettable.',
    defaultMode: 'image',
    defaultDimensions: { value: 10, unit: 'cm', target: 'height' },
    suggestedPrompts: [
      'A wedding couple cake topper',
      'A birthday character cake topper',
      'A fun celebration cake topper',
    ],
    icon: '🎂',
    variationSystemPrompt: `${BASE_VARIATION_PROMPT}

SPECIFIC TO THIS TASK: You are creating a cake topper figurine. The topper should be:
- Small-scale, simplified details that look good at 5-10cm height
- A wide, flat, STABLE BASE (very important — it needs to stand on a cake)
- Bright, cheerful colors appropriate for a celebration
- Clean, smooth surfaces without tiny fragile details
- Full body figure(s) in a celebratory or posed stance
- Proportions slightly stylized (larger head, simpler body) to work at small scale`,
    angleSystemPrompt: `${BASE_ANGLE_PROMPT}

SPECIFIC TO THIS TASK: This is a cake topper figurine. It must have a wide stable base. Keep proportions, colors, and the base consistent across all views. Details should be simple and clean for small-scale printing.`,
  },
  {
    slug: 'custom',
    title: 'Custom Creation',
    subtitle: 'Bring any idea to life in 3D',
    description: 'Describe anything you can imagine or upload a reference image. Our AI will generate a 3D model and we\'ll print it for you.',
    heroTagline: 'If you can imagine it, we can print it.',
    defaultMode: 'text',
    defaultDimensions: { value: 10, unit: 'cm', target: 'longest' },
    suggestedPrompts: [
      'A miniature castle with turrets',
      'A custom chess piece',
      'A fantasy creature figurine',
    ],
    icon: '✨',
    variationSystemPrompt: BASE_VARIATION_PROMPT,
    angleSystemPrompt: BASE_ANGLE_PROMPT,
  },
];

export function getPrintType(slug: string): PrintType | undefined {
  return PRINT_TYPES.find(pt => pt.slug === slug);
}

// ── Cake-topper "couple" mode presets ──────────────────────────────────
// Used by CoupleTopperControls + GenerationForm when slug === 'cake-topper'.
// Each preset's `prompt` is a clause that gets stitched into the user prompt
// via buildCoupleToppersPromptSuffix() below.

export interface CoupleToppersPreset {
  label: string;
  prompt: string;
}

export const CAKE_TOPPER_POSE_PRESETS: CoupleToppersPreset[] = [
  { label: 'Holding hands', prompt: 'holding hands side-by-side' },
  { label: 'Kiss',          prompt: 'sharing a gentle kiss' },
  { label: 'Dip',           prompt: 'in a romantic dip pose' },
  { label: 'Dancing',       prompt: 'dancing together' },
  { label: 'Back-to-back',  prompt: 'standing back-to-back confidently' },
];

export const CAKE_TOPPER_OUTFIT_PRESETS: CoupleToppersPreset[] = [
  { label: 'Tux + gown',  prompt: 'one wearing a classic black tuxedo, the other in a white wedding gown' },
  { label: 'Suit + suit', prompt: 'both wearing formal suits' },
  { label: 'Gown + gown', prompt: 'both wearing wedding gowns' },
  { label: 'Casual',      prompt: 'in casual matching outfits' },
  { label: 'Themed',      prompt: 'in fun coordinated themed outfits' },
];

export const CAKE_TOPPER_STYLE_PRESETS: CoupleToppersPreset[] = [
  { label: 'Realistic',  prompt: 'realistic proportions and likeness' },
  { label: 'Stylized',   prompt: 'stylized Pixar-like proportions' },
  { label: 'Chibi',      prompt: 'chibi style with oversized heads and cute features' },
  { label: 'Caricature', prompt: 'gentle caricature exaggeration of features' },
];

export const CAKE_TOPPER_HEIGHT_PRESETS: CoupleToppersPreset[] = [
  { label: 'P1 taller',   prompt: 'partner 1 noticeably taller than partner 2' },
  { label: 'Same height', prompt: 'both partners the same height' },
  { label: 'P2 taller',   prompt: 'partner 2 noticeably taller than partner 1' },
];

export type CoupleToppersPresetSelection = {
  pose?: string;
  outfit?: string;
  style?: string;
  heights?: string;
};

/**
 * Builds the user-prompt suffix for a cake-topper generation.
 *
 * `mode === 'pair'` produces a composition clause that tells nano-banana
 * the two reference images are partner 1 and partner 2 and must be merged
 * into one figurine. `mode === 'single'` produces a lighter clause that
 * only applies the chosen presets to the existing couple photo.
 *
 * Each preset is optional — anything left undefined is just skipped, which
 * lets nano-banana choose freely for that aspect.
 */
export function buildCoupleToppersPromptSuffix(
  mode: 'single' | 'pair',
  presets: CoupleToppersPresetSelection,
): string {
  const parts: string[] = [];
  if (mode === 'pair') {
    parts.push(
      "Compose Partner 1 (first reference image) and Partner 2 (second reference image) together into a single wedding cake-topper figurine. Preserve each person's facial likeness, hair, and skin tone from their reference photo. They must appear as one cohesive figurine on a shared base — not two separate figures.",
    );
  } else {
    parts.push(
      'Create a wedding cake-topper figurine of the couple in the reference photo. Preserve both faces and likenesses.',
    );
  }
  if (presets.pose)    parts.push(`Pose: ${presets.pose}.`);
  if (presets.outfit)  parts.push(`Outfits: ${presets.outfit}.`);
  if (presets.style)   parts.push(`Style: ${presets.style}.`);
  if (presets.heights) parts.push(`Heights: ${presets.heights}.`);
  return parts.join(' ');
}
