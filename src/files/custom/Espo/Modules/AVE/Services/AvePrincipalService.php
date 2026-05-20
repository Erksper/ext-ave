<?php

namespace Espo\Modules\AVE\Services;

use Espo\Core\Exceptions\NotFound;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Record\Service as RecordService;
use Espo\ORM\EntityManager;

class AvePrincipalService extends RecordService
{
    protected string $entityType = 'AvePrincipal';

    // --------------------------------------------------------------
    // Lista paginada (para el listado)
    // --------------------------------------------------------------
    public function getLista(int $pagina, int $porPagina, string $numero, string $cliente, string $identificacion, string $asesor): array
    {
        $em = $this->getEntityManager();
        $repo = $em->getRDBRepository('AvePrincipal');
        $where = [];
        if ($numero)  $where[] = ['numeroAve*' => '%'.$numero.'%'];
        if ($cliente) $where[] = ['nombreCliente*' => '%'.$cliente.'%'];
        if ($identificacion) $where[] = ['identificacionCliente*' => '%'.$identificacion.'%'];
        // El filtro por asesor se aplicaría sobre assignedUser, pero no lo implementamos ahora por simplicidad
        $offset = ($pagina - 1) * $porPagina;
        $total = $repo->where($where)->count();
        $items = $repo->where($where)->order('createdAt', 'DESC')->limit($porPagina, $offset)->find();
        $list = [];
        foreach ($items as $item) {
            $inmuebleName = null;
            if ($item->get('aveInmuebleId')) {
                $inm = $em->getEntity('AveInmueble', $item->get('aveInmuebleId'));
                if ($inm) {
                    $inmuebleName = trim(($inm->get('nombrePropietario') ?? '') . ' - ' . ($inm->get('ciudad') ?? ''));
                }
            }
            $list[] = [
                'id' => $item->getId(),
                'numeroAve' => $item->get('numeroAve'),
                'tipoIdentificacion' => $item->get('tipoIdentificacion'),
                'identificacionCliente' => $item->get('identificacionCliente'),
                'nombreCliente' => $item->get('nombreCliente'),
                'aveInmuebleId' => $item->get('aveInmuebleId'),
                'aveInmuebleName' => $inmuebleName,
                'assignedUserId' => $item->get('assignedUserId'),
                'assignedUserName' => $item->get('assignedUserName'),
                'createdAt' => $item->get('createdAt'),
            ];
        }
        return ['success' => true, 'data' => ['list' => $list, 'total' => $total]];
    }

    // --------------------------------------------------------------
    // Obtener o crear AVE (para el detalle)
    // --------------------------------------------------------------
    public function getOrCreate(string $id): array
    {
        $em = $this->getEntityManager();
        $entity = $em->getEntity('AvePrincipal', $id);
        if (!$entity) {
            throw new NotFound("AvePrincipal con id '$id' no encontrado.");
        }

        $inmueble = null;
        if ($entity->get('aveInmuebleId')) {
            $inm = $em->getEntity('AveInmueble', $entity->get('aveInmuebleId'));
            if ($inm) {
                $inmueble = $this->formatInmueble($inm);
            }
        }

        $referencias = $this->getReferencias($id);
        $analisis = $this->getAnalisis($id);

        return [
            'success' => true,
            'data' => [
                'ave' => $this->formatAvePrincipal($entity),
                'inmueble' => $inmueble,
                'referencias' => $referencias,
                'analisis' => $analisis,
            ],
        ];
    }

