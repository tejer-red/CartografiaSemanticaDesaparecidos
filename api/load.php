<?php
require_once __DIR__ . '/cors.php';

$id = $_GET['id'] ?? null;
if (!$id) {
    http_response_code(400);
    echo json_encode(['error' => 'No ID provided']);
    exit;
}

// Define the notebooks folder
$notebooksDir = __DIR__ . "/notebooks";
$filePath = $notebooksDir . "/$id.txt";

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Notebook not found']);
    exit;
}

$savedData = json_decode(file_get_contents($filePath), true);
if ($savedData === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to read notebook']);
    exit;
}

// Include startDate and endDate in the response
echo json_encode([
    'success' => true,
    'notes' => $savedData['notes'] ?? [],
    'startDate' => $savedData['startDate'] ?? null,
    'endDate' => $savedData['endDate'] ?? null
]);
?>
