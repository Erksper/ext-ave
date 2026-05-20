<?php

namespace Espo\Modules\AVE\Controllers;

use Espo\Core\Api\Request;
use Espo\Core\Api\Response;
use Espo\Core\Controllers\Record;
use Espo\Core\Exceptions\BadRequest;
use Espo\Modules\AVE\Services\AvePrincipalService;

class AvePrincipal extends Record
{
    /**
     * GET /api/v1/AvePrincipal/action/getLista
     * Lista paginada de avalúos
     */
    public function getActionGetLista(Request $request, Response $response): void
    {
        $pagina = (int) ($request->getQueryParam('pagina') ?? 1);
        $porPagina = (int) ($request->getQueryParam('porPagina') ?? 20);
        $numero = $request->getQueryParam('numero') ?? '';
        $cliente = $request->getQueryParam('cliente') ?? '';
        $identificacion = $request->getQueryParam('identificacion') ?? '';
        $asesor = $request->getQueryParam('asesor') ?? '';

        /** @var AvePrincipalService $service */
        $service = $this->getRecordService();
        $result = $service->getLista($pagina, $porPagina, $numero, $cliente, $identificacion, $asesor);
        $response->writeData($result);
    }

    /**
     * GET /api/v1/AvePrincipal/action/getOrCreate?id=xxx
     * Carga o crea el registro principal del AVE
     */
    public function getActionGetOrCreate(Request $request, Response $response): void
    {
        $id = $request->getQueryParam('id');
        if (!$id) {
            throw new BadRequest("Parámetro 'id' requerido.");
        }

        /** @var AvePrincipalService $service */
        $service = $this->getRecordService();
        $result = $service->getOrCreate($id);
        $response->writeData($result);
    }

    /**
     * POST /api/v1/AvePrincipal/action/guardar
     * Guarda todos los datos del AVE desde el frontend multi-tab
     */
    public function postActionGuardar(Request $request, Response $response): void
    {
        $data = $request->getParsedBody();
        if (empty($data->aveId)) {
            throw new BadRequest("Parámetro 'aveId' requerido.");
        }

        /** @var AvePrincipalService $service */
        $service = $this->getRecordService();
        $result = $service->guardarCompleto($data);
        $response->writeData($result);
    }

    /**
     * GET /api/v1/AvePrincipal/action/buscarInmueble?q=texto&teamId=xxx
     * Busca inmuebles existentes para vincular
     */
    public function getActionBuscarInmueble(Request $request, Response $response): void
    {
        $q = $request->getQueryParam('q') ?? '';
        $teamId = $request->getQueryParam('teamId') ?? null;

        /** @var AvePrincipalService $service */
        $service = $this->getRecordService();
        $result = $service->buscarInmuebles($q, $teamId);
        $response->writeData($result);
    }

    /**
     * POST /api/v1/AvePrincipal/action/crearInmueble
     * Crea un nuevo AveInmueble y lo devuelve
     */
    public function postActionCrearInmueble(Request $request, Response $response): void
    {
        $data = $request->getParsedBody();

        /** @var AvePrincipalService $service */
        $service = $this->getRecordService();
        $result = $service->crearInmueble($data);
        $response->writeData($result);
    }

    /**
     * GET /api/v1/AvePrincipal/action/getFactoresPorTipo?tipo=factor&teamId=xxx
     * Devuelve lista de factores/decisiones/canales/planes por tipo y team
     */
    public function getActionGetFactoresPorTipo(Request $request, Response $response): void
    {
        $tipo = $request->getQueryParam('tipo');
        $teamId = $request->getQueryParam('teamId') ?? null;
        if (!$tipo) {
            throw new BadRequest("Parámetro 'tipo' requerido.");
        }

        /** @var AvePrincipalService $service */
        $service = $this->getRecordService();
        $result = $service->getFactoresPorTipo($tipo, $teamId);
        $response->writeData($result);
    }

    /**
     * POST /api/v1/AvePrincipal/action/crearFactor
     * Crea un nuevo factor/decisión/canal/plan para el team del usuario
     */
    public function postActionCrearFactor(Request $request, Response $response): void
    {
        $data = $request->getParsedBody();

        /** @var AvePrincipalService $service */
        $service = $this->getRecordService();
        $result = $service->crearFactor($data);
        $response->writeData($result);
    }
}