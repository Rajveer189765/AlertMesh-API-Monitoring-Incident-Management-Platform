
async function performHealthCheck(url, expectedStatusCode = 200, timeoutMs = 5000, method = "GET") {
    const startTime = performance.now();

    try {
        const response = await fetch(url, {
            method: method,
            signal: AbortSignal.timeout(timeoutMs)
        });

        const endTime = performance.now();

        const responseTime = Math.round(endTime - startTime);

        return {
            success: response.status === expectedStatusCode,
            statusCode: response.status,
            responseTimeMs: responseTime,
            errorType: null,
            errorMessage: null
        };

    }

    catch (error) {
        const isTimeout = error.name === "TimeoutError";

        return {
            success: false,
            statusCode: null,
            responseTimeMs: Math.round(performance.now() - startTime),
            errorType: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
            errorMessage: isTimeout
                ? `Request timed out after ${timeoutMs}ms`
                : error.message
        };
    }

}

module.exports = { performHealthCheck };
