<link rel="stylesheet" type="text/css" href="client/custom/modules/ave/res/css/ave.css">

<div class="ave-list-container">

    <!-- Header -->
    <div class="ave-page-header">
        <div class="ave-header-left">
            <div class="ave-header-icon">
                <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <div>
                <h1 class="ave-page-title">Análisis para una Venta Exitosa</h1>
                <p class="ave-page-subtitle">Gestión de reportes de avalúo</p>
            </div>
        </div>
        <div class="ave-header-actions">
            <button class="ave-btn ave-btn-primary" data-action="crear-nuevo">
                <i class="fas fa-plus"></i> Nuevo AVE
            </button>
        </div>
    </div>

    <!-- Filtros -->
    <div class="ave-card" style="margin-bottom:20px;">
        <div class="ave-card-header"><i class="fas fa-filter"></i> Filtros</div>
        <div class="ave-card-body">
            <div class="ave-filtros-grid">
                <div>
                    <label class="ave-form-label">N° AVE</label>
                    <input type="text" id="filtro-numero" class="ave-form-control" placeholder="Buscar por número...">
                </div>
                <div>
                    <label class="ave-form-label">Cliente</label>
                    <input type="text" id="filtro-cliente" class="ave-form-control" placeholder="Nombre del cliente...">
                </div>
                <div>
                    <label class="ave-form-label">Identificación</label>
                    <input type="text" id="filtro-identificacion" class="ave-form-control" placeholder="CI / RIF...">
                </div>
                <div>
                    <label class="ave-form-label">Asesor</label>
                    <input type="text" id="filtro-asesor" class="ave-form-control" placeholder="Nombre del asesor...">
                </div>
                <div>
                    <label class="ave-form-label">Estado</label>
                    <select id="filtro-status" class="ave-form-control">
                        <option value="">Todos</option>
                        <option value="elaboracion">En Elaboración</option>
                        <option value="impresion">Listo para Imprimir</option>
                        <option value="aprobado">Aprobado</option>
                    </select>
                </div>
            </div>
            <div class="ave-filtro-actions">
                <button class="ave-btn ave-btn-primary" data-action="filtrar">
                    <i class="fas fa-search"></i> Buscar
                </button>
                <button class="ave-btn ave-btn-secondary" data-action="limpiar-filtros">
                    <i class="fas fa-times"></i> Limpiar
                </button>
            </div>
        </div>
    </div>

    <!-- Leyenda de estados -->
    <div class="ave-lista-leyenda">
        <span class="ave-leyenda-titulo"><i class="fas fa-info-circle"></i> <strong>Estados:</strong></span>
        <span class="ave-leyenda-badge ave-leyenda-elaboracion">En Elaboración</span>
        <span class="ave-leyenda-badge ave-leyenda-impresion">Listo para Imprimir</span>
        <span class="ave-leyenda-badge ave-leyenda-aprobado">Aprobado</span>
    </div>

    <!-- Loading -->
    <div id="ave-list-loading" class="ave-loading" style="display:none;">
        <div class="ave-spinner"></div>
        <p class="ave-loading-title">Cargando avalúos...</p>
    </div>

    <!-- Lista -->
    <div id="ave-list-content">
        <div class="ave-meta-row">
            <div class="ave-contador">
                Total: <strong id="ave-total-count">0</strong> avalúos
            </div>
        </div>

        <div class="ave-table-wrapper">
            <table class="ave-table">
                <thead>
                    <tr>
                        <th style="width:50px; text-align:center;">#</th>
                        <th>N° AVE</th>
                        <th>Cliente</th>
                        <th>Identificación</th>
                        <th>Inmueble</th>
                        <th>Asesor</th>
                        <th>Fecha</th>
                        <th style="width:120px; text-align:center;">Estado</th>
                        <th style="width:160px; text-align:center;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="ave-list-tbody"></tbody>
            </table>

            <div id="ave-no-data" class="ave-no-data" style="display:none;">
                <i class="fas fa-file-invoice-dollar"></i>
                <h3>No hay avalúos registrados</h3>
                <p>Cree un nuevo AVE para comenzar.</p>
            </div>

            <div class="ave-paginacion" id="ave-paginacion" style="display:none;">
                <span class="ave-page-info" id="ave-page-info" style="font-size:13px; color:var(--ave-text-muted);"></span>
                <div class="ave-pag-controles" id="ave-pag-controles"></div>
            </div>
        </div>
    </div>

</div>