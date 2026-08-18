export const DEFAULT_MATCHING_PRIORITIES = Object.freeze({
    hardSkills: 45,
    workExperience: 30,
    education: 15,
    softSkills: 10,
});

export const MATCHING_PRIORITY_FIELDS = Object.freeze([
    { key: 'hardSkills', label: 'Hard Skills' },
    { key: 'workExperience', label: 'Work Experience' },
    { key: 'education', label: 'Education' },
    { key: 'softSkills', label: 'Soft Skills' },
]);

export const IMPORTANCE_LEVELS = Object.freeze([
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
    { value: 4, label: 'Very High' },
]);

const DEFAULT_RELATIVE_IMPORTANCE = Object.freeze({
    hardSkills: 4,
    workExperience: 3,
    education: 2,
    softSkills: 1,
});

export const createDefaultMatchingPriorities = () => ({
    ...DEFAULT_MATCHING_PRIORITIES,
});

export const createDefaultRelativeImportance = () => ({
    ...DEFAULT_RELATIVE_IMPORTANCE,
});

export const normalizeImportanceToPriorities = (importance = {}) => {
    const entries = MATCHING_PRIORITY_FIELDS.map(({ key }, index) => {
        const value = importance[key];
        if (!Number.isInteger(value) || value < 1 || value > 4) {
            throw new TypeError('Importance values must be integers from 1 to 4.');
        }
        return { key, index, value };
    });
    const importanceTotal = entries.reduce(
        (total, entry) => total + entry.value,
        0
    );

    const normalized = entries.map((entry) => {
        const exactWeight = (entry.value / importanceTotal) * 100;
        const floorWeight = Math.floor(exactWeight);
        return {
            ...entry,
            floorWeight,
            remainder: exactWeight - floorWeight,
        };
    });

    // Largest-remainder allocation guarantees a total of exactly 100. The
    // original criterion order resolves equal fractional remainders.
    const pointsRemaining =
        100 - normalized.reduce((total, entry) => total + entry.floorWeight, 0);
    const allocationOrder = [...normalized].sort(
        (left, right) =>
            right.remainder - left.remainder || left.index - right.index
    );
    const extraPoints = new Set(
        allocationOrder.slice(0, pointsRemaining).map((entry) => entry.key)
    );

    return Object.fromEntries(
        normalized.map((entry) => [
            entry.key,
            entry.floorWeight + (extraPoints.has(entry.key) ? 1 : 0),
        ])
    );
};

export const matchingPriorityTotal = (priorities = {}) =>
    MATCHING_PRIORITY_FIELDS.reduce((total, { key }) => {
        const value = priorities[key];
        return Number.isFinite(value) ? total + value : total;
    }, 0);

export const areMatchingPrioritiesValid = (priorities = {}) =>
    MATCHING_PRIORITY_FIELDS.every(({ key }) => {
        const value = priorities[key];
        return Number.isInteger(value) && value >= 0 && value <= 100;
    }) && matchingPriorityTotal(priorities) === 100;

export const matchingPrioritiesFromJob = (job = {}) => ({
    hardSkills:
        Number.isInteger(job.hard_skill_weight)
            ? job.hard_skill_weight
            : DEFAULT_MATCHING_PRIORITIES.hardSkills,
    workExperience:
        Number.isInteger(job.work_experience_weight)
            ? job.work_experience_weight
            : DEFAULT_MATCHING_PRIORITIES.workExperience,
    education:
        Number.isInteger(job.education_weight)
            ? job.education_weight
            : DEFAULT_MATCHING_PRIORITIES.education,
    softSkills:
        Number.isInteger(job.soft_skill_weight)
            ? job.soft_skill_weight
            : DEFAULT_MATCHING_PRIORITIES.softSkills,
});
