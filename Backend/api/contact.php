<?php
// api/contact.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$file = __DIR__ . '/../data/contact-messages.txt';
$action = $_GET['action'] ?? '';

// =============================
// 🟢 LẤY DANH SÁCH FEEDBACK
// =============================
if ($action === 'list') {
    if (!file_exists($file)) {
        echo json_encode(['ok' => true, 'messages' => []]);
        exit;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $messages = [];

    foreach ($lines as $line) {
        if (strpos($line, '|') === false) continue;
        $cols = array_map('trim', explode('|', $line));
        if (count($cols) < 7) continue;

        $messages[] = [
            'time' => $cols[0],
            'name' => $cols[1],
            'phone' => $cols[2],
            'year' => $cols[3],
            'email' => $cols[4],
            'role' => $cols[5],
            'message' => $cols[6]
        ];
    }

    echo json_encode(['ok' => true, 'messages' => array_reverse($messages)]);
    exit;
}

// =============================
// 🗑️ XÓA FEEDBACK
// =============================
if ($action === 'delete') {
    $keyword = $_GET['keyword'] ?? '';
    if (trim($keyword) === '') {
        echo json_encode(['status' => 'error', 'msg' => 'Thiếu từ khóa để xóa (email hoặc số điện thoại)']);
        exit;
    }

    if (!file_exists($file)) {
        echo json_encode(['status' => 'error', 'msg' => 'Không tìm thấy file lưu feedback']);
        exit;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES);
    $newLines = [];
    $deleted = false;

    foreach ($lines as $line) {
        if (stripos($line, $keyword) !== false) {
            $deleted = true;
            continue;
        }
        $newLines[] = $line;
    }

    if ($deleted) {
        file_put_contents($file, implode(PHP_EOL, $newLines) . PHP_EOL);
        echo json_encode(['status' => 'success', 'msg' => "Đã xóa feedback chứa '$keyword'"]);
    } else {
        echo json_encode(['status' => 'error', 'msg' => "Không tìm thấy feedback chứa '$keyword'"]);
    }
    exit;
}

// =============================
// ✉️ GỬI FEEDBACK (POST)
// =============================
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'msg' => 'Dữ liệu không hợp lệ']);
        exit;
    }

    $fields = [
        $data['name'] ?? '',
        $data['phone'] ?? '',
        $data['year_of_birth'] ?? '',
        $data['email'] ?? '',
        $data['role'] ?? '',
        $data['message'] ?? ''
    ];

    $fields = array_map('htmlspecialchars', $fields);
    $fields = array_map('trim', $fields);

    $line = date('Y-m-d H:i:s') . " | "
        . str_pad($fields[0], 20, " ") . " | "
        . str_pad($fields[1], 12, " ") . " | "
        . str_pad($fields[2], 10, " ") . " | "
        . str_pad($fields[3], 25, " ") . " | "
        . str_pad($fields[4], 12, " ") . " | "
        . $fields[5]
        . PHP_EOL . PHP_EOL;

    $result = file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

    echo json_encode($result === false
        ? ['status' => 'error', 'msg' => 'Không ghi được file']
        : ['status' => 'success']
    );
    exit;
}

echo json_encode(['status' => 'error', 'msg' => 'Hành động không hợp lệ']);
?>
