<?php
/**
 * sininden.php - Endpoint para obtener registros forenses (PFSI) por rango de fechas
 * 
 * PROCESO PRINCIPAL:
 * ==================
 * 1. Validar autenticación mediante API_KEY en headers
 * 2. Validar parámetros de entrada (start_date, end_date)
 * 3. Consultar tabla pfsi_v2_principal (Personas Fallecidas Sin Identificar)
 * 4. Retornar JSON con registros forenses
 * 
 * TABLA UTILIZADA:
 * - pfsi_v2_principal: Registro de personas fallecidas sin identificar
 *   del Sistema de Información Forense (PFSI)
 *   Campos relevantes: ID, Fecha_Ingreso, Sexo, Edad, Delegacion, 
 *   Probable_nombre, Tatuajes, etc.
 * 
 * NOTA: Este endpoint se usa en conjunto con specificDate.php para
 * alimentar el algoritmo de matching en CrossRef.jsx
 * 
 * @param string start_date - Fecha inicio en formato YYYY-MM-DD
 * @param string end_date - Fecha fin en formato YYYY-MM-DD
 * @return JSON { records: [...] } o { error: string }
 */

require_once __DIR__ . '/cors.php';

// ============================================================
// PASO 1: CONFIGURACIÓN Y AUTENTICACIÓN
// ============================================================
$config = require './config.php';

// Verificar API_KEY - misma validación que specificDate.php
if (!isset($_SERVER['HTTP_API_KEY']) || $_SERVER['HTTP_API_KEY'] !== $config['api_key']) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// ============================================================
// PASO 2: VALIDACIÓN DE PARÁMETROS
// ============================================================
$startDate = isset($_GET['start_date']) ? $_GET['start_date'] : null;
$endDate = isset($_GET['end_date']) ? $_GET['end_date'] : null;

if (!$startDate || !$endDate) {
    http_response_code(400);
    echo json_encode(['error' => 'Start date and end date are required']);
    exit;
}

// Validar formato de fecha (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || 
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid date format. Use YYYY-MM-DD']);
    exit;
}

try {
    // ============================================================
    // PASO 3: CONEXIÓN Y CONSULTA
    // ============================================================
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['user'],
        $config['password']
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Consultar registros forenses por Fecha_Ingreso
    // NOTA: Fecha_Ingreso es cuando el cuerpo ingresó al sistema forense,
    // no la fecha de defunción (que puede ser desconocida)
    $stmt = $pdo->prepare("
        SELECT * 
        FROM pfsi_v2_principal 
        WHERE Fecha_Ingreso BETWEEN :start_date AND :end_date
    ");
    $stmt->bindParam(':start_date', $startDate);
    $stmt->bindParam(':end_date', $endDate);
    $stmt->execute();
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ============================================================
    // PASO 4: RESPUESTA JSON
    // ============================================================
    echo json_encode(['records' => $records]);
    
} catch (PDOException $e) {
    error_log("sininden.php Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
}
?>