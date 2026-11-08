const net = require("node:net");
const dns = require("node:dns/promises");

function isPrivateIPv4(ip) {
    const parts = ip.split(".").map(Number);

    const [a, b] = parts;

    // 10.0.0.0/8
    if (a === 10) return true;

    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;

    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;

    return false;
}


function isPrivateIPv6(ip) {
    const normalizedIp = ip.toLowerCase();

    // IPv6 loopback
    if (normalizedIp === "::1") {
        return true;
    }

    // Expand compressed IPv6 notation
    const halves = normalizedIp.split("::");

    if (halves.length > 2) return false;

    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];

    const missingGroups = 8 - left.length - right.length;

    if (missingGroups < 0) return false;

    const groups = [
        ...left,
        ...Array(missingGroups).fill("0"),
        ...right
    ];

    if (groups.length !== 8) return false;

    const first = parseInt(groups[0], 16);

    // fc00::/7
    const uniqueLocal = (first & 0xfe00) === 0xfc00;

    // fe80::/10
    const linkLocal = (first & 0xffc0) === 0xfe80;

    return uniqueLocal || linkLocal;
}

async function validateResolvedHostname(hostname) {
    try {
        // If the hostname is already an IP address, no DNS lookup is needed.
        const ipFamily = net.isIP(hostname);

        if (ipFamily !== 0) {
            const isBlocked = ipFamily === 4
                ? isPrivateIPv4(hostname)
                : isPrivateIPv6(hostname);

            return {
                valid: !isBlocked,
                reason: isBlocked ? "BLOCKED_IP_ADDRESS" : null,
                addresses: [hostname]
            };
        }

        // Resolve the domain into all its IP addresses.
        const results = await dns.lookup(hostname, {
            all: true,
            verbatim: true
        });

        if (results.length === 0) {
            return {
                valid: false,
                reason: "DNS_RESOLUTION_FAILED",
                addresses: []
            };
        }

        // Reject the hostname if ANY resolved IP is blocked.
        for (const result of results) {
            const isBlocked = result.family === 4
                ? isPrivateIPv4(result.address)
                : isPrivateIPv6(result.address);

            if (isBlocked) {
                return {
                    valid: false,
                    reason: "BLOCKED_IP_ADDRESS",
                    addresses: results.map(item => item.address)
                };
            }
        }

        return {
            valid: true,
            reason: null,
            addresses: results.map(item => item.address)
        };

    } catch (error) {
        return {
            valid: false,
            reason: "DNS_RESOLUTION_FAILED",
            addresses: []
        };
    }
}

async function validateMonitorUrl(url) {
    let parsedUrl;

    try {
        parsedUrl = new URL(url);
    } catch {
        return {
            valid: false,
            reason: "INVALID_URL"
        };
    }

    // 1. Protocol validation
    const allowedProtocols = ["http:", "https:"];

    if (!allowedProtocols.includes(parsedUrl.protocol)) {
        return {
            valid: false,
            reason: "UNSUPPORTED_PROTOCOL"
        };
    }

    // 2. Extract and normalize hostname
    const hostname = parsedUrl.hostname
        .toLowerCase()
        .replace(/^\[|\]$/g, "");

    // 3. Block explicitly prohibited hostnames
    const blockedHostnames = [
        "localhost",
        "localhost.localdomain"
    ];

    if (blockedHostnames.includes(hostname)) {
        return {
            valid: false,
            reason: "BLOCKED_HOSTNAME"
        };
    }

    // 4. Resolve DNS and validate every IP address
    const dnsValidation = await validateResolvedHostname(hostname);

    if (!dnsValidation.valid) {
        return dnsValidation;
    }

    // All checks passed
    return {
        valid: true,
        reason: null,
        addresses: dnsValidation.addresses
    };
}

module.exports = { validateMonitorUrl, validateResolvedHostname };
