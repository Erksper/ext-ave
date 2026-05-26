<?php
namespace Espo\Modules\AVE\Services;

use Espo\Core\Exceptions\NotFound;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Record\Service as RecordService;
use Espo\Core\Record\CreateParams;
use Espo\ORM\Entity;

class AvePrincipal extends RecordService
{
    protected string $entityType = 'AvePrincipal';

    // ──────────────────────────────────────────────────────────────
    // Sobrescribir create para asignar número AVE secuencial
    // ──────────────────────────────────────────────────────────────
    public function create(\stdClass $data, CreateParams $params): Entity
    {
        if (empty($data->numeroAve)) {
            $data->numeroAve = $this->generateNextAveNumber();
        }
        return parent::create($data, $params);
    }

    protected function generateNextAveNumber(): string
    {
        try {
            $pdo = $this->entityManager->getPDO();
            $sql = "SELECT numero_ave FROM ave_principal WHERE numero_ave LIKE 'AVE-%' ORDER BY id DESC LIMIT 1";
            $stmt = $pdo->query($sql);
            $last = $stmt->fetchColumn();
            if ($last && preg_match('/AVE-(\d+)/', $last, $matches)) {
                $next = (int)$matches[1] + 1;
            } else {
                $next = 1;
            }
            return 'AVE-' . str_pad($next, 6, '0', STR_PAD_LEFT);
        } catch (\Exception $e) {
            return 'AVE-' . date('YmdHis');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Lista paginada
    // ──────────────────────────────────────────────────────────────
    public function getLista(
        int $pagina, int $porPagina,
        string $numero, string $cliente,
        string $identificacion, string $asesor,
        string $status = ''
    ): array {
        $GLOBALS['log']->info('=== getLista SIMPLIFICADO ===');
        
        $repo = $this->entityManager->getRDBRepository('AvePrincipal');
        
        // VERSIÓN SIMPLIFICADA - SIN FILTROS, SIN PAGINACIÓN
        // Solo obtener los primeros 100 registros
        $items = $repo->limit(0, 100)->find();
        
        $GLOBALS['log']->info('Registros encontrados (sin filtros): ' . $items->count());
        
        $list = [];
        foreach ($items as $item) {
            $list[] = [
                'id'                    => $item->getId(),
                'numeroAve'             => $item->get('numeroAve'),
                'nombreCliente'         => $item->get('nombreCliente'),
                'createdAt'             => $item->get('createdAt'),
            ];
        }
        
        return [
            'success' => true,
            'data' => [
                'list' => $list,
                'total' => count($list),
                'totalPaginas' => 1
            ]
        ];
    }

    public function cambiarStatus(string $aveId, string $status): array
    {
        $allowed = ['elaboracion', 'impresion', 'aprobado'];
        if (!in_array($status, $allowed)) {
            throw new BadRequest("Estado inválido: $status");
        }

        $em     = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $aveId);
        if (!$entity) throw new NotFound("AvePrincipal '$aveId' no encontrado.");

        $entity->set('status', $status);
        $em->saveEntity($entity);

        return ['success' => true, 'status' => $status];
    }

    public function generarPdf(string $aveId): void
    {
        $em     = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $aveId);
        if (!$entity) throw new NotFound("AvePrincipal '$aveId' no encontrado.");

        // Recolectar todos los datos (misma lógica que getOrCreate)
        $data = $this->getOrCreate($aveId);
        $ave      = $data['data']['ave'];
        $inmueble = $data['data']['inmueble'] ?? [];
        $referencias   = $data['data']['referencias']  ?? [];
        $analisis      = $data['data']['analisis']      ?? [];
        $factores      = $data['data']['factores']      ?? [];
        $decisiones    = $data['data']['decisiones']    ?? [];
        $canales       = $data['data']['canales']       ?? [];
        $planes        = $data['data']['planes']        ?? [];

        $html = $this->buildPdfHtml($ave, $inmueble, $referencias, $analisis, $factores, $decisiones, $canales, $planes);

        // Usar dompdf si está disponible, si no hacer output HTML imprimible
        $rootDir = dirname(__DIR__, 5);
        $dompdfPath = $rootDir . '/vendor/dompdf/dompdf/src/Dompdf.php';

        if (file_exists($dompdfPath)) {
            require_once $rootDir . '/vendor/autoload.php';
            $dompdf = new \Dompdf\Dompdf(['isRemoteEnabled' => true]);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();
            $filename = 'AVE-' . ($ave['numeroAve'] ?? $aveId) . '.pdf';
            $dompdf->stream($filename, ['Attachment' => true]);
        } else {
            // Fallback: HTML con estilos de impresión
            header('Content-Type: text/html; charset=UTF-8');
            header('Content-Disposition: inline; filename="AVE.html"');
            echo $html;
        }
        exit;
    }

