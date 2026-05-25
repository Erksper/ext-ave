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
        string $identificacion, string $asesor
    ): array {
        // Versión simplificada para depurar
        $repo = $this->entityManager->getRDBRepository('AvePrincipal');
        
        // Obtener TODOS los registros (sin paginación, sin order)
        $items = $repo->find();
        
        $list = [];
        foreach ($items as $item) {
            $list[] = [
                'id'            => $item->getId(),
                'numeroAve'     => $item->get('numeroAve'),
                'nombreCliente' => $item->get('nombreCliente'),
                'createdAt'     => $item->get('createdAt'),
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
                'analisis'    => $this->getAnalisis($id),
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
            $this->guardarAnalisis($data->aveId, $data->analisis);
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
            $this->setIfSet($entity, 'valorMax', $p->valorMax ?? null);
            $this->setIfSet($entity, 'precioMax', $p->precioMax ?? null);
            $this->setIfSet($entity, 'valorMin', $p->valorMin ?? null);
            $this->setIfSet($entity, 'precioMin', $p->precioMin ?? null);
            $this->setIfSet($entity, 'valorPromedio', $p->valorPromedio ?? null);
            $this->setIfSet($entity, 'precioOriginal', $p->precioOriginal ?? null);
            $this->setIfSet($entity, 'precioSugerido', $p->precioSugerido ?? null);
            $this->setIfSet($entity, 'ajustePrecio', $p->ajustePrecio ?? null);
            $this->setIfSet($entity, 'pesoOfertas', $p->pesoOfertas ?? null);
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
        $campos = [
            'tipo','tipoPropiedad','usarCalculo','subtipoPropiedad','valorReferencial','areaTerreno',
            'areaConstruida','antiguedad','habitaciones','banos','estacionamiento','piso','ascensores',
            'terraza','acabados','seguridad','valorm2','descripcion','enlace','fotoId'
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
            'terraza', 'seguridad', 'descripcion'
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
        $where = [
            'tipo' => $tipo,
            'OR' => [
                'predeterminado' => true,
                'teamId' => $teamId
            ]
        ];
        $items = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id' => $item->getId(),
                'name' => $item->get('name'),
                'descripcion' => $item->get('descripcion'),
                'tipo' => $item->get('tipo'),
                'impacto' => $item->get('impacto'),
                'predeterminado' => $item->get('predeterminado'),
                'teamId' => $item->get('teamId')
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