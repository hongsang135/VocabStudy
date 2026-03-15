// functions/api.js
export async function onRequest(context) {
    const { request, env } = context;
    const db = env.vocab_db; // Tên binding bạn đặt trong Dashboard Cloudflare

    // API LẤY DỮ LIỆU (GET)
    if (request.method === "GET") {
        try {
            const result = await db.prepare("SELECT data FROM vocabulary WHERE id = ?")
                                   .bind("user_current_data")
                                   .first();
            return new Response(result ? result.data : "", { status: 200 });
        } catch (e) {
            return new Response("Lỗi DB: " + e.message, { status: 500 });
        }
    }

    // API LƯU DỮ LIỆU (POST)
    if (request.method === "POST") {
        try {
            const { content, password } = await request.json();
            
            // So khớp với mật khẩu bạn đã cài trong Environment Variables
            if (password !== env.SYNC_PASSWORD) { 
                return new Response("Sai mật khẩu", { status: 401 });
            }

            await db.prepare("INSERT OR REPLACE INTO vocabulary (id, data) VALUES (?, ?)")
                    .bind("user_current_data", content)
                    .run();
            return new Response("Đã lưu thành công", { status: 200 });
        } catch (e) {
            return new Response("Lỗi: " + e.message, { status: 500 });
        }
    }
}