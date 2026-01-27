<?php
require_once __DIR__ . '/cors.php';

// Include the configuration file
$config = require './config.php'; // Adjust the path accordingly

// Check for the API key in the request headers
if (!isset($_SERVER['HTTP_API_KEY']) || $_SERVER['HTTP_API_KEY'] !== $config['api_key']) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Get the start and end dates from the query parameters
$startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
$endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;

if (!$startDate || !$endDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Start date and end date are required']);
    exit;
}

try {
    // Establish database connection
    $pdo = new PDO("mysql:host={$config['host']};dbname={$config['database']}", $config['user'], $config['password']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Delete records from repd_vp_cedulas_principal that do not have a corresponding lat_long in repd_vp_inferencias
    $deleteStmt = $pdo->prepare("
        DELETE FROM repd_vp_cedulas_principal
        WHERE id_cedula_busqueda NOT IN (
            SELECT DISTINCT id_cedula_busqueda FROM repd_vp_inferencias WHERE lat_long IS NOT NULL
        )
    ");
    //$deleteStmt->execute();

    // Query to fetch remaining records based on the specified date range
    $stmt = $pdo->prepare("SELECT * FROM cedulas_anonimizadas WHERE fecha_desaparicion BETWEEN :start_date AND :end_date");
    $stmt->bindParam(':start_date', $startDate);
    $stmt->bindParam(':end_date', $endDate);
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each record, check for additional information in the repd_vp_inferencias table
    foreach ($records as &$record) {
        $id_cedula_busqueda = $record['id_cedula_busqueda'];

        // Query to fetch additional information from repd_vp_inferencias, including the new columns
        $inferenciasStmt = $pdo->prepare("
            SELECT id_cedula_busqueda, tipo_loc, loc, lat_long, fecha, 
                   sum_score, violence_score, violence_terms 
            FROM repd_vp_inferencia3 
            WHERE id_cedula_busqueda = :id_cedula_busqueda
        ");
        $inferenciasStmt->bindParam(':id_cedula_busqueda', $id_cedula_busqueda);
        $inferenciasStmt->execute();

        // Get tattoo information
        $tatuajesStmt = $pdo->prepare("
            SELECT descripcion, parte_cuerpo
            FROM repd_vp_cedulas_senas 
            WHERE id_cedula_busqueda = :id_cedula_busqueda 
            AND tipo_sena = 'TATUAJES'
        ");
        $tatuajesStmt->bindParam(':id_cedula_busqueda', $id_cedula_busqueda);
        $tatuajesStmt->execute();
        $tatuajes = $tatuajesStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch and add the additional information to the record if it exists
        $additionalInfo = $inferenciasStmt->fetch(PDO::FETCH_ASSOC);
        if ($additionalInfo) {
            // Merge additional info into the main record
            $record = array_merge($record, $additionalInfo);
        }
        
        // Add tattoos array to record
        $record['tatuajes'] = $tatuajes;
    }

    // Output the records as JSON
    echo json_encode(['records' => $records]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>