    // --------------------------------------------------------------
    // Guardar todo el formulario
    // --------------------------------------------------------------
    public function guardarCompleto(\stdClass $data): array
    {
        $em = $this->getEntityManager();
        $id = $data->aveId;

        $entity = $em->getEntity('AvePrincipal', $id);
        if (!$entity) {
            throw new NotFound("AvePrincipal '$id' no encontrado.");
        }

        // Datos generales (pestaña 1)
        if (isset($data->datosGenerales)) {
            $dg = $data->datosGenerales;
            if (isset($dg->numeroAve)) $entity->set('numeroAve', $dg->numeroAve);
            if (isset($dg->tipoIdentificacion)) $entity->set('tipoIdentificacion', $dg->tipoIdentificacion);
            if (isset($dg->identificacionCliente)) $entity->set('identificacionCliente', $dg->identificacionCliente);
            if (isset($dg->nombreCliente)) $entity->set('nombreCliente', $dg->nombreCliente);
            if (isset($dg->correoCliente)) $entity->set('correoCliente', $dg->correoCliente);
            if (isset($dg->telefonoCliente)) $entity->set('telefonoCliente', $dg->telefonoCliente);
        }

        // Inmueble (pestaña 2)
        if (isset($data->aveInmuebleId)) {
            $entity->set('aveInmuebleId', $data->aveInmuebleId);
        }

        // Situación legal (pestaña 3)
        if (isset($data->legal)) {
            $l = $data->legal;
            if (isset($l->cedulaCatastral)) $entity->set('cedulaCatastral', (bool)$l->cedulaCatastral);
            if (isset($l->cedCatNota)) $entity->set('cedCatNota', $l->cedCatNota);
            if (isset($l->registroPropiedad)) $entity->set('registroPropiedad', (bool)$l->registroPropiedad);
            if (isset($l->regProNota)) $entity->set('regProNota', $l->regProNota);
            if (isset($l->solvenciaMunicipal)) $entity->set('solvenciaMunicipal', (bool)$l->solvenciaMunicipal);
            if (isset($l->solMunNota)) $entity->set('solMunNota', $l->solMunNota);
            if (isset($l->comentarioLegal)) $entity->set('comentarioLegal', (bool)$l->comentarioLegal);
            if (isset($l->comLegNota)) $entity->set('comLegNota', $l->comLegNota);
        }

        // Precios (pestaña 8)
        if (isset($data->precio)) {
            $p = $data->precio;
            if (isset($p->valorMax)) $entity->set('valorMax', $p->valorMax);
            if (isset($p->precioMax)) $entity->set('precioMax', $p->precioMax);
            if (isset($p->valorMin)) $entity->set('valorMin', $p->valorMin);
            if (isset($p->precioMin)) $entity->set('precioMin', $p->precioMin);
            if (isset($p->valorPromedio)) $entity->set('valorPromedio', $p->valorPromedio);
            if (isset($p->precioOriginal)) $entity->set('precioOriginal', $p->precioOriginal);
            if (isset($p->precioSugerido)) $entity->set('precioSugerido', $p->precioSugerido);
            if (isset($p->ajustePrecio)) $entity->set('ajustePrecio', $p->ajustePrecio);
        }

        $em->saveEntity($entity);

        // Guardar referencias y análisis
        if (isset($data->referencias) && is_array($data->referencias)) {
            $this->guardarReferencias($id, $data->referencias);
        }
        if (isset($data->analisis) && is_array($data->analisis)) {
            $this->guardarAnalisis($id, $data->analisis);
        }

        // Aquí se pueden guardar factores, decisiones, canales, planes (por implementar)

        return ['success' => true, 'id' => $id];
    }

    // --------------------------------------------------------------
    // Referencias
    // --------------------------------------------------------------
    private function guardarReferencias(string $avePrincipalId, array $referencias): void
    {
        $em = $this->getEntityManager();
        $existentes = $em->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->find();
        $idsNuevos = array_filter(array_column($referencias, 'id'));
        foreach ($existentes as $ref) {
            if (!in_array($ref->get('id'), $idsNuevos)) {
                $em->removeEntity($ref);
            }
        }
        foreach ($referencias as $refData) {
            if (!empty($refData['id'])) {
                $ref = $em->getEntity('AveInmuebleReferencia', $refData['id']);
            } else {
                $ref = $em->getNewEntity('AveInmuebleReferencia');
                $ref->set('avePrincipalId', $avePrincipalId);
            }
            if (!$ref) continue;
            $campos = ['tipo','tipoPropiedad','usarCalculo','subtipoPropiedad','valorReferencial','areaTerreno','areaConstruida','antiguedad','habitaciones','banos','estacionamiento','piso','ascensores','terraza','acabados','seguridad','valorm2','descripcion','enlace'];
            foreach ($campos as $campo) {
                if (isset($refData[$campo])) {
                    $ref->set($campo, $refData[$campo]);
                }
            }
            $em->saveEntity($ref);
        }
    }

    private function getReferencias(string $avePrincipalId): array
    {
        $em = $this->getEntityManager();
        $refs = $em->getRDBRepository('AveInmuebleReferencia')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('createdAt', 'ASC')
            ->find();
        $result = [];
        foreach ($refs as $ref) {
            $result[] = $ref->getValueMap();
        }
        return $result;
    }

    // --------------------------------------------------------------
    // Análisis FODA
    // --------------------------------------------------------------
    private function guardarAnalisis(string $avePrincipalId, array $analisis): void
    {
        $em = $this->getEntityManager();
        $existentes = $em->getRDBRepository('AveAnalisis')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->find();
        $idsNuevos = array_filter(array_column($analisis, 'id'));
        foreach ($existentes as $an) {
            if (!in_array($an->get('id'), $idsNuevos)) {
                $em->removeEntity($an);
            }
        }
        foreach ($analisis as $anData) {
            if (!empty($anData['id'])) {
                $an = $em->getEntity('AveAnalisis', $anData['id']);
            } else {
                $an = $em->getNewEntity('AveAnalisis');
                $an->set('avePrincipalId', $avePrincipalId);
            }
            if (!$an) continue;
            if (isset($anData['name'])) $an->set('name', $anData['name']);
            if (isset($anData['tipo'])) $an->set('tipo', $anData['tipo']);
            if (isset($anData['detalle'])) $an->set('detalle', $anData['detalle']);
            $em->saveEntity($an);
        }
    }

