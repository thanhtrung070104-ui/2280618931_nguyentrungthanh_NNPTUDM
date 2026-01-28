const apiPost = "http://localhost:3000/posts";
const apiComment = "http://localhost:3000/comments";

// --- HÀM TIỆN ÍCH CHUNG (HELPER) ---
// Hàm tìm ID lớn nhất và cộng thêm 1
function generateNewId(listData) {
    let maxId = 0;
    listData.forEach(item => {
        let currentId = parseInt(item.id);
        if (!isNaN(currentId) && currentId > maxId) maxId = currentId;
    });
    return (maxId + 1).toString();
}

// =======================================================
// PHẦN 1: LOGIC POSTS
// =======================================================

async function loadPosts() {
    try {
        const res = await fetch(apiPost);
        const posts = await res.json();
        
        let body = document.getElementById("body_posts");
        body.innerHTML = '';
        
        posts.forEach(post => {
            const isDeleted = post.isDeleted === true;
            const rowClass = isDeleted ? 'deleted-row' : '';
            const statusHtml = isDeleted 
                ? '<span class="badge bg-gray">Đã xoá</span>' 
                : '<span class="badge bg-green">Active</span>';

            // Thêm sự kiện onclick để đổ dữ liệu lên form khi bấm vào dòng
            body.innerHTML += `
                <tr class="${rowClass}" onclick="fillPostForm('${post.id}', '${post.title}', '${post.views}')">
                    <td><b>${post.id}</b></td>
                    <td>${post.title}</td>
                    <td>${post.views}</td>
                    <td style="text-align:center">${statusHtml}</td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

async function createPost() {
    let title = document.getElementById("post_title").value.trim();
    let views = document.getElementById("post_views").value;

    // VALIDATION: Không cho phép để trống
    if (!title) { alert("Vui lòng nhập Tiêu đề bài viết!"); return; }
    if (!views) views = 0; // Mặc định views là 0 nếu không nhập

    try {
        // 1. Lấy danh sách cũ để tính ID
        const res = await fetch(apiPost);
        const posts = await res.json();
        const newId = generateNewId(posts);

        // 2. Tạo đối tượng mới
        const data = { id: newId, title: title, views: Number(views), isDeleted: false };

        // 3. Gửi lên Server
        await fetch(apiPost, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        alert("Thêm bài viết thành công!");
        loadPosts();
        clearPostForm();
    } catch (err) { alert("Lỗi hệ thống!"); }
}

async function updatePost() {
    let id = document.getElementById("post_id").value;
    let title = document.getElementById("post_title").value;
    let views = document.getElementById("post_views").value;

    if (!id) { alert("Vui lòng chọn bài viết cần sửa trong bảng!"); return; }

    await fetch(`${apiPost}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, views: Number(views) })
    });
    loadPosts();
    clearPostForm();
}

async function softDeletePost() {
    let id = document.getElementById("post_id").value;
    if (!id) { alert("Vui lòng chọn bài viết cần xoá!"); return; }

    if (confirm(`Bạn có chắc muốn xoá mềm bài viết ID ${id}?`)) {
        await fetch(`${apiPost}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDeleted: true })
        });
        loadPosts();
        clearPostForm();
    }
}

// Hàm điền form Post khi click vào bảng
function fillPostForm(id, title, views) {
    document.getElementById("post_id").value = id;
    document.getElementById("post_title").value = title;
    document.getElementById("post_views").value = views;
}
function clearPostForm() {
    document.getElementById("post_id").value = "";
    document.getElementById("post_title").value = "";
    document.getElementById("post_views").value = "";
}

// =======================================================
// PHẦN 2: LOGIC COMMENTS (CÓ KIỂM TRA POST TỒN TẠI)
// =======================================================

async function loadComments() {
    try {
        const res = await fetch(apiComment);
        const comments = await res.json();
        
        let body = document.getElementById("body_comments");
        body.innerHTML = '';
        
        comments.forEach(cmt => {
            body.innerHTML += `
                <tr onclick="fillCmtForm('${cmt.id}', '${cmt.text}', '${cmt.postId}')">
                    <td><b>${cmt.id}</b></td>
                    <td>${cmt.text}</td>
                    <td style="color:blue; font-weight:bold">${cmt.postId}</td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

async function createComment() {
    let text = document.getElementById("cmt_text").value.trim();
    let postId = document.getElementById("cmt_postId").value.trim();

    // VALIDATION 1: Rỗng
    if (!text || !postId) { alert("Nhập đủ Nội dung và Post ID!"); return; }

    try {
        // VALIDATION 2: Kiểm tra Post ID có tồn tại và chưa bị xoá không?
        const resPost = await fetch(`${apiPost}/${postId}`);
        if (!resPost.ok) {
            alert(`Lỗi: Bài viết có ID ${postId} không tồn tại!`);
            return;
        }
        const postData = await resPost.json();
        if (postData.isDeleted) {
            alert(`Lỗi: Bài viết ID ${postId} đã bị xoá, không thể bình luận!`);
            return;
        }

        // Nếu Post hợp lệ, tiến hành tạo Comment
        const resCmt = await fetch(apiComment);
        const comments = await resCmt.json();
        const newId = generateNewId(comments);

        const data = { id: newId, text: text, postId: postId };

        await fetch(apiComment, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        alert("Đã thêm bình luận!");
        loadComments();
        clearCmtForm();

    } catch (err) { alert("Lỗi kết nối server!"); }
}

async function updateComment() {
    let id = document.getElementById("cmt_id").value;
    let text = document.getElementById("cmt_text").value;
    let postId = document.getElementById("cmt_postId").value;

    if (!id) { alert("Chọn comment để sửa!"); return; }

    // (Có thể thêm logic kiểm tra postId mới có tồn tại không ở đây nếu muốn chặt chẽ hơn)

    await fetch(`${apiComment}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, postId: postId })
    });
    loadComments();
    clearCmtForm();
}

async function deleteComment() {
    let id = document.getElementById("cmt_id").value;
    if (!id) { alert("Chọn comment để xoá!"); return; }

    if(confirm("Xoá vĩnh viễn comment này?")) {
        await fetch(`${apiComment}/${id}`, { method: 'DELETE' });
        loadComments();
        clearCmtForm();
    }
}

// Hàm điền form Comment
function fillCmtForm(id, text, postId) {
    document.getElementById("cmt_id").value = id;
    document.getElementById("cmt_text").value = text;
    document.getElementById("cmt_postId").value = postId;
}
function clearCmtForm() {
    document.getElementById("cmt_id").value = "";
    document.getElementById("cmt_text").value = "";
    document.getElementById("cmt_postId").value = "";
}

// KHỞI CHẠY
loadPosts();
loadComments();