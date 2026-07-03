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
    // Crear AVE: número secuencial + heredar teams del usuario
    // ──────────────────────────────────────────────────────────────

    public function create(\stdClass $data, CreateParams $params): Entity
    {
        // Generar número AVE
        if (empty($data->numeroAve)) {
            $data->numeroAve = $this->generateNextAveNumber();
        }
        
        // Eliminar assignedUserId del data temporalmente
        $tempUserId = null;
        if (property_exists($data, 'assignedUserId')) {
            $tempUserId = is_object($data->assignedUserId) ? $data->assignedUserId->id : $data->assignedUserId;
            unset($data->assignedUserId);
        }
        
        // Crear la entidad sin assigned user
        $entity = parent::create($data, $params);
        
        // Obtener el usuario que debe asignarse
        $userId = $tempUserId ?? $this->getUser()->getId();
        
        // Asignar el usuario manualmente usando el Entity Manager
        if ($entity) {
            // Actualizar directamente el campo assigned_user_id
            $this->entityManager->getPDO()->prepare("
                UPDATE ave_principal SET assigned_user_id = ? WHERE id = ?
            ")->execute([$userId, $entity->getId()]);
            
            // Recargar la entidad
            $entity = $this->entityManager->getEntity('AvePrincipal', $entity->getId());
            
            // Heredar los teams
            $this->heredarTeamsDeUsuario($entity, $userId);
        }
        
        return $entity;
    }

    /**
     * Copia los teams del usuario asignado al AVE.
     * Así el AVE queda vinculado a la oficina y CLA del asesor.
     */
    private function heredarTeamsDeUsuario(Entity $entity, string $userId): void
    {
        try {
            $em   = $this->entityManager;
            $user = $em->getEntityById('User', $userId);
            if (!$user) return;

            $teams   = $em->getRelation($user, 'teams')->find();
            $teamIds = [];
            foreach ($teams as $team) {
                $teamIds[] = $team->getId();
            }

            if (!empty($teamIds)) {
                $entity->set('teamsIds', $teamIds);
                $em->saveEntity($entity);
            }
        } catch (\Exception $e) {
            // Silently handle team inheritance errors
        }
    }

    protected function generateNextAveNumber(): string
    {
        try {
            $pdo  = $this->entityManager->getPDO();
            $stmt = $pdo->query("SELECT numero_ave FROM ave_principal WHERE numero_ave LIKE 'AVE-%' ORDER BY id DESC LIMIT 1");
            $last = $stmt->fetchColumn();
            if ($last && preg_match('/AVE-(\d+)/', $last, $m)) {
                $next = (int)$m[1] + 1;
            } else {
                $next = 1;
            }
            return 'AVE-' . str_pad($next, 6, '0', STR_PAD_LEFT);
        } catch (\Exception $e) {
            return 'AVE-' . date('YmdHis');
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Helpers: info de permisos de un usuario
    // ──────────────────────────────────────────────────────────────

    /**
     * Devuelve un array con los datos de rol/oficina de un usuario.
     */
    private function getUserInfoData(string $userId): array
    {
        $em = $this->entityManager;
        $user = $em->getEntityById('User', $userId);

        if (!$user) {
            return [
                'esCasaNacional' => false,
                'tieneRolesGestion' => false,
                'esAsesor' => true,
                'claUsuario' => null,
                'oficinaUsuario' => null,
            ];
        }

        $claUsuario = null;
        $oficinaUsuario = null;

        $teams = $em->getRelation($user, 'teams')->find();
        if ($teams) {
            foreach ($teams as $team) {
                $id = $team->getId();
                if (strpos($id, 'CLA') === 0) {
                    $claUsuario = $id;
                } else {
                    if (!$oficinaUsuario) {
                        $oficinaUsuario = $id;
                    }
                }
            }
        }

        if (!$oficinaUsuario) {
            $dtId = $user->get('defaultTeamId');
            if ($dtId && strpos($dtId, 'CLA') !== 0) {
                $oficinaUsuario = $dtId;
            }
        }

        $esCasaNacional = false;
        $esGerente = false;
        $esDirector = false;
        $esCoordinador = false;

        $roles = $em->getRelation($user, 'roles')->find();
        if ($roles) {
            foreach ($roles as $role) {
                $n = strtolower($role->get('name') ?? '');
                if (str_contains($n, 'casa nacional') || str_contains($n, 'casanacional')) {
                    $esCasaNacional = true;
                }
                if (!$esCasaNacional) {
                    if (str_contains($n, 'gerente')) $esGerente = true;
                    if (str_contains($n, 'director')) $esDirector = true;
                    if (str_contains($n, 'coordinador')) $esCoordinador = true;
                }
            }
        }

        $esAdminType = $user->get('type') === 'admin';
        $tienePoderCasaNacional = $esAdminType || $esCasaNacional;
        $tieneRolesGestion = !$tienePoderCasaNacional && ($esGerente || $esDirector || $esCoordinador);
        $esAsesor = $user->get('type') === 'regular' && !$tieneRolesGestion && !$tienePoderCasaNacional;

        return [
            'esCasaNacional' => $tienePoderCasaNacional,
            'tieneRolesGestion' => $tieneRolesGestion,
            'esAsesor' => $esAsesor,
            'claUsuario' => $claUsuario,
            'oficinaUsuario' => $oficinaUsuario,
        ];
    }

    /**
     * Devuelve los IDs de usuarios que pertenecen a una oficina (team).
     */
    private function getUsuariosByOficina(string $oficinaId): array
    {
        try {
            $pdo  = $this->entityManager->getPDO();
            $stmt = $pdo->prepare("
                SELECT DISTINCT u.id
                FROM entity_team et
                INNER JOIN `user` u ON et.entity_id = u.id
                WHERE et.team_id = :oficinaId
                AND et.entity_type = 'User'
                AND et.deleted = 0
                AND u.deleted = 0
                AND u.is_active = 1
            ");
            $stmt->execute(['oficinaId' => $oficinaId]);
            return $stmt->fetchAll(\PDO::FETCH_COLUMN);
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Devuelve los IDs de usuarios que pertenecen a un CLA.
     */
    private function getUsuariosByCLA(string $claId): array
    {
        try {
            $pdo  = $this->entityManager->getPDO();
            $stmt = $pdo->prepare("
                SELECT DISTINCT u.id
                FROM entity_team et
                INNER JOIN `user` u ON et.entity_id = u.id
                WHERE et.team_id = :claId
                AND et.entity_type = 'User'
                AND et.deleted = 0
                AND u.deleted = 0
                AND u.is_active = 1
            ");
            $stmt->execute(['claId' => $claId]);
            return $stmt->fetchAll(\PDO::FETCH_COLUMN);
        } catch (\Exception $e) {
            return [];
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Lista paginada con filtrado por rol
    // ──────────────────────────────────────────────────────────────

    public function getLista(
        int     $pagina,
        int     $porPagina,
        string  $asesor    = '',
        string  $status    = '',
        ?string $claId     = null,
        ?string $oficinaId = null,
        ?string $userId    = null
    ): array {

        $em     = $this->entityManager;
        $pdo    = $em->getPDO();
        $offset = ($pagina - 1) * $porPagina;

        // Construir WHERE - POR DEFECTO: mostrar todos los AVEs
        $whereConditions = ["ap.deleted = 0"];

        // Si hay filtros específicos, aplicarlos
        if (!empty($asesor)) {
            $whereConditions[] = "ap.assigned_user_id = '" . addslashes($asesor) . "'";
        }
        
        if (!empty($status)) {
            $whereConditions[] = "ap.status = '" . addslashes($status) . "'";
        }
        
        if (!empty($oficinaId)) {
            $stmtOfficeUsers = $pdo->prepare("
                SELECT DISTINCT u.id
                FROM team_user tu
                INNER JOIN `user` u ON tu.user_id = u.id
                WHERE tu.team_id = ? 
                AND tu.deleted = 0
                AND u.deleted = 0
                AND u.is_active = 1
            ");
            $stmtOfficeUsers->execute([$oficinaId]);
            $officeUserIds = $stmtOfficeUsers->fetchAll(\PDO::FETCH_COLUMN);
            
            if (!empty($officeUserIds)) {
                $idsStr = implode("','", array_map('addslashes', $officeUserIds));
                $whereConditions[] = "ap.assigned_user_id IN ('$idsStr')";
            }
        }
        
        if (!empty($claId)) {
            $stmtClaUsers = $pdo->prepare("
                SELECT DISTINCT u.id
                FROM team_user tu
                INNER JOIN `user` u ON tu.user_id = u.id
                WHERE tu.team_id = ? 
                AND tu.deleted = 0
                AND u.deleted = 0
                AND u.is_active = 1
            ");
            $stmtClaUsers->execute([$claId]);
            $claUserIds = $stmtClaUsers->fetchAll(\PDO::FETCH_COLUMN);
            
            if (!empty($claUserIds)) {
                $idsStr = implode("','", array_map('addslashes', $claUserIds));
                $whereConditions[] = "ap.assigned_user_id IN ('$idsStr')";
            }
        }

        // Construir y ejecutar consultas
        $where = implode(" AND ", $whereConditions);
        $limit = (int)$porPagina;
        $offsetInt = (int)$offset;
        
        $countSql = "SELECT COUNT(ap.id) AS total FROM ave_principal ap WHERE $where";
        $dataSql = "SELECT
                ap.id,
                ap.numero_ave,
                ap.nombre_cliente,
                ap.identificacion_cliente,
                ap.tipo_identificacion,
                ap.assigned_user_id,
                ap.created_at,
                ap.status,
                ap.ave_inmueble_id
            FROM ave_principal ap
            WHERE $where
            ORDER BY ap.created_at DESC
            LIMIT $limit OFFSET $offsetInt";
        
        try {
            // Ejecutar COUNT
            $stmtCount = $pdo->query($countSql);
            $totalRow = $stmtCount->fetch(\PDO::FETCH_ASSOC);
            $total = $totalRow ? (int)$totalRow['total'] : 0;
            
            if ($total === 0) {
                return [
                    'success' => true,
                    'data' => ['list' => [], 'total' => 0, 'totalPaginas' => 0]
                ];
            }
            
            // Ejecutar DATA
            $stmtData = $pdo->query($dataSql);
            $rows = $stmtData->fetchAll(\PDO::FETCH_ASSOC);

            // Obtener nombres de usuarios
            $userIds = array_unique(array_filter(array_column($rows, 'assigned_user_id')));
            $userNames = [];
            
            if (!empty($userIds)) {
                $idsStr = implode("','", array_map('addslashes', $userIds));
                $stmtUsers = $pdo->query("SELECT id, CONCAT(first_name, ' ', last_name) as full_name FROM `user` WHERE id IN ('$idsStr') AND deleted = 0");
                foreach ($stmtUsers->fetchAll(\PDO::FETCH_ASSOC) as $u) {
                    $userNames[$u['id']] = $u['full_name'] ?: $u['id'];
                }
            }

            // Armar lista final
            $list = [];
            foreach ($rows as $row) {
                $inmuebleData = [];
                if (!empty($row['ave_inmueble_id'])) {
                    $inm = $em->getEntity('AveInmueble', $row['ave_inmueble_id']);
                    if ($inm) {
                        $inmuebleData = [
                            'aveInmuebleName'         => $inm->get('nombrePropietario') ?? '-',
                            'aveInmuebleUrbanizacion' => $inm->get('urbanizacion'),
                            'aveInmuebleCiudad'       => $inm->get('ciudad'),
                            'aveInmuebleEstado'       => $inm->get('estado'),
                        ];
                    }
                }

                $list[] = array_merge([
                    'id'                    => $row['id'],
                    'numeroAve'             => $row['numero_ave'] ?? '-',
                    'nombreCliente'         => $row['nombre_cliente'] ?? '-',
                    'identificacionCliente' => $row['identificacion_cliente'] ?? '-',
                    'tipoIdentificacion'    => $row['tipo_identificacion'] ?? '',
                    'assignedUserName'      => $userNames[$row['assigned_user_id']] ?? '-',
                    'createdAt'             => $row['created_at'] ?? null,
                    'status'                => $row['status'] ?? 'elaboracion',
                ], $inmuebleData);
            }

            return [
                'success' => true,
                'data' => [
                    'list' => $list,
                    'total' => $total,
                    'totalPaginas' => (int) ceil($total / max($porPagina, 1)),
                ],
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Cambiar status
    // ──────────────────────────────────────────────────────────────

    public function cambiarStatus(string $aveId, string $status): array
    {
        $allowed = ['elaboracion', 'impresion'];
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

    // ──────────────────────────────────────────────────────────────
    // Generar PDF
    // ──────────────────────────────────────────────────────────────

    public function generarPdf(string $aveId): void
    {
        $em = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $aveId);
        if (!$entity) throw new NotFound("AvePrincipal '$aveId' no encontrado.");

        // Obtener los mismos datos que usa la vista previa
        $data = $this->getOrCreate($aveId);
        $ave = $data['data']['ave'];
        $inmueble = $data['data']['inmueble'] ?? [];
        $referencias = $data['data']['referencias'] ?? [];
        $analisis = $data['data']['analisis'] ?? [];
        $factoresAplicados = $data['data']['factoresAplicados'] ?? [];
        $decisiones = $data['data']['decisiones'] ?? [];
        $canales = $data['data']['canales'] ?? [];
        $planes = $data['data']['planes'] ?? [];

        // Calcular datos adicionales
        $totalImpactoFactores = 0;
        foreach ($factoresAplicados as $factor) {
            $totalImpactoFactores += ($factor['tipo'] ?? '') === 'positivo' ? 1 : -1;
        }

        $precioOriginal = $ave['precioOriginal'] ?? 0;
        $ajustePrecio = $ave['ajustePrecio'] ?? 0;
        $pesoOfertas = $ave['pesoOfertas'] ?? 50;
        $pesoVentas = 100 - $pesoOfertas;
        $precioConFactores = $precioOriginal * (1 + $totalImpactoFactores / 100);
        $rangoMin = round($precioOriginal * (1 - $ajustePrecio / 100));
        $rangoMax = round($precioOriginal * (1 + $ajustePrecio / 100));

        // Logo de la oficina
        $teamLogoUrl = null;
        $assignedUserId = $ave['assignedUserId'] ?? null;
        if ($assignedUserId) {
            $user = $em->getEntity('User', $assignedUserId);
            if ($user) {
                $teamIds = $user->get('teamsIds');
                if ($teamIds && is_array($teamIds)) {
                    $oficinaId = null;
                    foreach ($teamIds as $tid) {
                        if (strpos($tid, 'CLA') !== 0) {
                            $oficinaId = $tid;
                            break;
                        }
                    }
                    if ($oficinaId) {
                        $logoUser = $em->getRepository('User')
                            ->where(['userName' => $oficinaId, 'deleted' => 0])
                            ->findOne();
                        if ($logoUser && $logoUser->get('cImagenId')) {
                            $teamLogoUrl = $logoUser->get('cImagenId');
                        }
                    }
                }
            }
        }

        // Construir el HTML usando la misma estructura que preview.js
        $html = $this->buildPdfHtml($ave, $inmueble, $referencias, $analisis, $factoresAplicados, $decisiones, $canales, $planes, $totalImpactoFactores, $precioConFactores, $rangoMin, $rangoMax, $pesoOfertas, $pesoVentas, $ajustePrecio, $teamLogoUrl);

        // Generar PDF
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
            header('Content-Type: text/html; charset=UTF-8');
            header('Content-Disposition: inline; filename="AVE.html"');
            echo $html;
        }
        exit;
    }

    private function buildPdfHtml($ave, $inmueble, $referencias, $analisis, $factoresAplicados, $decisiones, $canales, $planes, $totalImpactoFactores, $precioConFactores, $rangoMin, $rangoMax, $pesoOfertas, $pesoVentas, $ajustePrecio, $teamLogoUrl): string
    {
        $refPromocion = array_filter($referencias, fn($r) => ($r['tipo'] ?? '') === 'promocion');
        $refVendidos = array_filter($referencias, fn($r) => ($r['tipo'] ?? '') === 'vendido');
        $fortalezas = array_filter($analisis, fn($a) => ($a['tipo'] ?? '') === 'fortaleza');
        $debilidades = array_filter($analisis, fn($a) => ($a['tipo'] ?? '') === 'debilidad');

        $fmtUSD = fn($v) => $v ? '$ ' . number_format((float)$v, 0, ',', '.') : '-';
        $fmtUSDD = fn($v) => $v ? '$ ' . number_format((float)$v, 2, ',', '.') : '-';
        $esc = fn($t) => htmlspecialchars((string)($t ?? ''), ENT_QUOTES, 'UTF-8');

        $getImageDataUri = function($imageId) {
            if (!$imageId) return null;
            $attachment = $this->entityManager->getEntity('Attachment', $imageId);
            if (!$attachment) return null;
            $filePath = 'data/upload/' . $imageId;
            if (!file_exists($filePath)) return null;
            $mime = $attachment->get('type') ?: 'image/jpeg';
            return 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($filePath));
        };

        $formatTipo = function($tipo) {
            $map = [
                'departamento' => 'Departamento',
                'casa' => 'Casa',
                'comercial' => 'Comercial',
                'industrial' => 'Industrial',
                'vacacional' => 'Vacacional',
                'terreno' => 'Terreno'
            ];
            return $map[$tipo] ?? $tipo ?? '-';
        };

        $formatSubtipo = function($subtipo) {
            if (!$subtipo) return '-';
            $map = [
                'apartamento' => 'Apartamento',
                'casa' => 'Casa',
                'town-house' => 'Town-House',
                'terreno' => 'Terreno',
                'edificio' => 'Edificio',
                'oficinas' => 'Oficinas',
                'local' => 'Local',
                'penthouse' => 'Penthouse',
                'galpon' => 'Galpón',
                'quinta' => 'Quinta'
            ];
            return $map[$subtipo] ?? ucfirst(str_replace('-', ' ', $subtipo));
        };

        $fechaActual = date('d/m/Y');
        $horaActual = date('H:i');

        $html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">';
        $html .= '<style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #363438; margin: 0; padding: 20px; }
            h1 { color: #B8A279; text-align: center; font-size: 20px; margin-bottom: 4px; }
            h2 { color: #555; text-align: center; font-size: 15px; margin: 0 0 20px; }
            h3 { color: #B8A279; font-size: 14px; margin: 20px 0 8px; border-bottom: 2px solid #B8A279; padding-bottom: 4px; }
            h4 { font-size: 13px; margin: 12px 0 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
            th { background: #B8A279; color: white; padding: 8px; text-align: left; }
            td { padding: 7px 8px; border-bottom: 1px solid #eee; }
            .intro { background: #f8f9fa; border-left: 4px solid #B8A279; padding: 14px 18px; margin-bottom: 20px; line-height: 1.6; text-align: justify; }
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
            .impacto-box { background: #f0f0f0; border-left: 4px solid #B8A279; padding: 12px; margin-top: 16px; text-align: center; font-weight: bold; }
            .impacto-positivo { color: #27ae60; }
            .impacto-negativo { color: #e74c3c; }
            .ref-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
            .ref-table th, .ref-table td { border: 1px solid #ddd; padding: 6px; text-align: left; word-break: break-word; overflow-wrap: break-word; max-width: 150px; }
            .ref-table th { background: #B8A279; color: white; }
            .foto-thumb { max-width: 50px; max-height: 50px; border-radius: 4px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #B8A279; padding-bottom: 15px; }
            .logo { width: 150px; text-align: left; }
            .logo img { max-height: 80px; max-width: 150px; object-fit: contain; }
            .titulo { flex: 1; text-align: center; }
            .cliente { width: 150px; text-align: right; }
            .ubicacion-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .ficha-inmueble { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
            .ficha-inmueble table { margin-bottom: 0; }
            .foto-inmueble { width: 130px; text-align: center; vertical-align: middle; }
            .foto-inmueble img { max-width: 130px; max-height: 130px; border-radius: 8px; border: 1px solid #ddd; }
            .frase-dorada { background: linear-gradient(135deg, #F5E6CA 0%, #E8D5B0 100%); border-left: 6px solid #B8A279; border-radius: 8px; padding: 16px 24px; margin: 24px 0; text-align: center; color: #8B6914; font-size: 16px; font-weight: 600; }
        </style></head><body>';

        // Header
        $html .= '<div class="header">';
        $html .= '<div class="logo">';
        $logoDataUri = $teamLogoUrl ? $getImageDataUri($teamLogoUrl) : null;
        if ($logoDataUri) {
            $html .= '<img src="' . $logoDataUri . '">';
        } else {
            $html .= '<div style="width: 80px; height: 80px; background: #B8A279; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 40px;">🏢</div>';
        }
        $html .= '</div>';
        $html .= '<div class="titulo">';
        $html .= '<h1 style="margin: 0;">ANÁLISIS PARA UNA VENTA EXITOSA</h1>';
        $html .= '<p style="margin: 5px 0 0; font-size: 12px; color: #666;">Ref: ' . $esc($ave['numeroAve'] ?? 'N/A') . '</p>';
        $html .= '</div>';
        $html .= '<div class="cliente">';
        $html .= '<div style="font-weight: 700; font-size: 12px; color: #B8A279;">Cliente:</div>';
        $html .= '<div style="font-size: 11px;">' . $esc($ave['nombreCliente'] ?? 'Cliente') . '</div>';
        $html .= '</div>';
        $html .= '</div>';

        // Introducción
        $html .= '<div class="intro">Estimado(a) ' . $esc($ave['nombreCliente'] ?? 'Cliente') . ', Reciba de todo el equipo que labora en nuestras oficinas un cordial saludo de respeto hacia usted por brindarnos su confianza. Le presentamos el siguiente Análisis de Venta Exitoso correspondiente a su propiedad; con el propósito de mostrarle referencias actuales del mercado inmobiliario que le ayuden a tomar la mejor decisión sobre el valor promocional de su inmueble y realizar un excelente negocio inmobiliario.</div>';

        // Ubicación
        $ubicacion = implode(', ', array_filter([$inmueble['urbanizacion'] ?? '', $inmueble['avenidaCalle'] ?? '', $inmueble['ciudad'] ?? '', $inmueble['estado'] ?? '']));
        $html .= '<div class="ubicacion-box">';
        $html .= '<h3 style="margin-top: 0;"><i class="fas fa-map-marker-alt"></i> Ubicación</h3>';
        $html .= '<p><strong>' . $esc($ubicacion ?: 'No especificada') . '</strong></p>';
        $html .= '</div>';

        // Ficha del Inmueble
        $html .= '<div class="ficha-inmueble">';
        $html .= '<h3 style="margin-top: 0;"><i class="fas fa-building"></i> Ficha del Inmueble</h3>';
        $html .= '<table>';
        $html .= '<tr>';
        $html .= '<td style="width: 30%;"><strong>Tipo de inmueble</strong></td>';
        $html .= '<td>' . $esc($formatTipo($inmueble['tipoPropiedad'] ?? '')) . ' - ' . $esc($formatSubtipo($inmueble['subtipoPropiedad'] ?? '')) . '</td>';
        $html .= '<td rowspan="6" class="foto-inmueble">';
        if (!empty($inmueble['fotoId'])) {
            $imgUrl = $getImageDataUri($inmueble['fotoId']);
            $html .= $imgUrl ? '<img src="' . $imgUrl . '" ...>' : '';
        } else {
            $html .= '<div style="width: 130px; height: 100px; background: #f0f0f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999;"><i class="fas fa-image" style="font-size: 30px;"></i></div>';
        }
        $html .= '</td>';
        $html .= '</tr>';
        $html .= '<tr><td><strong>Propietario</strong></td><td>' . $esc($inmueble['nombrePropietario'] ?? '-') . '</td></tr>';
        $html .= '<tr><td><strong>M² C / M² T</strong></td><td>' . ($inmueble['areaConstruida'] ?? '0') . ' / ' . ($inmueble['areaTerreno'] ?? '0') . '</td></tr>';
        $html .= '<tr><td><strong>Antigüedad (años)</strong></td><td>' . ($inmueble['antiguedad'] ?? '-') . '</td></tr>';
        $html .= '<tr><td><strong>Habitaciones / Baños</strong></td><td>' . ($inmueble['numHabitaciones'] ?? '-') . ' / ' . ($inmueble['numBanos'] ?? '-') . '</td></tr>';
        $html .= '<tr><td><strong>Estacionamiento</strong></td><td>' . ($inmueble['puestoEstacionamiento'] ?? '-') . '</td></tr>';
        if (!empty($inmueble['descripcion'])) {
            $html .= '<tr><td><strong>Descripción</strong></td><td colspan="2">' . $esc($inmueble['descripcion']) . '</td></tr>';
        }
        $html .= '</table>';
        $html .= '</div>';

        // Tabla de referencias
        $buildRefTable = function($refs, $titulo) use ($esc, $fmtUSD, $formatTipo, $formatSubtipo, $getImageDataUri) {
            if (empty($refs)) return '';
            $refs = array_values($refs);
            $h = '<h3>' . $titulo . '</h3><div><table class="ref-table"><thead><tr><th>Característica</th>';
            foreach ($refs as $i => $r) { $h .= '<th>REF ' . ($i + 1) . '</th>'; }
            $h .= '</tr></thead><tbody>';
            
            $rowDefs = [
                'Tipo' => fn($r) => $esc($formatTipo($r['tipoPropiedad'] ?? '') . ' - ' . $formatSubtipo($r['subtipoPropiedad'] ?? '')),
                'M² C / M² T' => fn($r) => $esc(($r['areaConstruida'] ?? '0') . ' / ' . ($r['areaTerreno'] ?? '0')),
                'Antigüedad' => fn($r) => $esc($r['antiguedad'] ?? '-'),
                'Hab / Baños' => fn($r) => $esc(($r['habitaciones'] ?? '-') . ' / ' . ($r['banos'] ?? '-')),
                'Estacionamiento' => fn($r) => $esc($r['estacionamiento'] ?? '-'),
                'Terraza' => fn($r) => $esc($r['terraza'] ? 'Sí' : 'No'),
                'Valor (USD)' => fn($r) => $fmtUSD($r['valorReferencial'] ?? null),
                'USD x M²' => fn($r) => $fmtUSD($r['valorm2'] ?? null),
                'Acabados' => fn($r) => $esc($r['acabados'] ?? '-'),
            ];
            
            foreach ($rowDefs as $label => $fn) {
                $h .= '<tr>';
                $h .= '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>' . $label . '</strong></td>';
                foreach ($refs as $r) { $h .= '<td style="padding: 8px; border: 1px solid #ddd;">' . $fn($r) . '</td>'; }
                $h .= '</tr>';
            }
            
            // Fila de enlaces - mostrar URL completa
            $h .= '<tr>';
            $h .= '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Enlace</strong></td>';
            foreach ($refs as $r) { 
                $enlace = $r['enlace'] ?? '';
                if ($enlace) {
                    $enlaceCorto = strlen($enlace) > 60 ? substr($enlace, 0, 57) . '...' : $enlace;
                    $h .= '<td style="padding: 8px; border: 1px solid #ddd; word-break: break-all; font-size: 9px;">';
                    $h .= '<a href="' . $esc($enlace) . '">' . $esc($enlaceCorto) . '</a>';
                    $h .= '</td>';
                } else {
                    $h .= '<td style="padding: 8px; border: 1px solid #ddd;">-</td>';
                }
            }
            $h .= '</tr>';
            
            // Fila de fotos
            $h .= '<tr>';
            $h .= '<td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Foto</strong></td>';
            foreach ($refs as $r) { 
                $fid = $r['fotoId'] ?? ''; 
                $dataUri = $fid ? $getImageDataUri($fid) : null;
                $h .= '<td style="padding: 8px; border: 1px solid #ddd; text-align: center;">' . ($dataUri ? '<img src="' . $dataUri . '" style="max-width: 50px; max-height: 50px; border-radius: 4px;">' : '-') . '</td>';
            }
            $h .= '</tr>';
            
            $h .= '</tbody></table></div>';
            return $h;
        };

        $html .= $buildRefTable(array_values($refPromocion), '1. VALOR REFERENCIAL DE INMUEBLES EN PROMOCIÓN');
        $html .= $buildRefTable(array_values($refVendidos), '2. VALOR REFERENCIAL DE INMUEBLES VENDIDOS');

        // FODA
        if (!empty($fortalezas) || !empty($debilidades)) {
            $html .= '<h3>3. ANÁLISIS DE FORTALEZAS Y DEBILIDADES</h3><div class="foda-grid">';
            $html .= '<div class="fortaleza-col"><h4 style="color:#155724; margin-top:0;">✓ Fortalezas</h4>';
            foreach ($fortalezas as $f) { $html .= '<div class="foda-item"><strong>' . $esc($f['tituloName'] ?? '') . '</strong>' . (!empty($f['descripcion']) ? '<br><span>' . $esc($f['descripcion']) . '</span>' : '') . '</div>'; }
            $html .= '</div><div class="debilidad-col"><h4 style="color:#721c24; margin-top:0;">✗ Debilidades</h4>';
            foreach ($debilidades as $d) { $html .= '<div class="foda-item"><strong>' . $esc($d['tituloName'] ?? '') . '</strong>' . (!empty($d['descripcion']) ? '<br><span>' . $esc($d['descripcion']) . '</span>' : '') . '</div>'; }
            $html .= '</div></div>';
        }

        // Factores
        if (!empty($factoresAplicados)) {
            $html .= '<h3>4. FACTORES QUE INFLUYEN EN EL PRECIO</h3><table class="ref-table"><thead><tr><th>Factor</th><th style="width:120px; text-align:center;">Impacto</th><th style="width:100px; text-align:center;">% Afectación</th></tr></thead><tbody>';
            foreach ($factoresAplicados as $factor) {
                $esPos = ($factor['tipo'] ?? '') === 'positivo';
                $clase = $esPos ? 'impacto-positivo' : 'impacto-negativo';
                $html .= '<tr>';
                $html .= '<td style="padding: 8px; border: 1px solid #ddd;">' . $esc($factor['name'] ?? '') . '</td>';
                $html .= '<td style="padding: 8px; border: 1px solid #ddd; text-align: center;" class="' . $clase . '">' . ($esPos ? '✓ Positivo' : '✗ Negativo') . '</td>';
                $html .= '<td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;" class="' . $clase . '">' . ($esPos ? '+1%' : '-1%') . '</td>';
                $html .= '</tr>';
            }
            $html .= '</tbody></table>';
            $signo = $totalImpactoFactores >= 0 ? '+' : '';
            $clase = $totalImpactoFactores >= 0 ? 'impacto-positivo' : 'impacto-negativo';
            $html .= '<div class="impacto-box"><strong>📊 Total de afectación:</strong> <span class="' . $clase . '">' . $signo . $totalImpactoFactores . '%</span><br><small>El precio puede verse afectado en un <strong>' . $signo . abs($totalImpactoFactores) . '%</strong></small></div>';
        }

        // Situación Legal
        $html .= '<h3>5. Situación Legal</h3><table>';
        $camposLegal = [
            'Cédula Catastral' => ['bool' => 'cedulaCatastral', 'nota' => 'cedCatNota'],
            'Registro de Propiedad' => ['bool' => 'registroPropiedad', 'nota' => 'regProNota'],
            'Solvencia Municipal' => ['bool' => 'solvenciaMunicipal', 'nota' => 'solMunNota'],
            'Comentario Adicional' => ['bool' => 'comentarioLegal', 'nota' => 'comLegNota'],
        ];
        foreach ($camposLegal as $label => $campo) {
            $val = !empty($ave[$campo['bool']]);
            $nota = $esc($ave[$campo['nota']] ?? '');
            $html .= '<tr><td style="width:30%;"><strong>' . $label . '</strong></td><td style="width:15%;" class="' . ($val ? 'legal-si' : 'legal-no') . '">' . ($val ? 'Sí' : 'No') . '</td><td>' . $nota . '</td></tr>';
        }
        $html .= '</table>';

        // Frase dorada
        $html .= '<div class="frase-dorada">"De acuerdo a la información suministrada, ¿qué precio de salida al mercado le pondría usted a su propiedad?"</div>';

        // Análisis Integral
        $html .= '<h3>6. Análisis Integral</h3><table>';
        $html .= '<tr style="background:#f5f5f5;"><td><strong>Síntesis de precio unitario Mts2</strong></td><td><strong>USD x m²</strong></td><td><strong>Precio (USD)</strong></td></tr>';
        $html .= '<tr><td>Precio Promedio Máximo</td><td>' . $fmtUSDD($ave['valorMax'] ?? 0) . '</td><td>' . $fmtUSD($ave['precioMax'] ?? 0) . '</td></tr>';
        $html .= '<tr><td>Precio Promedio Mínimo</td><td>' . $fmtUSDD($ave['valorMin'] ?? 0) . '</td><td>' . $fmtUSD($ave['precioMin'] ?? 0) . '</td></tr>';
        $html .= '<tr><td>Promedio de salida al mercado</td><td>' . $fmtUSDD($ave['valorPromedio'] ?? 0) . '</td><td>' . $fmtUSD($ave['precioOriginal'] ?? 0) . '</td></tr>';
        $html .= '</table>';

        $html .= '<div class="precio-box">';
        $html .= '<strong>Rango de Precio: ' . $fmtUSD($rangoMin) . ' — ' . $fmtUSD($rangoMax) . '</strong>';
        $html .= '<br>Precio Sugerido: ' . $fmtUSD($ave['precioOriginal'] ?? 0) . ' (Ajuste: ' . $ajustePrecio . '%)';
        $html .= '<br>Ponderación: ' . $pesoOfertas . '% Ofertas / ' . $pesoVentas . '% Ventas';
        if ($totalImpactoFactores != 0) {
            $s = $totalImpactoFactores >= 0 ? '+' : '';
            $html .= '<br>Ajuste por factores: ' . $s . $totalImpactoFactores . '% → Precio con factores: ' . $fmtUSD($precioConFactores);
        }
        $html .= '</div>';

        // Decisiones
        if (!empty($decisiones)) {
            $html .= '<h3>7. OPCIONES DE DECISIÓN</h3>';
            foreach ($decisiones as $i => $d) {
                $html .= '<p><strong>' . ($i + 1) . '. ' . $esc($d['name'] ?? '') . '</strong></p>';
                if (!empty($d['descripcion'])) $html .= '<p style="margin-left:20px; color:#666;">' . $esc($d['descripcion']) . '</p>';
            }
        }

        // Plan de Trabajo
        if (!empty($planes) || !empty($canales)) {
            $html .= '<h3>8. PLAN DE TRABAJO</h3>';
            foreach ($planes as $i => $p) {
                $html .= '<p><strong>' . ($i + 1) . '. ' . $esc($p['name'] ?? '') . '</strong></p>';
                if (!empty($p['descripcion'])) $html .= '<p style="margin-left:20px; color:#666;">' . $esc($p['descripcion']) . '</p>';
            }
            if (!empty($canales)) {
                $html .= '<h4>Medios publicitarios</h4><p>';
                foreach ($canales as $c) { $html .= '<span class="canal-chip">' . $esc($c['name'] ?? '') . '</span> '; }
                $html .= '</p>';
            }
        }

        // Footer
        $html .= '<div class="footer">';
        $html .= '<p>Sr(a) ' . $esc($ave['nombreCliente'] ?? 'Cliente') . ', nuestra mayor satisfacción es poner a su disposición la información necesaria y datos referenciales que le sirvan de apoyo para tomar la mejor decisión en la venta de su inmueble y poder contribuir en el bienestar de su familia, siempre a sus órdenes para brindarle el mejor servicio inmobiliario.</p>';
        $html .= '<hr style="margin: 15px auto; width: 50%; border-color: #ddd;">';
        $html .= '<p><strong>Saludos cordiales,</strong></p>';

        // Tabla asesor: foto circular + nombre
        $html .= '<table style="margin: 0 auto; border-collapse: collapse;"><tr style="vertical-align: middle;">';
        $asesorImageId = $ave['assignedUserImageId'] ?? null;
        $asesorDataUri = $asesorImageId ? $getImageDataUri($asesorImageId) : null;
        if ($asesorDataUri) {
            $html .= '<td style="padding-right: 15px;">';
            $html .= '<img src="' . $asesorDataUri . '" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #B8A279;">';
            $html .= '</td>';
        } else {
            $html .= '<td style="padding-right: 15px;">';
            $html .= '<div style="width: 60px; height: 60px; border-radius: 50%; background: #B8A279; text-align: center; line-height: 60px; color: white; font-size: 28px;">&#128100;</div>';
            $html .= '</td>';
        }
        $html .= '<td style="text-align: left;">';
        $html .= '<p style="margin: 0; font-weight: bold; font-size: 15px;">' . $esc($ave['assignedUserName'] ?? 'Asesor') . '</p>';
        $html .= '<p style="margin: 3px 0 0; font-size: 12px; color: #666;">Asesor Inmobiliario</p>';
        if (!empty($ave['teamName'])) {
            $html .= '<p style="margin: 3px 0 0; font-size: 12px; color: #666;">&#127962; ' . $esc($ave['teamName']) . '</p>';
        }
        $html .= '</td>';
        $html .= '</tr></table>';

        $html .= '<p style="margin-top: 15px; font-size: 10px; color: #999;">Fecha de emisión: ' . $fechaActual . ' ' . $horaActual . '</p>';
        $html .= '</div>';

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
        if (!$entity) throw new NotFound("AvePrincipal '$id' no encontrado.");

        // Obtener inmueble
        $inmueble = null;
        if ($entity->get('aveInmuebleId')) {
            $inm = $em->getEntity('AveInmueble', $entity->get('aveInmuebleId'));
            if ($inm) $inmueble = $this->formatInmueble($inm);
        }

        // Obtener imagen del usuario asignado
        $userImageId = null;
        if ($entity->get('assignedUserId')) {
            $assignedUser = $em->getEntity('User', $entity->get('assignedUserId'));
            if ($assignedUser) $userImageId = $assignedUser->get('cImagenId');
        }

        // Obtener team
        $teamId = null;
        $teamName = null;
        $teamIds = $entity->get('teamsIds');
        if ($teamIds && is_array($teamIds) && count($teamIds) > 0) {
            $teamId = $teamIds[0];
            $team = $em->getEntity('Team', $teamId);
            if ($team) $teamName = $team->get('name');
        }

        // Formatear datos del AVE
        $aveData = [
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
            'totalImpactoFactores' => $entity->get('totalImpactoFactores'),
            'assignedUserImageId' => $userImageId,
            'teamId' => $teamId,
            'teamName' => $teamName,
        ];

        return [
            'success' => true,
            'data' => [
                'ave' => $aveData,
                'inmueble' => $inmueble,
                'referencias' => $this->getReferencias($id),
                'analisis' => $this->getAnalisisRespuestas($id),
                'factoresAplicados' => $this->getFactoresAplicados($id),
                'decisiones' => $this->getItemsRelacionados($id, 'decision'),
                'canales' => $this->getItemsRelacionados($id, 'canal'),
                'planes' => $this->getItemsRelacionados($id, 'plan'),
            ],
        ];
    }

    // ──────────────────────────────────────────────────────────────
    // Factores Aplicados
    // ──────────────────────────────────────────────────────────────

    private function getFactoresAplicados(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveFactorAplicado')
            ->where(['avePrincipalId' => $avePrincipalId, 'deleted' => 0])
            ->order('id', 'ASC')
            ->find();

        $result = [];
        $totalImpacto = 0;

        foreach ($items as $item) {
            $fc = $this->entityManager->getEntity('AveFactoresDecisionesCanalesPlan', $item->get('factorCatalogoId'));
            $tipo = $item->get('tipo');
            $totalImpacto += $tipo === 'positivo' ? 1 : -1;

            $result[] = [
                'id' => $item->getId(),
                'factorCatalogoId' => $item->get('factorCatalogoId'),
                'factorName' => $fc ? $fc->get('name') : '',
                'name' => $fc ? $fc->get('name') : '',
                'tipo' => $tipo,
                'impactoPorcentual' => $item->get('impactoPorcentual'),
                'descripcion' => $fc ? $fc->get('descripcion') : ''
            ];
        }

        // Actualizar el total de impacto en el AVE
        $ave = $this->entityManager->getEntity('AvePrincipal', $avePrincipalId);
        if ($ave) {
            $ave->set('totalImpactoFactores', $totalImpacto);
            $this->entityManager->saveEntity($ave);
        }

        return $result;
    }

    private function guardarFactoresAplicados(string $avePrincipalId, array $factores): void
    {
        $em = $this->entityManager;
        
        // Eliminar existentes
        $existentes = $em->getRDBRepository('AveFactorAplicado')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->find();
        
        foreach ($existentes as $f) { 
            $em->removeEntity($f);
        }
        
        $totalImpacto = 0;
        
        foreach ($factores as $factor) {
            $arr = (array) $factor;
            
            if (empty($arr['factorCatalogoId'])) {
                continue;
            }
            
            $tipo = $arr['tipo'] ?? 'positivo';
            $totalImpacto += ($tipo === 'positivo') ? 1 : -1;
            
            $entity = $em->getNewEntity('AveFactorAplicado');
            $entity->set('avePrincipalId', $avePrincipalId);
            $entity->set('factorCatalogoId', $arr['factorCatalogoId']);
            $entity->set('tipo', $tipo);
            $entity->set('impactoPorcentual', $tipo === 'positivo' ? 1 : -1);
            
            $em->saveEntity($entity);
        }
        
        $ave = $em->getEntity('AvePrincipal', $avePrincipalId);
        if ($ave) { 
            $ave->set('totalImpactoFactores', $totalImpacto); 
            $em->saveEntity($ave);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Guardar formulario completo
    // ──────────────────────────────────────────────────────────────

    public function guardarCompleto(\stdClass $data): array
    {
        $em = $this->entityManager;
        $entity = $em->getEntity('AvePrincipal', $data->aveId);
        if (!$entity) throw new NotFound("AvePrincipal '{$data->aveId}' no encontrado.");

        // Manejar assignedUserId si viene
        if (property_exists($data, 'assignedUserId') && !empty($data->assignedUserId)) {
            $userId = is_object($data->assignedUserId) ? $data->assignedUserId->id : $data->assignedUserId;
            $entity->set('assignedUserId', $userId);
        }

        if (isset($data->datosGenerales)) {
            $dg = $data->datosGenerales;
            $this->setIfSet($entity, 'numeroAve',              $dg->numeroAve              ?? null);
            $this->setIfSet($entity, 'tipoIdentificacion',     $dg->tipoIdentificacion     ?? null);
            $this->setIfSet($entity, 'identificacionCliente',  $dg->identificacionCliente  ?? null);
            $this->setIfSet($entity, 'nombreCliente',          $dg->nombreCliente          ?? null);
            $this->setIfSet($entity, 'correoCliente',          $dg->correoCliente          ?? null);
            $this->setIfSet($entity, 'telefonoCliente',        $dg->telefonoCliente        ?? null);
        }

        if (property_exists($data, 'aveInmuebleId')) {
            $entity->set('aveInmuebleId', $data->aveInmuebleId);
        }

        if (isset($data->legal)) {
            $l = $data->legal;
            $this->setIfSet($entity, 'cedulaCatastral',   isset($l->cedulaCatastral)   ? (bool)$l->cedulaCatastral   : null);
            $this->setIfSet($entity, 'cedCatNota',        $l->cedCatNota        ?? null);
            $this->setIfSet($entity, 'registroPropiedad', isset($l->registroPropiedad) ? (bool)$l->registroPropiedad : null);
            $this->setIfSet($entity, 'regProNota',        $l->regProNota        ?? null);
            $this->setIfSet($entity, 'solvenciaMunicipal',isset($l->solvenciaMunicipal)? (bool)$l->solvenciaMunicipal: null);
            $this->setIfSet($entity, 'solMunNota',        $l->solMunNota        ?? null);
            $this->setIfSet($entity, 'comentarioLegal',   isset($l->comentarioLegal)   ? (bool)$l->comentarioLegal   : null);
            $this->setIfSet($entity, 'comLegNota',        $l->comLegNota        ?? null);
        }

        if (isset($data->referencias) && is_array($data->referencias)) {
            $this->guardarReferencias($data->aveId, $data->referencias);
        }

        if (isset($data->analisis) && is_array($data->analisis)) {
            $this->guardarAnalisisRespuestas($data->aveId, $data->analisis);
        }

        if (isset($data->factoresAplicados) && is_array($data->factoresAplicados)) {
            $this->guardarFactoresAplicados($data->aveId, $data->factoresAplicados);
        }

        if (isset($data->decisiones)) $this->guardarItemsRelacionados($data->aveId, $data->decisiones, 'decision');
        if (isset($data->canales))    $this->guardarItemsRelacionados($data->aveId, $data->canales,    'canal');
        if (isset($data->planes))     $this->guardarItemsRelacionados($data->aveId, $data->planes,     'plan');

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

            if (isset($p->pesoOfertas) && $p->pesoOfertas !== null && $p->pesoOfertas !== '') {
                $po = max(0, min(100, (float)$p->pesoOfertas));
                $entity->set('pesoOfertas', $po);
                $entity->set('pesoVentas',  100 - $po);
            } elseif ($entity->get('pesoOfertas') === null) {
                $entity->set('pesoOfertas', 50);
                $entity->set('pesoVentas',  50);
            }
        }

        $this->recalcularPreciosParaEntity($entity);
        $em->saveEntity($entity);

        return ['success' => true, 'id' => $data->aveId];
    }

    // ──────────────────────────────────────────────────────────────
    // Recalcular precios
    // ──────────────────────────────────────────────────────────────

    public function recalcularPreciosParaEntity(Entity $entity): void
    {
        $em             = $this->entityManager;
        $avePrincipalId = $entity->getId();

        $referencias = $em->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId, 'usarCalculo' => true])
            ->find();

        $sumaPreciosOfertas = 0; $sumaAreasOfertas = 0;
        $sumaPreciosVentas  = 0; $sumaAreasVentas  = 0;
        $todosLosPreciosM2  = [];

        foreach ($referencias as $ref) {
            $precio = $ref->get('valorReferencial');
            $area   = $ref->get('areaConstruida');
            $tipo   = $ref->get('tipo');

            if ($precio && $area && $area > 0) {
                $todosLosPreciosM2[] = $precio / $area;
                if ($tipo === 'promocion') {
                    $sumaPreciosOfertas += $precio;
                    $sumaAreasOfertas   += $area;
                } else {
                    $sumaPreciosVentas  += $precio;
                    $sumaAreasVentas    += $area;
                }
            }
        }

        $precioM2Ofertas  = $sumaAreasOfertas > 0 ? $sumaPreciosOfertas / $sumaAreasOfertas : 0;
        $precioM2Ventas   = $sumaAreasVentas  > 0 ? $sumaPreciosVentas  / $sumaAreasVentas  : 0;

        $pesoOfertas = $entity->get('pesoOfertas') ?? 50;
        if ($pesoOfertas === '') $pesoOfertas = 50;
        $pesoVentas  = 100 - $pesoOfertas;
        $entity->set('pesoVentas', $pesoVentas);

        $precioM2Ponderado = ($precioM2Ofertas * $pesoOfertas / 100) + ($precioM2Ventas * $pesoVentas / 100);

        $valorMaxM2 = !empty($todosLosPreciosM2) ? max($todosLosPreciosM2) : 0;
        $valorMinM2 = !empty($todosLosPreciosM2) ? min($todosLosPreciosM2) : 0;

        $areaInmueble = 0;
        if ($entity->get('aveInmuebleId')) {
            $inm = $em->getEntity('AveInmueble', $entity->get('aveInmuebleId'));
            if ($inm) $areaInmueble = $inm->get('areaConstruida') ?? 0;
        }

        $precioMaximo     = $valorMaxM2 * $areaInmueble;
        $precioMinimo     = $valorMinM2 * $areaInmueble;
        $precioVentaBase  = $precioM2Ponderado * $areaInmueble;

        $ajuste = $entity->get('ajustePrecio') ?? 0;
        if ($ajuste === '') $ajuste = 0;

        $precioSugerido = $precioVentaBase * (1 + $ajuste / 100);
        $rangoMin       = $precioSugerido  * (1 - abs($ajuste) / 100);
        $rangoMax       = $precioSugerido  * (1 + abs($ajuste) / 100);

        $entity->set('valorMax',       round($valorMaxM2,       2));
        $entity->set('valorMin',       round($valorMinM2,       2));
        $entity->set('valorPromedio',  round($precioM2Ponderado,2));
        $entity->set('precioMax',      round($precioMaximo,     2));
        $entity->set('precioMin',      round($precioMinimo,     2));
        $entity->set('precioOriginal', round($precioVentaBase,  2));
        $entity->set('precioSugerido', round($precioSugerido,   2));
        $entity->set('rangoPrecioMin', round($rangoMin,         2));
        $entity->set('rangoPrecioMax', round($rangoMax,         2));
    }

    // ──────────────────────────────────────────────────────────────
    // Items relacionados
    // ──────────────────────────────────────────────────────────────

    private function guardarItemsRelacionados(string $avePrincipalId, array $items, string $tipo): void
    {
        $em         = $this->entityManager;
        $existentes = $em->getRDBRepository('AvePrincipalItem')
            ->where(['avePrincipalId' => $avePrincipalId, 'tipo' => $tipo])->find();
        foreach ($existentes as $e) { $em->removeEntity($e); }

        foreach ($items as $item) {
            $itemId = is_object($item) ? $item->id : $item['id'];
            if (empty($itemId)) continue;
            $rel = $em->getNewEntity('AvePrincipalItem');
            $rel->set(['avePrincipalId' => $avePrincipalId, 'itemId' => $itemId, 'tipo' => $tipo]);
            $em->saveEntity($rel);
        }
    }

    private function getItemsRelacionados(string $avePrincipalId, string $tipo): array
    {
        $relaciones = $this->entityManager->getRDBRepository('AvePrincipalItem')
            ->where(['avePrincipalId' => $avePrincipalId, 'tipo' => $tipo])
            ->order('id', 'ASC')->find();

        $result = [];
        foreach ($relaciones as $rel) {
            $item = $this->entityManager->getEntity('AveFactoresDecisionesCanalesPlan', $rel->get('itemId'));
            if ($item) {
                $result[] = [
                    'id'         => $item->getId(),
                    'name'       => $item->get('name'),
                    'descripcion'=> $item->get('descripcion'),
                    'impacto'    => $item->get('impacto'),
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
        $em         = $this->entityManager;
        $existentes = $em->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])->find();

        $idsNuevos = array_filter(array_column($referencias, 'id'));
        foreach ($existentes as $ref) {
            if (!in_array($ref->getId(), $idsNuevos)) $em->removeEntity($ref);
        }

        $campos = ['tipo','tipoPropiedad','usarCalculo','subtipoPropiedad','valorReferencial','areaTerreno',
                   'areaConstruida','antiguedad','habitaciones','banos','estacionamiento','piso','ascensores',
                   'terraza','acabados','seguridad','valorm2','descripcion','enlace'];

        foreach ($referencias as $refData) {
            $refArr = (array) $refData;
            $ref    = !empty($refArr['id'])
                ? $em->getEntity('AveInmuebleReferencia', $refArr['id'])
                : $em->getNewEntity('AveInmuebleReferencia');

            if (!$ref) continue;
            if (empty($refArr['id'])) $ref->set('avePrincipalId', $avePrincipalId);

            foreach ($campos as $campo) {
                if (array_key_exists($campo, $refArr)) $ref->set($campo, $refArr[$campo]);
            }

            if (array_key_exists('fotoId', $refArr)) {
                if (!empty($refArr['fotoId'])) {
                    $ref->set('fotoId', $refArr['fotoId']);
                    $ref->set('foto',   $refArr['fotoId']);
                } else {
                    $ref->set('fotoId', null);
                }
            }

            $em->saveEntity($ref);
        }
    }

    private function getReferencias(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])->order('id', 'ASC')->find();
        $result = [];
        foreach ($items as $item) { $result[] = (array) $item->getValueMap(); }
        return $result;
    }

    // ──────────────────────────────────────────────────────────────
    // Análisis FODA
    // ──────────────────────────────────────────────────────────────

    private function getAnalisisRespuestas(string $avePrincipalId): array
    {
        $items = $this->entityManager->getRDBRepository('AveAnalisisRespuesta')
            ->where(['avePrincipalId' => $avePrincipalId])->order('id', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $titulo   = $this->entityManager->getEntity('AveAnalisis', $item->get('aveAnalisisId'));
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
        $em         = $this->entityManager;
        $existentes = $em->getRDBRepository('AveAnalisisRespuesta')->where(['avePrincipalId' => $avePrincipalId])->find();
        foreach ($existentes as $r) { $em->removeEntity($r); }

        foreach ($respuestas as $resp) {
            $arr = (array) $resp;
            if (empty($arr['aveAnalisisId']) || empty($arr['tipo']) || empty($arr['descripcion'])) continue;
            $entity = $em->getNewEntity('AveAnalisisRespuesta');
            $entity->set('avePrincipalId', $avePrincipalId);
            $entity->set('aveAnalisisId',  $arr['aveAnalisisId']);
            $entity->set('tipo',           $arr['tipo']);
            $entity->set('descripcion',    $arr['descripcion']);
            $em->saveEntity($entity);
        }
    }

    // ──────────────────────────────────────────────────────────────
    // Inmuebles
    // ──────────────────────────────────────────────────────────────

    public function buscarInmuebles(string $q, ?string $teamId): array
    {
        $repo  = $this->entityManager->getRDBRepository('AveInmueble');
        $where = [];
        if ($q) {
            $where[] = ['OR' => [
                ['nombrePropietario*' => '%' . $q . '%'],
                ['referencia*'        => '%' . $q . '%'],
                ['ciudad*'            => '%' . $q . '%'],
                ['urbanizacion*'      => '%' . $q . '%'],
            ]];
        }
        $items  = $repo->where($where)->limit(20)->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id'               => $item->getId(),
                'nombrePropietario'=> $item->get('nombrePropietario'),
                'referencia'       => $item->get('referencia'),
                'tipoPropiedad'    => $item->get('tipoPropiedad'),
                'subtipoPropiedad' => $item->get('subtipoPropiedad'),
                'ciudad'           => $item->get('ciudad'),
                'urbanizacion'     => $item->get('urbanizacion'),
                'estado'           => $item->get('estado'),
                'areaConstruida'   => $item->get('areaConstruida'),
                'areaTerreno'      => $item->get('areaTerreno'),
                'numHabitaciones'  => $item->get('numHabitaciones'),
                'numBanos'         => $item->get('numBanos'),
                'estatus'          => $item->get('estatus'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function getCatalogoAnalisis(?string $teamId): array
    {
        $repo  = $this->entityManager->getRDBRepository('AveAnalisis');
        $where = ['OR' => [['predeterminado' => true], ['teamId' => $teamId]]];
        $items = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = ['id' => $item->getId(), 'name' => $item->get('name'), 'predeterminado' => $item->get('predeterminado')];
        }
        return ['success' => true, 'data' => $result];
    }

    public function crearAnalisisTitulo(\stdClass $data): array
    {
        $name = trim($data->name ?? $data->nombre ?? '');
        if (!$name) throw new BadRequest("El nombre es requerido.");

        $em     = $this->entityManager;
        $entity = $em->getNewEntity('AveAnalisis');
        $entity->set('name', $name);
        $entity->set('predeterminado', !empty($data->predeterminado));
        if (!empty($data->teamId)) $entity->set('teamId', $data->teamId);
        $em->saveEntity($entity);

        return ['success' => true, 'data' => ['id' => $entity->getId(), 'name' => $entity->get('name')]];
    }

    public function crearInmueble(\stdClass $data): array
    {
        $em     = $this->entityManager;
        $isEdit = !empty($data->id);
        $inm    = $isEdit ? $em->getEntity('AveInmueble', $data->id) : $em->getNewEntity('AveInmueble');
        if (!$inm) throw new BadRequest("Inmueble no encontrado para editar");

        if (!$isEdit) $inm->set('referencia', $this->generateNextPropNumber());

        $campos = ['nombrePropietario','tipoPropiedad','subtipoPropiedad','estado','municipio','parroquia','ciudad',
                   'avenidaCalle','edificioCasa','urbanizacion','areaConstruida','areaTerreno','antiguedad',
                   'numHabitaciones','numBanos','puestoEstacionamiento','piso','ascensores','servicios',
                   'terraza','seguridad','descripcion','fotoId'];

        foreach ($campos as $campo) {
            if (property_exists($data, $campo) && $data->$campo !== null && $data->$campo !== '') {
                $inm->set($campo, $data->$campo);
            }
        }
        if (!empty($data->teamId)) $inm->set('teamsIds', [$data->teamId]);
        $em->saveEntity($inm);
        return ['success' => true, 'data' => $this->formatInmueble($inm)];
    }

    protected function generateNextPropNumber(): string
    {
        try {
            $pdo  = $this->entityManager->getPDO();
            $stmt = $pdo->query("SELECT referencia FROM ave_inmueble WHERE referencia LIKE 'Prop-%' ORDER BY id DESC LIMIT 1");
            $last = $stmt->fetchColumn();
            if ($last && preg_match('/Prop-(\d+)/', $last, $m)) {
                $next = (int)$m[1] + 1;
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

    public function getFactoresPorTipo(string $tipo, ?string $teamId, ?string $descripcion = null): array
    {
        $repo  = $this->entityManager->getRDBRepository('AveFactoresDecisionesCanalesPlan');
        $where = ['tipo' => $tipo];
        
        if ($teamId) {
            $where[] = ['OR' => [['predeterminado' => true], ['teamId' => $teamId]]];
        } else {
            $where[] = ['predeterminado' => true];
        }
        
        // Para factores, filtrar por descripcion (que guarda el subtipo)
        if ($tipo === 'factor') {
            if ($descripcion && $descripcion !== '') {
                // Si HAY subtipo: mostrar SOLO factores de ese subtipo
                $where['descripcion'] = $descripcion;
            } else {
                // Si NO HAY subtipo: mostrar SOLO factores generales (sin descripcion)
                $where[] = ['OR' => [['descripcion' => null], ['descripcion' => '']]];
            }
        }
        
        $items = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id'             => $item->getId(),
                'name'           => $item->get('name'),
                'descripcion'    => $item->get('descripcion'),
                'tipo'           => $item->get('tipo'),
                'impacto'        => $item->get('impacto'),
                'predeterminado' => (bool)$item->get('predeterminado'),
                'teamId'         => $item->get('teamId'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function crearFactor(\stdClass $data): array
    {
        $name = $data->name ?? $data->nombre ?? null;
        $tipo = $data->tipo ?? null;
        if (!$name) throw new BadRequest("El nombre es requerido.");
        if (!$tipo) throw new BadRequest("El tipo es requerido.");

        $em     = $this->entityManager;
        $entity = $em->getNewEntity('AveFactoresDecisionesCanalesPlan');
        $entity->set('name',           trim($name));
        $entity->set('tipo',           $tipo);
        $entity->set('descripcion',    $data->descripcion    ?? '');
        $entity->set('impacto',        $data->impacto        ?? null);
        $entity->set('predeterminado', !empty($data->predeterminado));
        
        if (!empty($data->teamId)) $entity->set('teamId', $data->teamId);
        $em->saveEntity($entity);

        return ['success' => true, 'data' => [
            'id'             => $entity->getId(),
            'name'           => $entity->get('name'),
            'descripcion'    => $entity->get('descripcion'),
            'tipo'           => $entity->get('tipo'),
            'impacto'        => $entity->get('impacto'),
            'predeterminado' => $entity->get('predeterminado'),
            'teamId'         => $entity->get('teamId'),
        ]];
    }

    // ──────────────────────────────────────────────────────────────
    // Helpers privados
    // ──────────────────────────────────────────────────────────────

    private function setIfSet($entity, string $field, $value): void
    {
        if ($value !== null) $entity->set($field, $value);
    }

    private function formatAvePrincipal($entity): array
    {
        return [
            'id'                    => $entity->getId(),
            'numeroAve'             => $entity->get('numeroAve'),
            'tipoIdentificacion'    => $entity->get('tipoIdentificacion'),
            'identificacionCliente' => $entity->get('identificacionCliente'),
            'nombreCliente'         => $entity->get('nombreCliente'),
            'correoCliente'         => $entity->get('correoCliente'),
            'telefonoCliente'       => $entity->get('telefonoCliente'),
            'aveInmuebleId'         => $entity->get('aveInmuebleId'),
            'cedulaCatastral'       => $entity->get('cedulaCatastral'),
            'cedCatNota'            => $entity->get('cedCatNota'),
            'registroPropiedad'     => $entity->get('registroPropiedad'),
            'regProNota'            => $entity->get('regProNota'),
            'solvenciaMunicipal'    => $entity->get('solvenciaMunicipal'),
            'solMunNota'            => $entity->get('solMunNota'),
            'comentarioLegal'       => $entity->get('comentarioLegal'),
            'comLegNota'            => $entity->get('comLegNota'),
            'valorMax'              => $entity->get('valorMax'),
            'precioMax'             => $entity->get('precioMax'),
            'valorMin'              => $entity->get('valorMin'),
            'precioMin'             => $entity->get('precioMin'),
            'valorPromedio'         => $entity->get('valorPromedio'),
            'precioOriginal'        => $entity->get('precioOriginal'),
            'precioSugerido'        => $entity->get('precioSugerido'),
            'ajustePrecio'          => $entity->get('ajustePrecio'),
            'pesoOfertas'           => $entity->get('pesoOfertas'),
            'pesoVentas'            => $entity->get('pesoVentas'),
            'rangoPrecioMin'        => $entity->get('rangoPrecioMin'),
            'rangoPrecioMax'        => $entity->get('rangoPrecioMax'),
            'assignedUserId'        => $entity->get('assignedUserId'),
            'assignedUserName'      => $entity->get('assignedUserName'),
            'totalImpactoFactores'  => $entity->get('totalImpactoFactores'),
            'assignedUserImageId'   => null,
            'teamId'                => null,
            'teamName'              => null,
        ];
    }

    private function formatInmueble($entity): array
    {
        if (!$entity) return [];
        
        return [
            'id' => $entity->getId(),
            'referencia' => $entity->get('referencia'),
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

    public function debugReferencias(string $avePrincipalId): void
    {
        // Método de depuración eliminado
    }
}