    private function buildPdfHtml(array $ave, array $inmueble, array $referencias, array $analisis, array $factores, array $decisiones, array $canales, array $planes): string
    {
        $nombreCliente = htmlspecialchars($ave['nombreCliente'] ?? 'Cliente');
        $numeroAve     = htmlspecialchars($ave['numeroAve']     ?? 'N/A');
        $fecha         = date('d/m/Y');

        $refPromocion = array_filter($referencias, fn($r) => ($r['tipo'] ?? '') === 'promocion');
        $refVendidos  = array_filter($referencias, fn($r) => ($r['tipo'] ?? '') === 'vendido');
        $fortalezas   = array_filter($analisis,    fn($a) => ($a['tipo'] ?? '') === 'fortaleza');
        $debilidades  = array_filter($analisis,    fn($a) => ($a['tipo'] ?? '') === 'debilidad');

        $fmtUSD = fn($v) => $v ? '$ ' . number_format((float)$v, 2, '.', ',') : '-';
        $esc    = fn($t) => htmlspecialchars((string)($t ?? ''), ENT_QUOTES);

        $html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
        $html .= '<style>
            body { font-family: Arial, sans-serif; font-size: 13px; color: #363438; margin: 0; padding: 20px; }
            h1 { color: #B8A279; text-align: center; font-size: 20px; margin-bottom: 4px; }
            h2 { color: #555; text-align: center; font-size: 15px; margin: 0 0 20px; }
            h3 { color: #B8A279; font-size: 14px; margin: 20px 0 8px; border-bottom: 2px solid #B8A279; padding-bottom: 4px; }
            h4 { font-size: 13px; margin: 12px 0 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
            th { background: #B8A279; color: white; padding: 8px; text-align: left; }
            td { padding: 7px 8px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) td { background: #fafafa; }
            .intro { background: #f8f9fa; border-left: 4px solid #B8A279; padding: 14px 18px; margin-bottom: 20px; line-height: 1.6; text-align: justify; }
            .ref-num { color: #B8A279; font-weight: 700; }
            .precio-box { background: #B8A279; color: white; padding: 16px; border-radius: 6px; text-align: center; margin: 12px 0; }
            .precio-box strong { font-size: 20px; display: block; margin-bottom: 4px; }
            .foda-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .fortaleza-col { background: #d4edda; border-radius: 6px; padding: 12px; }
            .debilidad-col { background: #f8d7da; border-radius: 6px; padding: 12px; }
            .foda-item { margin-bottom: 8px; }
            .foda-item strong { display: block; font-size: 12px; }
            .foda-item span { font-size: 11px; color: #555; }
            .legal-si { color: #27ae60; font-weight: 700; }
            .legal-no { color: #e74c3c; }
            .badge-positivo { color: #27ae60; font-weight: 700; }
            .badge-negativo { color: #e74c3c; font-weight: 700; }
            .canal-chip { display: inline-block; background: #e0e0e0; padding: 3px 8px; border-radius: 12px; margin: 2px; font-size: 11px; }
            .footer { margin-top: 30px; border-top: 2px solid #B8A279; padding-top: 16px; text-align: center; color: #999; font-size: 11px; }
            @media print { body { padding: 0; } }
        </style></head><body>';

        // Título
        $html .= '<h1>ANÁLISIS PARA UNA VENTA EXITOSA</h1>';
        $html .= '<h2>' . $nombreCliente . '</h2>';

        // Intro
        $html .= '<div class="intro">Estimado(a) ' . $nombreCliente . ', reciba de todo el equipo que labora en nuestras oficinas un cordial saludo de respeto hacia usted por brindarnos su confianza. Le presentamos el siguiente Análisis de Venta Exitoso correspondiente a su propiedad; con el propósito de mostrarle referencias actuales del mercado inmobiliario que le ayuden a tomar la mejor decisión sobre el valor promocional de su inmueble y realizar un excelente negocio inmobiliario.</div>';
        $html .= '<p style="text-align:center;"><strong>Ref: ' . $numeroAve . '</strong></p>';

        // Foto del inmueble (si existe)
        if (!empty($inmueble['fotoId'])) {
            $html .= '<div style="text-align:center; margin:16px 0;">';
            $html .= '<img src="' . $esc($inmueble['fotoId']) . '" style="max-width:320px; max-height:220px; border-radius:8px; border:1px solid #ddd;">';
            $html .= '</div>';
        }

        // Ubicación
        $ubicacion = implode(', ', array_filter([
            $inmueble['urbanizacion'] ?? '',
            $inmueble['avenidaCalle'] ?? '',
            $inmueble['ciudad']       ?? '',
            $inmueble['estado']       ?? ''
        ]));
        $html .= '<h3>Ubicación</h3>';
        $html .= '<p>' . $esc($ubicacion) . '</p>';

        // Ficha del inmueble
        $html .= '<h3>Ficha del Inmueble</h3>';
        $html .= '<table><tr><th style="width:40%;">Campo</th><th>Valor</th></tr>';
        $ficha = [
            'Tipo de inmueble'    => ucfirst($inmueble['tipoPropiedad'] ?? '-') . ' - ' . ucfirst($inmueble['subtipoPropiedad'] ?? '-'),
            'Propietario'         => $inmueble['nombrePropietario'] ?? '-',
            'M² C / M² T'         => ($inmueble['areaConstruida'] ?? '0') . ' / ' . ($inmueble['areaTerreno'] ?? '0'),
            'Antigüedad (años)'   => $inmueble['antiguedad'] ?? '-',
            'Habitaciones / Baños'=> ($inmueble['numHabitaciones'] ?? '-') . ' / ' . ($inmueble['numBanos'] ?? '-'),
            'Estacionamiento'     => $inmueble['puestoEstacionamiento'] ?? '-',
            'Descripción'         => $inmueble['descripcion'] ?? '',
        ];
        foreach ($ficha as $label => $val) {
            if ($val) $html .= '<tr><td><strong>' . $esc($label) . '</strong></td><td>' . $esc($val) . '</td></tr>';
        }
        $html .= '</table>';

        // Helper para tabla de referencias
        $buildRefTable = function(array $refs, string $titulo) use ($esc, $fmtUSD): string {
            if (empty($refs)) return '';
            $refs = array_values($refs);
            $h  = '<h3>' . $titulo . '</h3>';
            $h .= '<div style="overflow-x:auto;"><table>';
            $h .= '<tr><th>Característica</th>';
            foreach ($refs as $i => $r) $h .= '<th>REF ' . ($i + 1) . '</th>';
            $h .= '</tr>';
            $rows = [
                'Tipo'              => fn($r) => $esc(($r['tipoPropiedad'] ?? '') . ' - ' . ($r['subtipoPropiedad'] ?? '')),
                'M² C / M² T'      => fn($r) => $esc(($r['areaConstruida'] ?? '0') . ' / ' . ($r['areaTerreno'] ?? '0')),
                'Antigüedad'        => fn($r) => $esc($r['antiguedad'] ?? '-'),
                'Hab / Baños'       => fn($r) => $esc(($r['habitaciones'] ?? '-') . ' / ' . ($r['banos'] ?? '-')),
                'Estacionamiento'   => fn($r) => $esc($r['estacionamiento'] ?? '-'),
                'Terraza'           => fn($r) => $esc($r['terraza'] ? 'Sí' : 'No'),
                'Valor (USD)'       => fn($r) => $fmtUSD($r['valorReferencial'] ?? null),
                'USD x M²'          => fn($r) => $fmtUSD($r['valorm2'] ?? null),
                'Acabados'          => fn($r) => $esc($r['acabados'] ?? '-'),
                'Enlace'            => fn($r) => $r['enlace'] ? '<a href="' . $esc($r['enlace']) . '">' . $esc($r['enlace']) . '</a>' : '-',
            ];
            foreach ($rows as $label => $fn) {
                $h .= '<tr><td><strong>' . $label . '</strong></td>';
                foreach ($refs as $r) $h .= '<td>' . $fn($r) . '</td>';
                $h .= '</tr>';
            }
            // Fotos
            $h .= '<tr><td><strong>Foto</strong></td>';
            foreach ($refs as $r) {
                $h .= '<td>';
                if (!empty($r['fotoId'])) {
                    $h .= '<img src="data:image/jpeg;base64,foto" style="max-width:60px; max-height:60px;">';
                } else {
                    $h .= '-';
                }
                $h .= '</td>';
            }
            $h .= '</tr>';
            $h .= '</table></div>';
            return $h;
        };

        $html .= $buildRefTable(array_values($refPromocion), '1. VALOR REFERENCIAL DE INMUEBLES EN PROMOCIÓN');
        $html .= $buildRefTable(array_values($refVendidos),  '2. VALOR REFERENCIAL DE INMUEBLES VENDIDOS');

        // FODA
        if (!empty($fortalezas) || !empty($debilidades)) {
            $html .= '<h3>3. ANÁLISIS DE FORTALEZAS Y DEBILIDADES</h3>';
            $html .= '<table><tr>';
            $html .= '<td style="width:50%; vertical-align:top; background:#d4edda; padding:12px; border-radius:6px;">';
            $html .= '<strong style="color:#155724;">Fortalezas</strong><br><br>';
            foreach ($fortalezas as $f) {
                $html .= '<div class="foda-item"><strong>' . $esc($f['tituloName'] ?? '') . '</strong>';
                $html .= '<span>' . $esc($f['descripcion'] ?? '') . '</span></div>';
            }
            $html .= '</td><td style="width:50%; vertical-align:top; background:#f8d7da; padding:12px; border-radius:6px; padding-left:20px;">';
            $html .= '<strong style="color:#721c24;">Debilidades</strong><br><br>';
            foreach ($debilidades as $d) {
                $html .= '<div class="foda-item"><strong>' . $esc($d['tituloName'] ?? '') . '</strong>';
                $html .= '<span>' . $esc($d['descripcion'] ?? '') . '</span></div>';
            }
            $html .= '</td></tr></table>';
        }

        // Situación Legal
        $html .= '<h3>Situación Legal</h3>';
        $html .= '<table>';
        $camposLegal = [
            'Cédula Catastral'    => ['bool' => 'cedulaCatastral',   'nota' => 'cedCatNota'],
            'Registro de Propiedad'=> ['bool' => 'registroPropiedad', 'nota' => 'regProNota'],
            'Solvencia Municipal'  => ['bool' => 'solvenciaMunicipal','nota' => 'solMunNota'],
            'Comentario Adicional' => ['bool' => 'comentarioLegal',   'nota' => 'comLegNota'],
        ];
        foreach ($camposLegal as $label => $campo) {
            $val  = !empty($ave[$campo['bool']]);
            $nota = $esc($ave[$campo['nota']] ?? '');
            $html .= '<tr><td><strong>' . $label . '</strong></td>';
            $html .= '<td class="' . ($val ? 'legal-si' : 'legal-no') . '">' . ($val ? 'Sí' : 'No') . '</td>';
            $html .= '<td>' . $nota . '</td></tr>';
        }
        $html .= '</table>';

        // Factores
        if (!empty($factores)) {
            $html .= '<h3>¿Qué influye en el precio actualmente?</h3><ul>';
            foreach ($factores as $f) {
                $icono = ($f['impacto'] ?? '') === 'positivo' ? '✅' : '❌';
                $html .= '<li>' . $icono . ' ' . $esc($f['name'] ?? '') . '</li>';
            }
            $html .= '</ul>';
        }

        // Análisis de precios
        $html .= '<h3>Análisis Integral</h3>';
        $html .= '<table>';
        $html .= '<tr><th>Síntesis</th><th>USD x m²</th><th>Precio (USD)</th></tr>';
        $html .= '<tr><td>Precio Promedio Máximo</td><td>' . $fmtUSD($ave['valorMax'] ?? null) . '</td><td>' . $fmtUSD($ave['precioMax'] ?? null) . '</td></tr>';
        $html .= '<tr><td>Precio Promedio Mínimo</td><td>' . $fmtUSD($ave['valorMin'] ?? null) . '</td><td>' . $fmtUSD($ave['precioMin'] ?? null) . '</td></tr>';
        $html .= '<tr><td>Promedio de salida al mercado</td><td>' . $fmtUSD($ave['valorPromedio'] ?? null) . '</td><td>' . $fmtUSD($ave['precioOriginal'] ?? null) . '</td></tr>';
        $html .= '</table>';
        $html .= '<div class="precio-box"><strong>Rango de Precio: ' . $fmtUSD($ave['precioMin'] ?? null) . ' — ' . $fmtUSD($ave['precioMax'] ?? null) . '</strong>';
        $html .= 'Ponderación: ' . ($ave['pesoOfertas'] ?? 70) . '% Ofertas / ' . ($ave['pesoVentas'] ?? 30) . '% Ventas</div>';

        // Decisiones
        if (!empty($decisiones)) {
            $html .= '<h3>4. OPCIONES DE DECISIÓN</h3>';
            foreach ($decisiones as $i => $d) {
                $html .= '<p><strong>' . ($i + 1) . '. ' . $esc($d['name'] ?? '') . '</strong></p>';
                if (!empty($d['descripcion'])) $html .= '<p style="margin-left:20px; color:#666;">' . $esc($d['descripcion']) . '</p>';
            }
        }

        // Plan y medios
        if (!empty($planes) || !empty($canales)) {
            $html .= '<h3>5. PLAN DE TRABAJO</h3>';
            foreach ($planes as $i => $p) {
                $html .= '<p><strong>' . ($i + 1) . '. ' . $esc($p['name'] ?? '') . '</strong></p>';
                if (!empty($p['descripcion'])) $html .= '<p style="margin-left:20px; color:#666;">' . $esc($p['descripcion']) . '</p>';
            }
            if (!empty($canales)) {
                $html .= '<h4>Medios publicitarios</h4><p>';
                foreach ($canales as $c) $html .= '<span class="canal-chip">' . $esc($c['name'] ?? '') . '</span> ';
                $html .= '</p>';
            }
        }

        // Footer
        $html .= '<div class="footer"><p>Nuestra mayor satisfacción es poner a su disposición la información necesaria y datos referenciales que le sirvan de apoyo para tomar la mejor decisión.</p>';
        $html .= '<p><strong>Saludos cordiales</strong><br>' . $fecha . '</p></div>';
        $html .= '</body></html>';

        return $html;
    }

    // ──────────────────────────────────────────────────────────────
    // Obtener datos completos del AVE
    // ──────────────────────────────────────────────────────────────
    public function getOrCreate(string $id): array
    {
        $em = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $id);
        if (!$entity) {
            throw new NotFound("AvePrincipal '$id' no encontrado.");
        }

        $inmueble = null;
        if ($entity->get('aveInmuebleId')) {
            $inm = $em->getEntity('AveInmueble', $entity->get('aveInmuebleId'));
            if ($inm) {
                $inmueble = $this->formatInmueble($inm);
            }
        }

        return [
            'success' => true,
            'data' => [
                'ave'         => $this->formatAvePrincipal($entity),
                'inmueble'    => $inmueble,
                'referencias' => $this->getReferencias($id),
                'analisis'    => $this->getAnalisisRespuestas($id),
                'factores'    => $this->getItemsRelacionados($id, 'factor'),
                'decisiones'  => $this->getItemsRelacionados($id, 'decision'),
                'canales'     => $this->getItemsRelacionados($id, 'canal'),
                'planes'      => $this->getItemsRelacionados($id, 'plan'),
            ],
        ];
    }

    // ──────────────────────────────────────────────────────────────
    // Guardar formulario completo
    // ──────────────────────────────────────────────────────────────
    public function guardarCompleto(\stdClass $data): array
    {
        $em = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $data->aveId);
        if (!$entity) {
            throw new NotFound("AvePrincipal '{$data->aveId}' no encontrado.");
        }

        // Pestaña 1 — Datos generales
        if (isset($data->datosGenerales)) {
            $dg = $data->datosGenerales;
            $this->setIfSet($entity, 'numeroAve', $dg->numeroAve ?? null);
            $this->setIfSet($entity, 'tipoIdentificacion', $dg->tipoIdentificacion ?? null);
            $this->setIfSet($entity, 'identificacionCliente', $dg->identificacionCliente ?? null);
            $this->setIfSet($entity, 'nombreCliente', $dg->nombreCliente ?? null);
            $this->setIfSet($entity, 'correoCliente', $dg->correoCliente ?? null);
            $this->setIfSet($entity, 'telefonoCliente', $dg->telefonoCliente ?? null);
        }

        // Pestaña 2 — Inmueble
        if (property_exists($data, 'aveInmuebleId')) {
            $entity->set('aveInmuebleId', $data->aveInmuebleId);
        }

        // Pestaña 3 — Legal
        if (isset($data->legal)) {
            $l = $data->legal;
            $this->setIfSet($entity, 'cedulaCatastral', isset($l->cedulaCatastral) ? (bool)$l->cedulaCatastral : null);
            $this->setIfSet($entity, 'cedCatNota', $l->cedCatNota ?? null);
            $this->setIfSet($entity, 'registroPropiedad', isset($l->registroPropiedad) ? (bool)$l->registroPropiedad : null);
            $this->setIfSet($entity, 'regProNota', $l->regProNota ?? null);
            $this->setIfSet($entity, 'solvenciaMunicipal', isset($l->solvenciaMunicipal) ? (bool)$l->solvenciaMunicipal : null);
            $this->setIfSet($entity, 'solMunNota', $l->solMunNota ?? null);
            $this->setIfSet($entity, 'comentarioLegal', isset($l->comentarioLegal) ? (bool)$l->comentarioLegal : null);
            $this->setIfSet($entity, 'comLegNota', $l->comLegNota ?? null);
        }

        // Guardar referencias (pestañas 4 y 5) - PRIMERO
        if (isset($data->referencias) && is_array($data->referencias)) {
            $this->guardarReferencias($data->aveId, $data->referencias);
        }

        // Guardar análisis FODA (pestaña 6)
        if (isset($data->analisis) && is_array($data->analisis)) {
            $this->guardarAnalisisRespuestas($data->aveId, $data->analisis);
        }

        // Guardar items relacionados (pestañas 7, 9, 10, 11)
        if (isset($data->factores)) {
            $this->guardarItemsRelacionados($data->aveId, $data->factores, 'factor');
        }
        if (isset($data->decisiones)) {
            $this->guardarItemsRelacionados($data->aveId, $data->decisiones, 'decision');
        }
        if (isset($data->canales)) {
            $this->guardarItemsRelacionados($data->aveId, $data->canales, 'canal');
        }
        if (isset($data->planes)) {
            $this->guardarItemsRelacionados($data->aveId, $data->planes, 'plan');
        }

        // Pestaña 8 — Precios (DESPUÉS de guardar referencias y items)
        // Guardar pesos desde el payload
        if (isset($data->precio)) {
            $p = $data->precio;
            $this->setIfSet($entity, 'valorMax',       isset($p->valorMax)       ? (float)$p->valorMax       : null);
            $this->setIfSet($entity, 'precioMax',      isset($p->precioMax)      ? (float)$p->precioMax      : null);
            $this->setIfSet($entity, 'valorMin',       isset($p->valorMin)       ? (float)$p->valorMin       : null);
            $this->setIfSet($entity, 'precioMin',      isset($p->precioMin)      ? (float)$p->precioMin      : null);
            $this->setIfSet($entity, 'valorPromedio',  isset($p->valorPromedio)  ? (float)$p->valorPromedio  : null);
            $this->setIfSet($entity, 'precioOriginal', isset($p->precioOriginal) ? (float)$p->precioOriginal : null);
            $this->setIfSet($entity, 'precioSugerido', isset($p->precioSugerido) ? (float)$p->precioSugerido : null);
            $this->setIfSet($entity, 'ajustePrecio',   isset($p->ajustePrecio)   ? (float)$p->ajustePrecio   : null);

            // pesoOfertas — guardar siempre que venga, aunque sea 0
            if (isset($p->pesoOfertas)) {
                $pesoOfertas = (float)$p->pesoOfertas;
                $pesoOfertas = max(0, min(100, $pesoOfertas)); // clamp 0-100
                $entity->set('pesoOfertas', $pesoOfertas);
                $entity->set('pesoVentas',  100 - $pesoOfertas);
            }
        }

        // Recalcular precios basados en referencias guardadas
        $this->recalcularPreciosParaEntity($entity);

        $em->saveEntity($entity);

        return ['success' => true, 'id' => $data->aveId];
    }

    // ──────────────────────────────────────────────────────────────
    // Recalcular precios basado en referencias
    // ──────────────────────────────────────────────────────────────
    public function recalcularPreciosParaEntity(Entity $entity): void
    {
        $em = $this->entityManager;
        $avePrincipalId = $entity->getId();
        
        // Obtener referencias activas
        $referencias = $em->getRDBRepository('AveInmuebleReferencia')
            ->where([
                'avePrincipalId' => $avePrincipalId,
                'usarCalculo' => true
            ])->find();
        
        $ofertas = [];
        $ventas = [];
        
        foreach ($referencias as $ref) {
            $precio = $ref->get('valorReferencial');
            $area = $ref->get('areaConstruida');
            $tipo = $ref->get('tipo');
            
            if ($precio && $area && $area > 0) {
                $precioM2 = $precio / $area;
                if ($tipo === 'promocion') {
                    $ofertas[] = $precioM2;
                } else {
                    $ventas[] = $precioM2;
                }
            }
        }
        
        // Calcular estadísticas
        $ofertaPromedio = !empty($ofertas) ? array_sum($ofertas) / count($ofertas) : 0;
        $ventaPromedio = !empty($ventas) ? array_sum($ventas) / count($ventas) : 0;
        $valorMaxM2 = !empty(array_merge($ofertas, $ventas)) ? max(array_merge($ofertas, $ventas)) : 0;
        $valorMinM2 = !empty(array_merge($ofertas, $ventas)) ? min(array_merge($ofertas, $ventas)) : 0;
        
        // Obtener pesos guardados o usar default
        $pesoOfertas = $entity->get('pesoOfertas') ?? 70;
        $pesoVentas = $entity->get('pesoVentas') ?? 30;
        
        // Calcular precio promedio ponderado
        $precioM2Promedio = 0;
        if ($ofertaPromedio > 0 || $ventaPromedio > 0) {
            $precioM2Promedio = ($ofertaPromedio * $pesoOfertas / 100) + ($ventaPromedio * $pesoVentas / 100);
        }
        
        // Obtener área del inmueble
        $areaInmueble = 0;
        if ($entity->get('aveInmuebleId')) {
            $inmueble = $em->getEntity('AveInmueble', $entity->get('aveInmuebleId'));
            if ($inmueble) {
                $areaInmueble = $inmueble->get('areaConstruida') ?? 0;
            }
        }
        
        $precioOriginal = $precioM2Promedio * $areaInmueble;
        $precioSugerido = $precioOriginal;
        
        // Ajuste de precio
        $ajuste = $entity->get('ajustePrecio') ?? 0;
        $rangoMin = $precioSugerido * (1 - $ajuste / 100);
        $rangoMax = $precioSugerido * (1 + $ajuste / 100);
        
        // Guardar valores
        $entity->set('valorMax', round($valorMaxM2, 2));
        $entity->set('valorMin', round($valorMinM2, 2));
        $entity->set('valorPromedio', round($precioM2Promedio, 2));
        $entity->set('precioMax', round($valorMaxM2 * $areaInmueble, 2));
        $entity->set('precioMin', round($valorMinM2 * $areaInmueble, 2));
        $entity->set('precioOriginal', round($precioOriginal, 2));
        $entity->set('precioSugerido', round($precioSugerido, 2));
        $entity->set('rangoPrecioMin', round($rangoMin, 2));
        $entity->set('rangoPrecioMax', round($rangoMax, 2));
    }

    // ──────────────────────────────────────────────────────────────
    // Items relacionados (factores, decisiones, canales, planes)
    // ──────────────────────────────────────────────────────────────
    private function guardarItemsRelacionados(string $avePrincipalId, array $items, string $tipo): void
    {
        $em = $this->entityManager;
        
        // Eliminar relaciones existentes para este tipo
        $existentes = $em->getRDBRepository('AvePrincipalItem')
            ->where([
                'avePrincipalId' => $avePrincipalId,
                'tipo' => $tipo
            ])->find();
        
        foreach ($existentes as $existente) {
            $em->removeEntity($existente);
        }
        
        // Crear nuevas relaciones
        foreach ($items as $item) {
            $itemId = is_object($item) ? $item->id : $item['id'];
            if (empty($itemId)) continue;
            
            $relacion = $em->getNewEntity('AvePrincipalItem');
            $relacion->set([
                'avePrincipalId' => $avePrincipalId,
                'itemId' => $itemId,
                'tipo' => $tipo
            ]);
            $em->saveEntity($relacion);
        }
    }

    private function getItemsRelacionados(string $avePrincipalId, string $tipo): array
    {
        $em = $this->entityManager;
        
        $relaciones = $em->getRDBRepository('AvePrincipalItem')
            ->where([
                'avePrincipalId' => $avePrincipalId,
                'tipo' => $tipo
            ])
            ->order('id', 'ASC')
            ->find();
        
        $result = [];
        foreach ($relaciones as $rel) {
            $item = $em->getEntity('AveFactoresDecisionesCanalesPlan', $rel->get('itemId'));
            if ($item) {
                $result[] = [
                    'id' => $item->getId(),
                    'name' => $item->get('name'),
                    'descripcion' => $item->get('descripcion'),
                    'impacto' => $item->get('impacto')
                ];
            }
        }
        return $result;
    }

    // ──────────────────────────────────────────────────────────────
    // Referencias
    // ──────────────────────────────────────────────────────────────
    private function guardarReferencias(string $avePrincipalId, array $referencias): void
    {
        $em = $this->entityManager;
        $existentes = $em->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])->find();

        $idsNuevos = array_filter(array_column($referencias, 'id'));
        foreach ($existentes as $ref) {
            if (!in_array($ref->getId(), $idsNuevos)) {
                $em->removeEntity($ref);
            }
        }

        // fotoId se maneja por separado (ver abajo)
        $campos = [
            'tipo','tipoPropiedad','usarCalculo','subtipoPropiedad','valorReferencial','areaTerreno',
            'areaConstruida','antiguedad','habitaciones','banos','estacionamiento','piso','ascensores',
            'terraza','acabados','seguridad','valorm2','descripcion','enlace'
            // ← fotoId removido del array genérico
        ];

        foreach ($referencias as $refData) {
            $refArr = (array) $refData;

            if (!empty($refArr['id'])) {
                $ref = $em->getEntity('AveInmuebleReferencia', $refArr['id']);
            } else {
                $ref = $em->getNewEntity('AveInmuebleReferencia');
                $ref->set('avePrincipalId', $avePrincipalId);
            }
            if (!$ref) continue;

            foreach ($campos as $campo) {
                if (array_key_exists($campo, $refArr)) {
                    $ref->set($campo, $refArr[$campo]);
                }
            }

            // Manejar fotoId explícitamente
            if (array_key_exists('fotoId', $refArr) && !empty($refArr['fotoId'])) {
                $ref->set('fotoId', $refArr['fotoId']);
                // En EspoCRM, los campos image tienen un campo virtual para el nombre
                // Intentar obtener el nombre del attachment para completar el campo foto
                $attachment = $em->getEntity('Attachment', $refArr['fotoId']);
                if ($attachment) {
                    $ref->set('foto', $refArr['fotoId']); // algunos campos image usan el ID directamente
                }
            } elseif (array_key_exists('fotoId', $refArr) && empty($refArr['fotoId'])) {
                // Si se envió fotoId vacío, limpiar la foto
                $ref->set('fotoId', null);
            }

            $em->saveEntity($ref);
        }
    }

    private function getReferencias(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('id', 'ASC')
            ->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = (array) $item->getValueMap();
        }
        return $result;
    }

    // ──────────────────────────────────────────────────────────────
    // Análisis FODA
    // ──────────────────────────────────────────────────────────────
    private function guardarAnalisis(string $avePrincipalId, array $analisis): void
    {
        $em = $this->entityManager;
        $existentes = $em->getRDBRepository('AveAnalisis')
            ->where(['avePrincipalId' => $avePrincipalId])->find();
        $idsNuevos = array_filter(array_column($analisis, 'id'));
        foreach ($existentes as $an) {
            if (!in_array($an->getId(), $idsNuevos)) {
                $em->removeEntity($an);
            }
        }
        foreach ($analisis as $anData) {
            $anArr = (array) $anData;
            if (!empty($anArr['id'])) {
                $an = $em->getEntity('AveAnalisis', $anArr['id']);
            } else {
                $an = $em->getNewEntity('AveAnalisis');
                $an->set('avePrincipalId', $avePrincipalId);
            }
            if (!$an) continue;
            if (array_key_exists('name', $anArr)) $an->set('name', $anArr['name']);
            if (array_key_exists('tipo', $anArr)) $an->set('tipo', $anArr['tipo']);
            if (array_key_exists('detalle', $anArr)) $an->set('detalle', $anArr['detalle']);
            $em->saveEntity($an);
        }
    }

    private function getAnalisis(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveAnalisis')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('tipo', 'ASC')
            ->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = (array) $item->getValueMap();
        }
        return $result;
    }

    // ──────────────────────────────────────────────────────────────
    // Inmuebles
    // ──────────────────────────────────────────────────────────────
    public function buscarInmuebles(string $q, ?string $teamId): array
    {
        $repo = $this->entityManager->getRDBRepository('AveInmueble');
        $where = [];
        if ($q) {
            $where[] = ['OR' => [
                ['nombrePropietario*' => '%' . $q . '%'],
                ['referencia*' => '%' . $q . '%'],
                ['ciudad*' => '%' . $q . '%'],
                ['urbanizacion*' => '%' . $q . '%'],
            ]];
        }
        $items = $repo->where($where)->limit(20)->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id' => $item->getId(),
                'nombrePropietario' => $item->get('nombrePropietario'),
                'referencia' => $item->get('referencia'),
                'tipoPropiedad' => $item->get('tipoPropiedad'),
                'subtipoPropiedad' => $item->get('subtipoPropiedad'),
                'ciudad' => $item->get('ciudad'),
                'urbanizacion' => $item->get('urbanizacion'),
                'estado' => $item->get('estado'),
                'areaConstruida' => $item->get('areaConstruida'),
                'areaTerreno' => $item->get('areaTerreno'),
                'numHabitaciones' => $item->get('numHabitaciones'),
                'numBanos' => $item->get('numBanos'),
                'estatus' => $item->get('estatus'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function getCatalogoAnalisis(?string $teamId): array
    {
        $repo  = $this->entityManager->getRDBRepository('AveAnalisis');
        $where = [
            'OR' => [
                ['predeterminado' => true],
                ['teamId'         => $teamId]
            ]
        ];
        $items  = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id'            => $item->getId(),
                'name'          => $item->get('name'),
                'predeterminado'=> $item->get('predeterminado'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    private function getAnalisisRespuestas(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveAnalisisRespuesta')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('id', 'ASC')
            ->find();

        $result = [];
        foreach ($items as $item) {
            // Cargar el título desde la entidad catálogo
            $titulo = $this->entityManager->getEntity('AveAnalisis', $item->get('aveAnalisisId'));
            $result[] = [
                'id'            => $item->getId(),
                'aveAnalisisId' => $item->get('aveAnalisisId'),
                'tituloName'    => $titulo ? $titulo->get('name') : '',
                'tipo'          => $item->get('tipo'),
                'descripcion'   => $item->get('descripcion'),
            ];
        }
        return $result;
    }

    private function guardarAnalisisRespuestas(string $avePrincipalId, array $respuestas): void
    {
        $em = $this->entityManager;

        // Borrar todas las respuestas previas del AVE
        $existentes = $em->getRDBRepository('AveAnalisisRespuesta')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->find();
        foreach ($existentes as $r) {
            $em->removeEntity($r);
        }

        // Insertar las nuevas
        foreach ($respuestas as $resp) {
            $arr = (array) $resp;
            if (empty($arr['aveAnalisisId']) || empty($arr['tipo']) || empty($arr['descripcion'])) {
                continue;
            }
            $entity = $em->getNewEntity('AveAnalisisRespuesta');
            $entity->set('avePrincipalId',  $avePrincipalId);
            $entity->set('aveAnalisisId',   $arr['aveAnalisisId']);
            $entity->set('tipo',            $arr['tipo']);
            $entity->set('descripcion',     $arr['descripcion']);
            $em->saveEntity($entity);
        }
    }

    public function crearAnalisisTitulo(\stdClass $data): array
    {
        $name = trim($data->name ?? $data->nombre ?? '');
        if (!$name) throw new BadRequest("El nombre es requerido.");

        $em     = $this->entityManager;
        $entity = $em->getNewEntity('AveAnalisis');
        $entity->set('name', $name);
        $entity->set('predeterminado', !empty($data->predeterminado));
        if (!empty($data->teamId)) {
            $entity->set('teamId', $data->teamId);
        }
        $em->saveEntity($entity);

        return [
            'success' => true,
            'data'    => [
                'id'   => $entity->getId(),
                'name' => $entity->get('name'),
            ],
        ];
    }

    public function crearInmueble(\stdClass $data): array
    {
        $em = $this->entityManager;
        $isEdit = !empty($data->id);
        $inm = $isEdit ? $em->getEntity('AveInmueble', $data->id) : $em->getNewEntity('AveInmueble');
        if (!$inm) {
            throw new BadRequest("Inmueble no encontrado para editar");
        }

        if (!$isEdit) {
            $inm->set('referencia', $this->generateNextPropNumber());
        }

        $campos = [
            'nombrePropietario', 'tipoPropiedad', 'subtipoPropiedad', 'estado', 'municipio', 'parroquia', 'ciudad',
            'avenidaCalle', 'edificioCasa', 'urbanizacion', 'areaConstruida', 'areaTerreno', 'antiguedad',
            'numHabitaciones', 'numBanos', 'puestoEstacionamiento', 'piso', 'ascensores', 'servicios',
            'terraza', 'seguridad', 'descripcion', 'fotoId'
        ];
        foreach ($campos as $campo) {
            if (property_exists($data, $campo) && $data->$campo !== null && $data->$campo !== '') {
                $inm->set($campo, $data->$campo);
            }
        }
        if (!empty($data->teamId)) {
            $inm->set('teamsIds', [$data->teamId]);
        }
        $em->saveEntity($inm);
        return ['success' => true, 'data' => $this->formatInmueble($inm)];
    }

    protected function generateNextPropNumber(): string
    {
        try {
            $pdo = $this->entityManager->getPDO();
            $sql = "SELECT referencia FROM ave_inmueble WHERE referencia LIKE 'Prop-%' ORDER BY id DESC LIMIT 1";
            $stmt = $pdo->query($sql);
            $last = $stmt->fetchColumn();
            if ($last && preg_match('/Prop-(\d+)/', $last, $matches)) {
                $next = (int)$matches[1] + 1;
            } else {
                $next = 1;
            }
            return 'Prop-' . str_pad($next, 6, '0', STR_PAD_LEFT);
        } catch (\Exception $e) {
            return 'Prop-' . date('YmdHis');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Factores / Decisiones / Canales / Planes (Catálogo)
    // ──────────────────────────────────────────────────────────────
    public function getFactoresPorTipo(string $tipo, ?string $teamId): array
    {
        $repo = $this->entityManager->getRDBRepository('AveFactoresDecisionesCanalesPlan');

        // Construir condición: predeterminados + los del team del usuario
        if ($teamId) {
            $where = [
                'type' => $tipo,
                'OR'   => [
                    ['predeterminado' => true],
                    ['teamId'         => $teamId]
                ]
            ];
        } else {
            // Sin team: solo predeterminados
            $where = [
                'tipo'          => $tipo,
                'predeterminado'=> true
            ];
        }

        $items  = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id'            => $item->getId(),
                'name'          => $item->get('name'),
                'descripcion'   => $item->get('descripcion'),
                'tipo'          => $item->get('tipo'),
                'impacto'       => $item->get('impacto'),
                'predeterminado'=> (bool)$item->get('predeterminado'),
                'teamId'        => $item->get('teamId'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function crearFactor(\stdClass $data): array
    {
        $name = $data->name ?? $data->nombre ?? null;
        $tipo = $data->tipo ?? null;
        if (!$name) {
            throw new BadRequest("El nombre es requerido.");
        }
        if (!$tipo) {
            throw new BadRequest("El tipo es requerido.");
        }
        $em = $this->entityManager;
        $entity = $em->getNewEntity('AveFactoresDecisionesCanalesPlan');
        $entity->set('name', trim($name));
        $entity->set('tipo', $tipo);
        $entity->set('descripcion', $data->descripcion ?? '');
        $entity->set('impacto', $data->impacto ?? null);
        $entity->set('predeterminado', !empty($data->predeterminado));
        if (!empty($data->teamId)) {
            $entity->set('teamId', $data->teamId);
        }
        $em->saveEntity($entity);
        return [
            'success' => true,
            'data' => [
                'id' => $entity->getId(),
                'name' => $entity->get('name'),
                'descripcion' => $entity->get('descripcion'),
                'tipo' => $entity->get('tipo'),
                'impacto' => $entity->get('impacto'),
                'predeterminado' => $entity->get('predeterminado'),
                'teamId' => $entity->get('teamId')
            ],
        ];
    }

    // ──────────────────────────────────────────────────────────────
    // Helpers privados
    // ──────────────────────────────────────────────────────────────
    private function setIfSet($entity, string $field, $value): void
    {
        if ($value !== null) {
            $entity->set($field, $value);
        }
    }

    private function formatAvePrincipal($entity): array
    {
        return [
            'id' => $entity->getId(),
            'numeroAve' => $entity->get('numeroAve'),
            'tipoIdentificacion' => $entity->get('tipoIdentificacion'),
            'identificacionCliente' => $entity->get('identificacionCliente'),
            'nombreCliente' => $entity->get('nombreCliente'),
            'correoCliente' => $entity->get('correoCliente'),
            'telefonoCliente' => $entity->get('telefonoCliente'),
            'aveInmuebleId' => $entity->get('aveInmuebleId'),
            'cedulaCatastral' => $entity->get('cedulaCatastral'),
            'cedCatNota' => $entity->get('cedCatNota'),
            'registroPropiedad' => $entity->get('registroPropiedad'),
            'regProNota' => $entity->get('regProNota'),
            'solvenciaMunicipal' => $entity->get('solvenciaMunicipal'),
            'solMunNota' => $entity->get('solMunNota'),
            'comentarioLegal' => $entity->get('comentarioLegal'),
            'comLegNota' => $entity->get('comLegNota'),
            'valorMax' => $entity->get('valorMax'),
            'precioMax' => $entity->get('precioMax'),
            'valorMin' => $entity->get('valorMin'),
            'precioMin' => $entity->get('precioMin'),
            'valorPromedio' => $entity->get('valorPromedio'),
            'precioOriginal' => $entity->get('precioOriginal'),
            'precioSugerido' => $entity->get('precioSugerido'),
            'ajustePrecio' => $entity->get('ajustePrecio'),
            'pesoOfertas' => $entity->get('pesoOfertas'),
            'pesoVentas' => $entity->get('pesoVentas'),
            'rangoPrecioMin' => $entity->get('rangoPrecioMin'),
            'rangoPrecioMax' => $entity->get('rangoPrecioMax'),
            'assignedUserId' => $entity->get('assignedUserId'),
            'assignedUserName' => $entity->get('assignedUserName'),
        ];
    }

    private function formatInmueble($entity): array
    {
        return [
            'id' => $entity->getId(),
            'referencia' => $entity->get('referencia'),
            'estatus' => $entity->get('estatus'),
            'nombrePropietario' => $entity->get('nombrePropietario'),
            'tipoPropiedad' => $entity->get('tipoPropiedad'),
            'subtipoPropiedad' => $entity->get('subtipoPropiedad'),
            'estado' => $entity->get('estado'),
            'municipio' => $entity->get('municipio'),
            'parroquia' => $entity->get('parroquia'),
            'ciudad' => $entity->get('ciudad'),
            'avenidaCalle' => $entity->get('avenidaCalle'),
            'edificioCasa' => $entity->get('edificioCasa'),
            'urbanizacion' => $entity->get('urbanizacion'),
            'areaConstruida' => $entity->get('areaConstruida'),
            'areaTerreno' => $entity->get('areaTerreno'),
            'antiguedad' => $entity->get('antiguedad'),
            'numHabitaciones' => $entity->get('numHabitaciones'),
            'numBanos' => $entity->get('numBanos'),
            'puestoEstacionamiento' => $entity->get('puestoEstacionamiento'),
            'piso' => $entity->get('piso'),
            'ascensores' => $entity->get('ascensores'),
            'servicios' => $entity->get('servicios'),
            'terraza' => $entity->get('terraza'),
            'seguridad' => $entity->get('seguridad'),
            'descripcion' => $entity->get('descripcion'),
            'fotoId' => $entity->get('fotoId'),
        ];
    }
}