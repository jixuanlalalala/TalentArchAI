const EDUCATION_PHRASES = [
    "bachelor's degree",
    'bachelor degree',
    "master's degree",
    'master degree',
    'diploma in',
    'degree in',
    'qualification in',
    'computer science degree',
    'information technology degree',
    'fresh graduate',
    'fresh graduates',
    'graduates in',
    'graduates from',
];

const EXPLICIT_EXPERIENCE_PHRASES = [
    'years of experience',
    'year of experience',
    'prior experience',
    'previous experience',
    'relevant experience',
    'professional experience',
    'entry level',
    'fresh graduate',
    'fresh graduates',
    'internship experience',
    'senior level',
    'junior level',
];

const SOFT_SKILL_PHRASES = [
    'communication skills',
    'teamwork',
    'team player',
    'problem solving skills',
    'leadership skills',
    'interpersonal skills',
    'time management skills',
    'ability to collaborate',
    'adaptability',
    'communicate'
];

const REQUIREMENT_FRAMING_PHRASES = [
    'required',
    'preferred',
    'minimum',
    'must have',
    'looking for',
];

const CRITERION_LABELS = {
    workExperience: 'Work experience',
    education: 'Education',
    softSkills: 'Soft skills',
};

const WEIGHT_KEYS = {
    workExperience: ['workExperience', 'work_experience'],
    education: ['education'],
    softSkills: ['softSkills', 'soft_skills'],
};

export const normalizeGuidanceText = (value = '') =>
    String(value)
        .toLocaleLowerCase()
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u2010-\u2015]/g, '-')
        .replace(/'/g, '')
        .replace(/-/g, ' ')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const containsPhrase = (normalizedText, phrase) => {
    if (!normalizedText) return false;
    const normalizedPhrase = normalizeGuidanceText(phrase);
    return ` ${normalizedText} `.includes(` ${normalizedPhrase} `);
};

const containsAnyPhrase = (normalizedText, phrases) =>
    phrases.some((phrase) => containsPhrase(normalizedText, phrase));

const hasExplicitExperienceExpectation = (normalizedDescription) => {
    if (containsAnyPhrase(normalizedDescription, EXPLICIT_EXPERIENCE_PHRASES)) {
        return true;
    }

    const durationPattern =
        /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?\s+of(?:\s+[\p{L}\p{N}]+){0,4}\s+experience\b/u;
    if (durationPattern.test(normalizedDescription)) return true;

    const describesGainingExperience =
        /\b(?:gain|gaining|develop|developing)\s+experience\s+(?:in|with)\b/u.test(
            normalizedDescription
        );
    if (describesGainingExperience) return false;

    const hasExperiencePhrase =
        containsPhrase(normalizedDescription, 'experience in') ||
        containsPhrase(normalizedDescription, 'experience with');

    return (
        hasExperiencePhrase &&
        containsAnyPhrase(normalizedDescription, REQUIREMENT_FRAMING_PHRASES)
    );
};

const readWeight = (weights, criterion) => {
    if (!weights || typeof weights !== 'object') return null;

    for (const key of WEIGHT_KEYS[criterion]) {
        const value = Number(weights[key]);
        if (Number.isFinite(value)) return value;
    }
    return null;
};

export const checkJobDescriptionGuidance = ({
    description = '',
    weights = null,
} = {}) => {
    const normalizedDescription = normalizeGuidanceText(description);
    const criteria = {
        workExperience: hasExplicitExperienceExpectation(
            normalizedDescription
        ),
        education: containsAnyPhrase(
            normalizedDescription,
            EDUCATION_PHRASES
        ),
        softSkills: containsAnyPhrase(
            normalizedDescription,
            SOFT_SKILL_PHRASES
        ),
    };

    const consistencyWarnings = Object.entries(criteria).flatMap(
        ([criterion, identified]) => {
            const weight = readWeight(weights, criterion);
            if (identified || weight === null || weight <= 0) return [];

            return [
                {
                    criterion,
                    weight,
                    message: `${CRITERION_LABELS[criterion]} is weighted at ${weight}%, but no corresponding requirement was identified.`,
                },
            ];
        }
    );

    return {
        criteria,
        consistencyWarnings,
    };
};
