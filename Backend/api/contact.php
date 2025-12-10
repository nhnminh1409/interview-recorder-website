<?php
// api/contact.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'msg' => 'Chỉ chấp nhận POST']);
    exit;
}

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

// Bảo vệ: chống XSS + trim
$fields = array_map('htmlspecialchars', $fields);
$fields = array_map('trim', $fields);

// Tạo dòng dữ liệu ĐÚNG 1 lần thời gian, căn lề đẹp, xuống dòng rõ ràng
$line = date('Y-m-d H:i:s') . " | "
      . str_pad($fields[0], 20, " ") . " | "  // Họ tên
      . str_pad($fields[1], 12, " ") . " | "  // SĐT
      . str_pad($fields[2], 10, " ") . " | "  // Năm sinh
      . str_pad($fields[3], 25, " ") . " | "  // Email
      . str_pad($fields[4], 12, " ") . " | "  // Bạn là
      . $fields[5]                     // Nội dung (không pad để hiện đầy đủ)
      . PHP_EOL . PHP_EOL;             // 2 lần xuống dòng cho dễ nhìn

// Ghi vào file (chỉ ghi $line – không thêm thời gian lần nữa!)
$file = '/../../data/contact-messages.txt';
$result = file_put_contents($file, $line, FILE_APPEND | LOCK_EX);

if ($result === false) {
    echo json_encode(['status' => 'error', 'msg' => 'Không ghi được file']);
} else {
    echo json_encode(['status' => 'success']);
}
?>