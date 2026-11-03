/**
 * Cloudflare Worker — proxy gọi Claude cho MPO Purchase Platform
 *
 * Vì sao cần worker: GitHub Pages chỉ phục vụ file tĩnh. Nếu đặt API key
 * thẳng trong trang thì ai xem mã nguồn cũng lấy được và tiêu tiền của bạn.
 * Worker giữ key ở phía máy chủ, trang chỉ gọi worker.
 *
 * CÁCH TRIỂN KHAI
 *  1. Vào dash.cloudflare.com → Workers & Pages → Create → Start from Hello World
 *  2. Dán toàn bộ file này vào, bấm Deploy
 *  3. Settings → Variables and Secrets → Add → Type: Secret
 *     Name: ANTHROPIC_API_KEY     Value: key của bạn (sk-ant-...)
 *  4. Copy URL worker (dạng https://ten-worker.tai-khoan.workers.dev)
 *
 * BẢO VỆ ĐÃ CÀI SẴN
 *  - Chỉ nhận request từ đúng các origin trong ALLOWED
 *  - Giới hạn độ dài prompt và max_tokens
 *  - Giới hạn số lượt mỗi IP mỗi ngày (cần bind KV, xem phần cuối file)
 */

const ALLOWED = [
  'https://quanghuy-08-ueh.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

const MODEL_MAC_DINH = 'claude-sonnet-5-5';
const GIOI_HAN_PROMPT = 180000;   // ký tự
const GIOI_HAN_TOKENS = 2000;
const LUOT_MOI_NGAY   = 150;      // mỗi IP, chỉ áp dụng khi có KV

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const ok = ALLOWED.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), {
      status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST')    return json({ error: 'method_not_allowed' }, 405);
    if (!ok)                      return json({ error: 'origin_not_allowed', origin }, 403);
    if (!env.ANTHROPIC_API_KEY)   return json({ error: 'missing_api_key' }, 500);

    let body;
    try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }

    const messages = Array.isArray(body.messages) ? body.messages.slice(-24) : null;
    if (!messages || !messages.length) return json({ error: 'no_messages' }, 400);

    const size = JSON.stringify(messages).length + String(body.system || '').length;
    if (size > GIOI_HAN_PROMPT) return json({ error: 'prompt_too_large', size }, 413);

    // Giới hạn lượt mỗi IP mỗi ngày — chỉ chạy khi đã bind KV tên RATE
    if (env.RATE) {
      const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
      const key = `${ip}:${new Date().toISOString().slice(0, 10)}`;
      const n = Number(await env.RATE.get(key)) || 0;
      if (n >= LUOT_MOI_NGAY) return json({ error: 'rate_limited', limit: LUOT_MOI_NGAY }, 429);
      await env.RATE.put(key, String(n + 1), { expirationTtl: 86400 });
    }

    const payload = {
      model: body.model || MODEL_MAC_DINH,
      max_tokens: Math.min(Number(body.max_tokens) || 1400, GIOI_HAN_TOKENS),
      messages,
      stream: true,
    };
    if (body.system) payload.system = String(body.system);
    if (Array.isArray(body.tools) && body.tools.length) payload.tools = body.tools.slice(0, 8);

    let upstream;
    try {
      upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json({ error: 'upstream_unreachable', detail: String(e).slice(0, 300) }, 502);
    }

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 600);
      return json({ error: 'upstream_error', status: upstream.status, detail }, upstream.status);
    }

    return new Response(upstream.body, {
      headers: { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  },
};

/**
 * TUỲ CHỌN — giới hạn lượt dùng
 * Workers & Pages → KV → Create namespace, đặt tên bất kỳ.
 * Quay lại worker → Settings → Bindings → Add → KV namespace
 *   Variable name: RATE      KV namespace: namespace vừa tạo
 * Không bind thì worker vẫn chạy, chỉ là không chặn lượt.
 *
 * NẾU BÁO LỖI MODEL
 * Đổi MODEL_MAC_DINH sang một trong các giá trị sau, tuỳ gói của bạn:
 *   claude-sonnet-5-5   claude-opus-5-5   claude-haiku-5-5
 * Worker trả nguyên văn lỗi của API trong trường detail để bạn đối chiếu.
 */
