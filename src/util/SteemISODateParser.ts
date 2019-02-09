export class SteemISODateParser {
    public static parse(isoDate: string): Date {
        const parsedWithZ = Date.parse(isoDate + "Z");
        if (!isNaN(parsedWithZ)) return new Date(parsedWithZ);
        else {
            return new Date(isoDate);
        }
    }
}
