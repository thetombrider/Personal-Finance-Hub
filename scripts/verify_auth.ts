
import http from 'http';

const port = process.env.PORT || "5001";
const baseUrl = `http://localhost:${port}`;

async function checkRoute(path: string, method: string = 'GET'): Promise<number> {
    return new Promise((resolve, reject) => {
        const req = http.request(`${baseUrl}${path}`, { method }, (res) => {
            resolve(res.statusCode || 0);
        });
        req.on('error', reject);
        req.end();
    });
}

async function verify() {
    console.log(`Verifying auth on ${baseUrl}...`);

    try {
        // 1. Check a protected route (should fail with 401)
        const accountsStatus = await checkRoute('/api/accounts');
        console.log(`/api/accounts status: ${accountsStatus}`);
        if (accountsStatus !== 401) {
            console.error('FAIL: /api/accounts should allow be 401 Unauthorized');
            process.exit(1);
        } else {
            console.log('PASS: /api/accounts is protected');
        }

        // 2. Check an exempted route (should NOT be 401)
        // We expect 405 Method Not Allowed (since we send GET but it expects POST) 
        // or 400 (if we sent POST with bad data) or something else.
        // Just checking it's NOT 401 is enough to prove the middleware didn't block it.
        const webhookStatus = await checkRoute('/api/webhooks/tally', 'GET');
        // Note: The actual route for GET /api/webhooks/tally exists and returns 200 (instructions)
        console.log(`/api/webhooks/tally (GET) status: ${webhookStatus}`);

        if (webhookStatus === 401) {
            console.error('FAIL: /api/webhooks/tally should NOT be 401');
            process.exit(1);
        } else {
            console.log('PASS: /api/webhooks/tally is exempted from auth');
        }

        console.log('All verifications passed.');
        process.exit(0);

    } catch (err) {
        console.error('Verification failed with error:', err);
        process.exit(1);
    }
}

// Wait a bit for server to start if running via a combo command, 
// though we usually run server then script separately.
setTimeout(verify, 1000);
