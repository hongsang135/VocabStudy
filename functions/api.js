export async function onRequest(context) {
    const { request, env } = context;

    // 1. Kiểm tra cấu hình Cloudflare (Binding & Env Var)
    if (!env.vocab_db) {
        return new Response("Lỗi: Bạn chưa thực hiện Binding D1 với tên 'vocab_db' trong Settings.", { status: 500 });
    }
    if (!env.SYNC_PASSWORD) {
        return new Response("Lỗi: Bạn chưa cài đặt Variable 'SYNC_PASSWORD' trong Settings.", { status: 500 });
    }

    const db = env.vocab_db;

    // 2. Xử lý yêu cầu LƯU dữ liệu (POST)
    if (request.method === "POST") {
        try {
            const { content, password } = await request.json();

            // Kiểm tra mật khẩu
            if (password !== env.SYNC_PASSWORD) {
                return new Response("Sai mật khẩu đồng bộ!", { status: 401 });
            }

            // Ghi dữ liệu vào D1
            await db.prepare("INSERT OR REPLACE INTO vocabulary (id, data) VALUES (?, ?)")
                    .bind("current_user_data", content)
                    .run();

            return new Response("Đã lưu dữ liệu lên Cloudflare thành công!", { status: 200 });
        } catch (e) {
            return new Response("Lỗi máy chủ khi lưu: " + e.message, { status: 500 });
        }
    }

    // 3. Xử lý yêu cầu TẢI dữ liệu (GET)
    if (request.method === "GET") {
        try {
            const result = await db.prepare("SELECT data FROM vocabulary WHERE id = ?")
                                   .bind("current_user_data")
                                   .first();
            
            return new Response(result ? result.data : "", { status: 200 });
        } catch (e) {
            return new Response("Lỗi máy chủ khi tải: " + e.message, { status: 500 });
        }
    }

    return new Response("Method not allowed", { status: 405 });
}