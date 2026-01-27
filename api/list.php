<?php
require_once __DIR__ . '/cors.php';

// Define the notebooks folder
$notebooksDir = __DIR__ . "/notebooks";

// Check if the notebooks folder exists
if (!is_dir($notebooksDir)) {
    http_response_code(404);
    echo json_encode(['error' => 'Notebooks folder not found']);
    exit;
}

// Scan the notebooks folder for .txt files
$files = array_diff(scandir($notebooksDir), ['.', '..']);
$notebooks = [];

foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'txt') {
        $notebooks[] = pathinfo($file, PATHINFO_FILENAME); // Add the filename without extension
    }
}

// Return the list of notebooks
echo json_encode(['success' => true, 'notebooks' => $notebooks]);
?>
