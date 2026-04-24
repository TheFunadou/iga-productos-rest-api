export const handleLimit = (limit?: number | null): number => {
    if (limit) return limit > 15 ? 15 : limit;
    return 15;
};