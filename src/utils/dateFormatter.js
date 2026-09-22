function parseDate(date) {
    const parsedDate = new Date(date);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function formatDate(date, locale = "pt-BR") {
    const parsedDate = parseDate(date);
    if (!parsedDate) return "Data não informada";

    return parsedDate.toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

export function formatDateTime(date, locale = "pt-BR") {
    const parsedDate = parseDate(date);
    if (!parsedDate) return "Data não informada";

    return parsedDate.toLocaleString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}