    private function getAnalisis(string $avePrincipalId): array
    {
        $em = $this->getEntityManager();
        $items = $em->getRDBRepository('AveAnalisis')
            ->where(['avePrincipalId' => $avePrincipalId])
            ->order('tipo', 'ASC')
            ->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = $item->getValueMap();
        }
        return $result;
    }

    // --------------------------------------------------------------
    // Inmuebles
    // --------------------------------------------------------------
    public function buscarInmuebles(string $q, ?string $teamId): array
    {
        $em = $this->getEntityManager();
        $repo = $em->getRDBRepository('AveInmueble');
        $where = [];
        if ($q) {
            $where[] = [
                'OR' => [
                    ['nombrePropietario*' => '%' . $q . '%'],
                    ['referencia*' => '%' . $q . '%'],
                    ['ciudad*' => '%' . $q . '%'],
                    ['urbanizacion*' => '%' . $q . '%'],
                ]
            ];
        }
        $items = $repo->where($where)->limit(20)->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id' => $item->getId(),
                'nombrePropietario' => $item->get('nombrePropietario'),
                'referencia' => $item->get('referencia'),
                'tipoPropiedad' => $item->get('tipoPropiedad'),
                'ciudad' => $item->get('ciudad'),
                'urbanizacion' => $item->get('urbanizacion'),
                'label' => trim(($item->get('referencia') ? '[' . $item->get('referencia') . '] ' : '') . $item->get('nombrePropietario') . ' - ' . $item->get('ciudad')),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function crearInmueble(\stdClass $data): array
    {
        $em = $this->getEntityManager();
        $inm = $em->getNewEntity('AveInmueble');
        $campos = [
            'nombrePropietario', 'estatus', 'tipoPropiedad', 'estado', 'municipio',
            'parroquia', 'ciudad', 'avenidaCalle', 'edificioCasa', 'urbanizacion',
            'subtipoPropiedad', 'areaConstruida', 'antiguedad', 'numHabitaciones',
            'numBanos', 'puestoEstacionamiento', 'piso', 'ascensores', 'servicios',
            'terraza', 'seguridad', 'descripcion'
        ];
        foreach ($campos as $campo) {
            if (isset($data->$campo)) {
                $inm->set($campo, $data->$campo);
            }
        }
        if (!empty($data->teamId)) {
            $inm->set('teamsIds', [$data->teamId]);
        }
        $em->saveEntity($inm);
        return ['success' => true, 'data' => $this->formatInmueble($inm)];
    }

    // --------------------------------------------------------------
    // Factores / Decisiones / Canales / Planes (catálogos)
    // --------------------------------------------------------------
    public function getFactoresPorTipo(string $tipo, ?string $teamId): array
    {
        $em = $this->getEntityManager();
        $repo = $em->getRDBRepository('AveFactoresDecisionesCanalesPlan');
        $where = ['tipo' => $tipo];
        $items = $repo->where($where)->order('name', 'ASC')->find();
        $result = [];
        foreach ($items as $item) {
            $result[] = [
                'id' => $item->getId(),
                'name' => $item->get('name'),
                'descripcion' => $item->get('descripcion'),
                'tipo' => $item->get('tipo'),
                'impacto' => $item->get('impacto'),
            ];
        }
        return ['success' => true, 'data' => $result];
    }

    public function crearFactor(\stdClass $data): array
    {
        if (empty($data->name)) throw new BadRequest("El nombre es requerido.");
        if (empty($data->tipo)) throw new BadRequest("El tipo es requerido.");

        $em = $this->getEntityManager();
        $entity = $em->getNewEntity('AveFactoresDecisionesCanalesPlan');
        $entity->set('name', $data->name);
        $entity->set('tipo', $data->tipo);
        $entity->set('descripcion', $data->descripcion ?? '');
        $entity->set('impacto', $data->impacto ?? null);
        if (!empty($data->teamId)) {
            $entity->set('teamsIds', [$data->teamId]);
        }
        $em->saveEntity($entity);
        return [
            'success' => true,
            'data' => [
                'id' => $entity->getId(),
                'name' => $entity->get('name'),
                'tipo' => $entity->get('tipo'),
                'descripcion' => $entity->get('descripcion'),
                'impacto' => $entity->get('impacto'),
            ],
        ];
    }

    // --------------------------------------------------------------
    // Formatos
    // --------------------------------------------------------------
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
            'estado' => $entity->get('estado'),
            'municipio' => $entity->get('municipio'),
            'parroquia' => $entity->get('parroquia'),
            'ciudad' => $entity->get('ciudad'),
            'avenidaCalle' => $entity->get('avenidaCalle'),
            'edificioCasa' => $entity->get('edificioCasa'),
            'urbanizacion' => $entity->get('urbanizacion'),
            'subtipoPropiedad' => $entity->get('subtipoPropiedad'),
            'areaConstruida' => $entity->get('areaConstruida'),
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

    private function getEntityManager(): EntityManager
    {
        return $this->entityManager;
    }
}