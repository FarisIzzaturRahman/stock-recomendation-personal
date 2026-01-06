/**
 * Utility for IDX (Indonesia Stock Exchange) market hours.
 * Standard hours (WIB): Mon - Fri, 09:00 - 15:45 (approximated for regular session).
 */

export interface MarketStatus {
    isOpen: boolean;
    message: string;
    nextCheckMinutes: number;
}

export function getIDXMarketStatus(): MarketStatus {
    // Use UTC offset to calculate WIB (UTC+7)
    const now = new Date();

    // Get time in WIB regardless of user's local timezone
    // This ensures consistent behavior even if user is abroad
    const wibTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

    const day = wibTime.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const hours = wibTime.getHours();
    const minutes = wibTime.getMinutes();
    const currentTimeInMinutes = hours * 60 + minutes;

    // Weekend check
    if (day === 0 || day === 6) {
        return {
            isOpen: false,
            message: 'Market Closed (Weekend)',
            nextCheckMinutes: 60, // check less frequently on weekends
        };
    }

    // Trading Hours check (09:00 - 16:00 WIB as a safe buffer for delayed data)
    // Regular IDX closing is usually 16:00 WIB
    const openTime = 9 * 60; // 09:00
    const closeTime = 16 * 0; // 16:00 (user suggested 15:00, but 16:00 is more accurate for closing)

    // Correction: 16:00 is 16 * 60
    const closeTimeActual = 16 * 60;

    if (currentTimeInMinutes >= openTime && currentTimeInMinutes < closeTimeActual) {
        return {
            isOpen: true,
            message: 'Market Open',
            nextCheckMinutes: 5,
        };
    }

    // Morning check (before 09:00)
    if (currentTimeInMinutes < openTime) {
        return {
            isOpen: false,
            message: `Market Closed (Opening at 09:00 WIB)`,
            nextCheckMinutes: Math.max(1, openTime - currentTimeInMinutes),
        };
    }

    // Evening check (after 16:00)
    return {
        isOpen: false,
        message: 'Market Closed (Session Ended)',
        nextCheckMinutes: 60,
    };
}

export function formatWIBTime(date: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(date) + ' WIB';
}
