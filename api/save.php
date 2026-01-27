<?php
require_once __DIR__ . '/cors.php';

// Decode the incoming JSON payload
$data = json_decode(file_get_contents('php://input'), true);

// Validate the payload
if (!$data || !isset($data['notes']) || !isset($data['name']) || !isset($data['startDate']) || !isset($data['endDate'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input. Missing required fields: notes, name, startDate, or endDate.']);
    exit;
}

// Define the notebooks folder
$notebooksDir = __DIR__ . "/notebooks";

// Create the notebooks folder if it doesn't exist
if (!is_dir($notebooksDir)) {
    if (!mkdir($notebooksDir, 0777, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create notebooks directory']);
        exit;
    }
}

// Sanitize the notebook name
$name = preg_replace('/[^a-zA-Z0-9_-]/', '_', $data['name']); // Sanitize the name to avoid invalid characters
$filePath = $notebooksDir . "/$name.txt";

// Prepare the data to save
$savedData = [
    'notes' => $data['notes'],
    'startDate' => $data['startDate'],
    'endDate' => $data['endDate']
];

// Save the data to the file
if (file_put_contents($filePath, json_encode($savedData, JSON_PRETTY_PRINT))) {
    echo json_encode(['success' => true, 'name' => $name]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save notes']);
}
?>
