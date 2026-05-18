const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36";

const PRESETS = {
    mp: {
        Referer: "https://mp.weixin.qq.com",
    },
};

function error(msg, status = 400) {
    return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

async function parseRequest(request) {
    const url = new URL(request.url);
    const targetURL = url.searchParams.get("url");
    if (!targetURL) {
        throw new Error("Missing target URL");
    }

    const method = request.method;
    const body = method === "POST" || method === "PUT" ? await request.text() : null;

    const targetHeaders = {};
    for (const [key, value] of request.headers.entries()) {
        if (!["host", "cf-connecting-ip", "cf-ray", "cf-visitor"].includes(key.toLowerCase())) {
            targetHeaders[key] = value;
        }
    }

    if (!targetHeaders["User-Agent"]) {
        targetHeaders["User-Agent"] = UA;
    }

    const preset = url.searchParams.get("preset");
    if (preset && PRESETS[preset]) {
        Object.assign(targetHeaders, PRESETS[preset]);
    }

    return {
        origin: request.headers.get("Origin") || "*",
        targetURL,
        targetMethod: method,
        targetBody: body,
        targetHeaders,
    };
}

async function wfetch(url, method, body, headers = {}) {
    return fetch(url, {
        method,
        body: body || undefined,
        headers: { ...headers },
    });
}

export default {
    async fetch(request) {
        try {
            const {
                origin,
                targetURL,
                targetMethod,
                targetBody,
                targetHeaders,
            } = await parseRequest(request);

            const response = await wfetch(
                targetURL,
                targetMethod,
                targetBody,
                targetHeaders
            );

            return new Response(response.body, {
                headers: {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Max-Age": "86400",
                    "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
                },
            });
        } catch (err) {
            return error(err.message);
        }
    },
};