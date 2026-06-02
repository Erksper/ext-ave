<link rel="stylesheet" type="text/css" href="client/custom/modules/ave/res/css/ave.css">
<link rel="stylesheet" type="text/css" href="client/custom/modules/ave/res/css/ave-detail.css">

<div class="ave-container">

    <!-- Header -->
    <div class="ave-page-header">
        <div class="ave-header-left">
            <div class="ave-header-icon">
                <i class="fas fa-file-invoice-dollar"></i>
            </div>
            <div>
                <h1 class="ave-page-title">Análisis para una Venta Exitosa</h1>
                <p class="ave-page-subtitle" id="ave-subtitle">Cargando...</p>
            </div>
        </div>
        <div class="ave-header-actions">
            <button class="ave-btn ave-btn-secondary" data-action="volver">
                <i class="fas fa-arrow-left"></i> Volver
            </button>
            <button class="ave-btn ave-btn-primary" data-action="guardar" id="btn-guardar">
                <i class="fas fa-save"></i> Guardar
            </button>
        </div>
    </div>

    <!-- Loading -->
    <div id="ave-detail-loading" class="ave-loading">
        <div class="ave-spinner"></div>
        <p class="ave-loading-title">Cargando avalúo...</p>
    </div>

    <!-- Contenido principal -->
    <div id="ave-detail-content" style="display:none;">

        <!-- Navegación de pestañas -->
        <div class="ave-tabs-nav" id="ave-tabs-nav">
            <button class="ave-tab-btn active" data-tab="tab-1"><span class="tab-num">1</span> Datos Generales</button>
            <button class="ave-tab-btn" data-tab="tab-2"><span class="tab-num">2</span> Datos del Inmueble</button>
            <button class="ave-tab-btn" data-tab="tab-3"><span class="tab-num">3</span> Situación Legal</button>
            <button class="ave-tab-btn" data-tab="tab-4"><span class="tab-num">4</span> Referencias en Promoción</button>
            <button class="ave-tab-btn" data-tab="tab-5"><span class="tab-num">5</span> Referencias Vendidos</button>
            <button class="ave-tab-btn" data-tab="tab-6"><span class="tab-num">6</span> Fortalezas y debilidades</button>
            <button class="ave-tab-btn" data-tab="tab-7"><span class="tab-num">7</span> Factores que influyen en el precio</button>
            <button class="ave-tab-btn" data-tab="tab-8"><span class="tab-num">8</span> Precio Sugerido</button>
            <button class="ave-tab-btn" data-tab="tab-9"><span class="tab-num">9</span> Opciones de decisión</button>
            <button class="ave-tab-btn" data-tab="tab-10"><span class="tab-num">10</span> Medios de promocion</button>
            <button class="ave-tab-btn" data-tab="tab-11"><span class="tab-num">11</span> Plan de Trabajo</button>
            <button class="ave-tab-btn" data-tab="tab-12"><span class="tab-num">12</span> Vista Previa</button>
        </div>

        <div class="ave-tab-content">

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 1 — Datos Generales ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane active" id="tab-1">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-user"></i> Datos del Cliente</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="row">
                            <div class="col-md-3">
                                <div class="ave-form-group">
                                    <label class="ave-form-label">N° AVE</label>
                                    <input type="text" id="numeroAve" class="ave-form-control" readonly disabled style="background-color:#f5f5f5;">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-2">
                                <div class="ave-form-group">
                                    <label class="ave-form-label required">Tipo ID</label>
                                    <select id="tipoIdentificacion" class="ave-form-control">
                                        <option value="">--</option>
                                        <option value="V">V - Venezolano</option>
                                        <option value="E">E - Extranjero</option>
                                        <option value="J">J - Jurídico</option>
                                        <option value="P">P - Pasaporte</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="ave-form-group">
                                    <label class="ave-form-label required">N° de Identificación</label>
                                    <input type="text" id="identificacionCliente" class="ave-form-control">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="ave-form-group">
                                    <label class="ave-form-label required">Nombre completo del cliente</label>
                                    <input type="text" id="nombreCliente" class="ave-form-control">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="ave-form-group">
                                    <label class="ave-form-label">Correo electrónico</label>
                                    <input type="email" id="correoCliente" class="ave-form-control">
                                    <small id="emailHelp" style="display:none; color:#e74c3c;">Formato de correo inválido</small>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="ave-form-group">
                                    <label class="ave-form-label">Teléfono</label>
                                    <input type="text" id="telefonoCliente" class="ave-form-control">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 2 — Inmueble ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-2">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-building"></i> Inmueble Avaluado</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="ave-inmueble-search-bar">
                            <div class="row">
                                <div class="col-md-8">
                                    <div class="ave-form-group">
                                        <label class="ave-form-label">Buscar inmueble existente</label>
                                        <div class="ave-search-input-wrapper">
                                            <i class="fas fa-search ave-search-icon"></i>
                                            <input type="text" id="inmueble-search-input" class="ave-form-control ave-search-input" placeholder="Buscar por propietario, referencia o ciudad...">
                                            <div id="inmueble-search-results" class="ave-search-dropdown" style="display:none;"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4" style="padding-top:26px;">
                                    <button class="ave-btn ave-btn-secondary" data-action="nuevo-inmueble" style="width:100%;"><i class="fas fa-plus"></i> Crear nuevo inmueble</button>
                                </div>
                            </div>
                        </div>
                        <div id="inmueble-seleccionado" style="display:none; margin-top:16px;">
                            <div class="ave-inmueble-card">
                                <div class="ave-inmueble-card-header">
                                    <div class="ave-inmueble-card-title"><i class="fas fa-home"></i> <span id="inm-nombre-propietario">-</span></div>
                                    <div>
                                        <button class="ave-btn ave-btn-secondary ave-btn-sm" data-action="cambiar-inmueble"><i class="fas fa-exchange-alt"></i> Cambiar</button>
                                        <button class="ave-btn ave-btn-secondary ave-btn-sm" data-action="editar-inmueble"><i class="fas fa-edit"></i> Editar</button>
                                    </div>
                                </div>
                                <div class="ave-inmueble-card-body">
                                    <div class="ave-inm-card-foto-col" id="inm-card-foto">
                                        <div class="ave-inm-card-foto-empty"><i class="fas fa-image"></i><span>Sin foto</span></div>
                                    </div>
                                    <!-- Datos existentes -->
                                    <div class="ave-inm-card-datos">
                                        <div class="row">
                                            <div class="col-md-3"><div class="ave-info-item"><div class="ave-info-label">Referencia</div><div class="ave-info-value" id="inm-referencia">-</div></div></div>
                                            <div class="col-md-3"><div class="ave-info-item"><div class="ave-info-label">Tipo de Propiedad</div><div class="ave-info-value" id="inm-tipo">-</div></div></div>
                                            <div class="col-md-3"><div class="ave-info-item"><div class="ave-info-label">Sub Tipo</div><div class="ave-info-value" id="inm-subtipo">-</div></div></div>
                                            <div class="col-md-3"><div class="ave-info-item"><div class="ave-info-label">Área Construida</div><div class="ave-info-value" id="inm-area">-</div></div></div>
                                        </div>
                                        <div class="row" style="margin-top:12px;">
                                            <div class="col-md-4"><div class="ave-info-item"><div class="ave-info-label">Área Terreno</div><div class="ave-info-value" id="inm-area-terreno">-</div></div></div>
                                            <div class="col-md-4"><div class="ave-info-item"><div class="ave-info-label">Habitaciones / Baños</div><div class="ave-info-value" id="inm-hab-ban">-</div></div></div>
                                            <div class="col-md-4"><div class="ave-info-item"><div class="ave-info-label">Ubicación</div><div class="ave-info-value" id="inm-ubicacion">-</div></div></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="inmueble-vacio" class="ave-no-data" style="padding:40px 20px; margin-top:16px;">
                            <i class="fas fa-building"></i><h3>Sin inmueble asignado</h3><p>Busca uno existente o crea uno nuevo.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 3 — Situación Legal ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-3">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-gavel"></i> Situación Legal del Inmueble</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="ave-legal-item">
                            <div class="ave-checkbox-wrapper">
                                <input type="checkbox" id="chk-cedulaCatastral" class="ave-legal-chk" data-nota="nota-cedCatNota">
                                <label class="ave-checkbox-label" for="chk-cedulaCatastral"><i class="fas fa-map-marked-alt"></i> Cédula Catastral</label>
                            </div>
                            <div class="ave-legal-nota" id="nota-cedCatNota" style="display:none;">
                                <input type="text" id="cedCatNota" class="ave-form-control" placeholder="Nota sobre la cédula catastral...">
                            </div>
                        </div>
                        <div class="ave-legal-divider"></div>
                        <div class="ave-legal-item">
                            <div class="ave-checkbox-wrapper">
                                <input type="checkbox" id="chk-registroPropiedad" class="ave-legal-chk" data-nota="nota-regProNota">
                                <label class="ave-checkbox-label" for="chk-registroPropiedad"><i class="fas fa-file-contract"></i> Registro de Propiedad</label>
                            </div>
                            <div class="ave-legal-nota" id="nota-regProNota" style="display:none;">
                                <input type="text" id="regProNota" class="ave-form-control" placeholder="Nota sobre el registro de propiedad...">
                            </div>
                        </div>
                        <div class="ave-legal-divider"></div>
                        <div class="ave-legal-item">
                            <div class="ave-checkbox-wrapper">
                                <input type="checkbox" id="chk-solvenciaMunicipal" class="ave-legal-chk" data-nota="nota-solMunNota">
                                <label class="ave-checkbox-label" for="chk-solvenciaMunicipal"><i class="fas fa-university"></i> Solvencia Municipal</label>
                            </div>
                            <div class="ave-legal-nota" id="nota-solMunNota" style="display:none;">
                                <input type="text" id="solMunNota" class="ave-form-control" placeholder="Nota sobre la solvencia municipal...">
                            </div>
                        </div>
                        <div class="ave-legal-divider"></div>
                        <div class="ave-legal-item">
                            <div class="ave-checkbox-wrapper">
                                <input type="checkbox" id="chk-comentarioLegal" class="ave-legal-chk" data-nota="nota-comLegNota">
                                <label class="ave-checkbox-label" for="chk-comentarioLegal"><i class="fas fa-comment-alt"></i> Comentario Legal Adicional</label>
                            </div>
                            <div class="ave-legal-nota" id="nota-comLegNota" style="display:none;">
                                <input type="text" id="comLegNota" class="ave-form-control" placeholder="Comentario legal adicional...">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 4 — Referencias en Promoción ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-4">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-tag"></i> Inmuebles Referenciales en Promoción</span>
                            <span class="ave-panel-title-right"><span class="ave-panel-badge" id="badge-promocion">0 / 5</span><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="ave-alert ave-alert-info"><i class="fas fa-info-circle"></i> Puede agregar entre <strong>1 y 5</strong> inmuebles de referencia.</div>
                        <div id="refs-promocion-lista"></div>
                        <button class="ave-ref-add-btn" id="btn-add-promocion" data-tipo="promocion"><i class="fas fa-plus-circle"></i> Agregar referencia</button>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 5 — Referencias Vendidos ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-5">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-handshake"></i> Inmuebles Referenciales Vendidos</span>
                            <span class="ave-panel-title-right"><span class="ave-panel-badge" id="badge-vendido">0 / 5</span><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="ave-alert ave-alert-info"><i class="fas fa-info-circle"></i> Puede agregar entre <strong>1 y 5</strong> inmuebles de referencia vendidos.</div>
                        <div id="refs-vendido-lista"></div>
                        <button class="ave-ref-add-btn" id="btn-add-vendido" data-tipo="vendido"><i class="fas fa-plus-circle"></i> Agregar referencia</button>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 6 — FODA ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-6">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-balance-scale"></i> Análisis de Fortalezas y Debilidades</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">

                        <!-- Selector -->
                        <div class="row" style="margin-bottom:16px;">
                            <div class="col-md-7">
                                <label class="ave-form-label">Seleccionar título</label>
                                <select id="select-foda" class="ave-form-control">
                                    <option value="">-- Seleccione un título --</option>
                                </select>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-primary" data-action="agregar-foda" style="width:100%;">
                                    <i class="fas fa-plus"></i> Agregar
                                </button>
                            </div>
                            <div class="col-md-3" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-secondary" data-action="nuevo-titulo-foda" style="width:100%;">
                                    <i class="fas fa-plus-circle"></i> Nuevo título
                                </button>
                            </div>
                        </div>

                        <!-- Grid fortalezas / debilidades -->
                        <div class="ave-foda-grid">
                            <div class="ave-foda-fortaleza">
                                <div class="ave-foda-col-title">
                                    <i class="fas fa-thumbs-up"></i> Fortalezas
                                </div>
                                <div class="ave-foda-list" id="foda-fortalezas"></div>
                            </div>
                            <div class="ave-foda-debilidad">
                                <div class="ave-foda-col-title">
                                    <i class="fas fa-thumbs-down"></i> Debilidades
                                </div>
                                <div class="ave-foda-list" id="foda-debilidades"></div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 7 — Factores ═══════════════════════════════════════════════════ -->
            <!-- ═══════════════════════════════════════════════════ PESTAÑA 7 — Factores ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-7">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-chart-bar"></i> Factores que Influyen en el Precio</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <!-- Selector de factor -->
                        <div class="row" style="margin-bottom:16px;">
                            <div class="col-md-7">
                                <label class="ave-form-label">Seleccionar factor existente</label>
                                <select id="select-factor" class="ave-form-control">
                                    <option value="">-- Seleccione un factor --</option>
                                </select>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-primary" data-action="agregar-factor" style="width:100%;"><i class="fas fa-plus"></i> Agregar</button>
                            </div>
                            <div class="col-md-3" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-secondary" data-action="nuevo-factor" style="width:100%;"><i class="fas fa-plus-circle"></i> Nuevo Factor</button>
                            </div>
                        </div>
                        
                        <!-- Tabla de factores aplicados -->
                        <div class="ave-table-wrapper">
                            <table class="ave-table">
                                <thead>
                                    <tr>
                                        <th>Factor</th>
                                        <th style="width:120px; text-align:center;">Tipo de Impacto</th>
                                        <th style="width:100px; text-align:center;">% Afectación</th>
                                        <th style="width:60px; text-align:center;">Quitar</th>
                                    </tr>
                                </thead>
                                <tbody id="factores-tbody">
                                    <tr id="factores-empty-row">
                                        <td colspan="4" style="text-align:center; padding:30px;">No hay factores agregados</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Total de impacto -->
                        <div id="factores-total-container" style="display:none; margin-top: 16px; background: var(--ave-light); border-radius: 8px; padding: 12px; text-align: center; border-left: 4px solid var(--ave-primary);">
                            <strong>📊 Total afectación en el precio:</strong> <span id="factores-total" style="font-weight: 700; font-size: 16px;">0%</span>
                            <br><small id="factores-mensaje">Debido a estos factores, el precio de la propiedad puede verse afectado en un 0%</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 8 — Precio Sugerido ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-8">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-calculator"></i> Análisis Integral y Precio Sugerido</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <!-- Sección de precios referenciales - Nuevo orden -->
                        <div class="ave-precio-grid">
                            <div class="ave-precio-card">
                                <div class="ave-precio-card-label">Valor Máximo por m²</div>
                                <input type="number" id="valorMax" class="ave-form-control" step="0.01" readonly disabled>
                            </div>
                            <div class="ave-precio-card">
                                <div class="ave-precio-card-label">Precio Máximo (USD)</div>
                                <input type="number" id="precioMax" class="ave-form-control" step="0.01" readonly disabled>
                            </div>
                            <div class="ave-precio-card">
                                <div class="ave-precio-card-label">Valor Promedio por m²</div>
                                <input type="number" id="valorPromedio" class="ave-form-control" step="0.01" readonly disabled>
                            </div>
                            <div class="ave-precio-card">
                                <div class="ave-precio-card-label">Valor Mínimo por m²</div>
                                <input type="number" id="valorMin" class="ave-form-control" step="0.01" readonly disabled>
                            </div>
                            <div class="ave-precio-card">
                                <div class="ave-precio-card-label">Precio Mínimo (USD)</div>
                                <input type="number" id="precioMin" class="ave-form-control" step="0.01" readonly disabled>
                            </div>
                            <div class="ave-precio-card">
                                <div class="ave-precio-card-label">Precio de Venta de Salida al Mercado (USD)</div>
                                <input type="number" id="precioOriginal" class="ave-form-control" step="0.01" readonly disabled>
                            </div>
                        </div>
                        
                        <!-- Pesos de ponderación -->
                        <div class="row" style="margin-top: 20px;">
                            <div class="col-md-6">
                                <div class="ave-form-group">
                                    <label class="ave-form-label">Peso Ofertas (%)</label>
                                    <input type="number" id="pesoOfertas" class="ave-form-control"
                                        step="1" min="0" max="100" value="50">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="ave-form-group">
                                    <label class="ave-form-label">Peso Ventas (%)</label>
                                    <input type="number" id="pesoVentas" class="ave-form-control"
                                        readonly disabled style="background:#f5f5f5;" value="50">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Rango de Precio Sugerido -->
                        <div class="row" style="margin-top: 20px;">
                            <div class="col-md-12">
                                <div class="ave-precio-card highlight">
                                    <div class="ave-precio-card-label">RANGO DE PRECIO SUGERIDO</div>
                                    <div class="ave-precio-card-value" style="font-size: 28px;">
                                        <span id="rangoPrecioMinDisplay">$ 0.00</span> - <span id="rangoPrecioMaxDisplay">$ 0.00</span>
                                    </div>
                                    <div class="row" style="margin-top: 15px;">
                                        <div class="col-md-4 col-md-offset-4">
                                            <div class="ave-form-group">
                                                <label class="ave-form-label">Ajuste de Precio (%)</label>
                                                <input type="number" id="ajustePrecio" class="ave-form-control" step="1" min="-100" max="100" value="0">
                                                <small style="color: #666;">Valor negativo = descuento, positivo = incremento</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 9 — Decisiones ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-9">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-check-square"></i> Opciones de Decisión</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="row" style="margin-bottom:16px;">
                            <div class="col-md-8">
                                <label class="ave-form-label">Seleccionar decisión existente</label>
                                <select id="select-decision" class="ave-form-control">
                                    <option value="">-- Seleccione una decisión --</option>
                                </select>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-primary" data-action="agregar-decision" style="width:100%;"><i class="fas fa-plus"></i> Agregar</button>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-secondary" data-action="nueva-decision" style="width:100%;"><i class="fas fa-plus-circle"></i> Nuevo</button>
                            </div>
                        </div>
                        <div class="ave-table-wrapper">
                            <table class="ave-table">
                                <thead><tr><th>Título</th><th>Descripción</th><th style="width:60px; text-align:center;">Quitar</th></tr></thead>
                                <tbody id="decisiones-tbody"><tr id="decisiones-empty-row"><td colspan="3" style="text-align:center; padding:30px;">No hay decisiones agregadas</td></tr></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 10 — Medios ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-10">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-bullhorn"></i> Medios Publicitarios</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="row" style="margin-bottom:16px;">
                            <div class="col-md-8">
                                <label class="ave-form-label">Seleccionar medio existente</label>
                                <select id="select-canal" class="ave-form-control">
                                    <option value="">-- Seleccione un medio --</option>
                                </select>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-primary" data-action="agregar-canal" style="width:100%;"><i class="fas fa-plus"></i> Agregar</button>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-secondary" data-action="nuevo-canal" style="width:100%;"><i class="fas fa-plus-circle"></i> Nuevo</button>
                            </div>
                        </div>
                        <div class="ave-table-wrapper">
                            <table class="ave-table">
                                <thead>
                                    <tr>
                                        <th>Medio Publicitario</th>
                                        <th style="width:60px; text-align:center;">Quitar</th>
                                    </tr>
                                </thead>
                                <tbody id="canales-tbody">
                                    <tr id="canales-empty-row">
                                        <td colspan="2" style="text-align:center; padding:30px;">No hay medios agregados</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 11 — Plan de Trabajo ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-11">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-tasks"></i> Plan de Trabajo</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div class="row" style="margin-bottom:16px;">
                            <div class="col-md-8">
                                <label class="ave-form-label">Seleccionar plan existente</label>
                                <select id="select-plan" class="ave-form-control">
                                    <option value="">-- Seleccione un plan --</option>
                                </select>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-primary" data-action="agregar-plan" style="width:100%;"><i class="fas fa-plus"></i> Agregar</button>
                            </div>
                            <div class="col-md-2" style="padding-top:24px;">
                                <button class="ave-btn ave-btn-secondary" data-action="nuevo-plan" style="width:100%;"><i class="fas fa-plus-circle"></i> Nuevo</button>
                            </div>
                        </div>
                        <div class="ave-table-wrapper">
                            <table class="ave-table">
                                <thead>
                                    <tr>
                                        <th>Título</th>
                                        <th>Descripción</th>
                                        <th style="width:60px; text-align:center;">Quitar</th>
                                    </tr>
                                </thead>
                                <tbody id="planes-tbody">
                                    <tr id="planes-empty-row">
                                        <td colspan="3" style="text-align:center; padding:30px;">No hay planes agregados</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ═══════════════════════════════════════════════════ PESTAÑA 12 — Vista Previa ═══════════════════════════════════════════════════ -->
            <div class="ave-tab-pane" id="tab-12">
                <div class="ave-panel">
                    <div class="ave-panel-heading active" data-action="toggle-panel">
                        <h4 class="ave-panel-title">
                            <span class="ave-panel-title-text"><i class="fas fa-file-alt"></i> Vista Previa del Reporte</span>
                            <span class="ave-panel-title-right"><i class="fas fa-chevron-up"></i></span>
                        </h4>
                    </div>
                    <div class="ave-panel-body">
                        <div style="margin-bottom:16px; text-align:right;">
                            <button class="ave-btn ave-btn-primary" data-action="generar-preview"><i class="fas fa-sync-alt"></i> Actualizar Vista Previa</button>
                        </div>
                        <div id="ave-preview-container"><div class="ave-no-data"><i class="fas fa-file-alt"></i><h3>Vista previa no generada</h3><p>Guarde el formulario y haga clic en "Actualizar Vista Previa".</p></div></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="ave-form-actions">
            <button class="ave-btn ave-btn-secondary" data-action="volver"><i class="fas fa-arrow-left"></i> Volver</button>
            <button class="ave-btn ave-btn-primary" data-action="guardar"><i class="fas fa-save"></i> Guardar AVE</button>
        </div>

    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════ MODALES ═══════════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════════ MODAL — Inmueble ═══════════════════════════════════════════════════════════════ -->
<div class="modal fade" id="modalInmueble" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header ave-modal-header">
                <button type="button" class="ave-modal-close" data-dismiss="modal">&times;</button>
                <h4 class="ave-modal-title"><i class="fas fa-building"></i> Datos del Inmueble</h4>
            </div>
            <div class="modal-body" style="padding:24px;">
                <input type="hidden" id="inm-m-id">
                <div class="row">
                    <div class="col-md-6">
                        <div class="ave-form-group">
                            <label class="ave-form-label required">Nombre del Propietario</label>
                            <input type="text" id="inm-m-nombrePropietario" class="ave-form-control">
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="ave-form-group">
                            <label class="ave-form-label">Tipo de Propiedad</label>
                            <select id="inm-m-tipoPropiedad" class="ave-form-control">
                                <option value="">-- Seleccione --</option>
                                <option value="habitacional">Residencial</option>
                                <option value="comercial">Comercial</option>
                                <option value="industrial">Industrial</option>
                                <option value="vacacional">Vacacional</option>
                                <option value="terreno">Terreno</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="ave-form-group">
                            <label class="ave-form-label">Sub Tipo</label>
                            <select id="inm-m-subtipoPropiedad" class="ave-form-control">
                                <option value="">-- Seleccione --</option>
                                <option value="departamento">Apartamento</option>
                                <option value="casa">Casa</option>
                                <option value="town-house">Town-House</option>
                                <option value="terreno">Terreno</option>
                                <option value="edificio">Edificio</option>
                                <option value="oficinas">Oficinas</option>
                                <option value="local">Local</option>
                                <option value="galpon">Galpón</option>
                                <option value="penthouse">Penthouse</option>
                                <option value="hacienda">Hacienda</option>
                                <option value="deposito">Depósito</option>
                                <option value="hotel-posada">Hotel/Posada</option>
                                <option value="fondo-de-comercio">Fondo de comercio</option>
                                <option value="negocio">Negocio</option>
                                <option value="casa-bote">Casa bote</option>
                                <option value="clinica">Clínica</option>
                                <option value="fabrica">Fábrica</option>
                                <option value="finca">Finca</option>
                                <option value="club">Club</option>
                                <option value="tiempo-compartido">Tiempo compartido</option>
                                <option value="nave">Nave</option>
                                <option value="casa-duplex">Casa dúplex</option>
                                <option value="quinta">Quinta</option>
                                <option value="bodega">Bodega</option>
                                <option value="inmueble-productivo">Inmueble productivo</option>
                                <option value="rancho">Rancho</option>
                                <option value="fraccionamiento">Fraccionamiento</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Estado</label><input type="text" id="inm-m-estado" class="ave-form-control"></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Municipio</label><input type="text" id="inm-m-municipio" class="ave-form-control"></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Parroquia</label><input type="text" id="inm-m-parroquia" class="ave-form-control"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Ciudad</label><input type="text" id="inm-m-ciudad" class="ave-form-control"></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Urbanización / Sector</label><input type="text" id="inm-m-urbanizacion" class="ave-form-control"></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Avenida / Calle</label><input type="text" id="inm-m-avenidaCalle" class="ave-form-control"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-6"><div class="ave-form-group"><label class="ave-form-label">Edificio / C.C. / Casa</label><input type="text" id="inm-m-edificioCasa" class="ave-form-control"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Área Construida (m²)</label><input type="number" id="inm-m-areaConstruida" class="ave-form-control" step="0.01"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Área de Terreno (m²)</label><input type="number" id="inm-m-areaTerreno" class="ave-form-control" step="0.01"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Antigüedad (años)</label><input type="number" id="inm-m-antiguedad" class="ave-form-control"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Habitaciones</label><input type="number" id="inm-m-numHabitaciones" class="ave-form-control" step="0.5"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Baños</label><input type="number" id="inm-m-numBanos" class="ave-form-control" step="0.5"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Estacionamientos</label><input type="number" id="inm-m-puestoEstacionamiento" class="ave-form-control"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Piso</label><input type="text" id="inm-m-piso" class="ave-form-control"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Servicios</label><select id="inm-m-servicios" class="ave-form-control"><option value="">-- Seleccione --</option><option value="completos">Completos</option><option value="basicos">Básicos</option></select></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Seguridad</label><select id="inm-m-seguridad" class="ave-form-control"><option value="">-- Seleccione --</option><option value="Vigilancia 24H">Vigilancia 24H</option><option value="Cerco">Cerco</option><option value="Camaras">Cámaras</option><option value="Otro">Otro</option></select></div></div>
                    <div class="col-md-3"><div class="ave-checkbox-wrapper"><input type="checkbox" id="inm-m-ascensores"><label class="ave-checkbox-label" for="inm-m-ascensores">Ascensores</label></div></div>
                    <div class="col-md-3"><div class="ave-checkbox-wrapper"><input type="checkbox" id="inm-m-terraza"><label class="ave-checkbox-label" for="inm-m-terraza">Terraza</label></div></div>
                </div>
                <div class="row">
                    <div class="col-md-8">
                        <div class="ave-form-group">
                            <label class="ave-form-label">Descripción</label>
                            <textarea id="inm-m-descripcion" class="ave-form-control" rows="3"></textarea>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="ave-form-group">
                            <label class="ave-form-label">Foto del inmueble</label>
                            <input type="file" id="inm-m-foto" class="ave-form-control" accept="image/*">
                            <input type="hidden" id="inm-m-foto-id">
                            <div id="inm-m-foto-preview" style="display:none; margin-top:8px;">
                                <img src="" style="max-width:100%; max-height:120px; border-radius:8px; object-fit:cover; border:1px solid var(--ave-border);">
                                <button type="button" id="inm-m-foto-remove" class="ave-btn ave-btn-danger ave-btn-sm" style="margin-top:6px; width:100%;">
                                    <i class="fas fa-times"></i> Quitar foto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="ave-btn ave-btn-secondary" data-dismiss="modal">Cancelar</button>
                <button type="button" class="ave-btn ave-btn-primary" id="btn-guardar-inmueble"><i class="fas fa-save"></i> Guardar</button>
            </div>
        </div>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════ MODAL — Referencia ═══════════════════════════════════════════════════════════════ -->
<div class="modal fade" id="modalReferencia" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header ave-modal-header">
                <button type="button" class="ave-modal-close" data-dismiss="modal">&times;</button>
                <h4 class="ave-modal-title" id="modal-ref-titulo">
                    <i class="fas fa-tag"></i> <span id="modal-ref-titulo-text">Inmueble de Referencia</span>
                </h4>
            </div>
            <div class="modal-body" style="padding:24px;">
                <input type="hidden" id="ref-modal-tipo">
                <input type="hidden" id="ref-modal-idx">
                <div class="row">
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Tipo de Propiedad</label><select id="ref-tipoPropiedad" class="ave-form-control"><option value="">-- Seleccione --</option><option value="Residencial">Residencial</option><option value="Vacacional">Vacacional</option><option value="Comercial">Comercial</option><option value="Terreno">Terreno</option><option value="Industrial">Industrial</option></select></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Sub Tipo</label><select id="ref-subtipoPropiedad" class="ave-form-control"><option value="">-- Seleccione --</option><option value="Apartamento">Apartamento</option><option value="Casa">Casa</option><option value="Town-House">Town-House</option><option value="Penthouse">Penthouse</option><option value="Casa Duplex">Casa Duplex</option><option value="Casa Bote">Casa Bote</option><option value="Quinta">Quinta</option><option value="Edificio">Edificio</option><option value="Local Comercial">Local Comercial</option><option value="Oficina">Oficina</option><option value="Galpón">Galpón</option><option value="Parcela">Parcela</option></select></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Usar en Cálculo</label><select id="ref-usarCalculo" class="ave-form-control"><option value="1">Sí</option><option value="0">No</option></select></div></div>
                </div>
                <div class="row">
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label" for="ref-valorReferencial" id="ref-valor-label">Valor Referencial (USD)</label><input type="number" id="ref-valorReferencial" class="ave-form-control" step="0.01" placeholder="Valor Referencial (USD)"></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Área Terreno (m²)</label><input type="number" id="ref-areaTerreno" class="ave-form-control" step="0.01"></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Área Construida (m²)</label><input type="number" id="ref-areaConstruida" class="ave-form-control" step="0.01"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Antigüedad (años)</label><input type="number" id="ref-antiguedad" class="ave-form-control"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Habitaciones</label><input type="number" id="ref-habitaciones" class="ave-form-control"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Baños</label><input type="number" id="ref-banos" class="ave-form-control"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Estacionamientos</label><input type="number" id="ref-estacionamiento" class="ave-form-control"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Piso</label><input type="text" id="ref-piso" class="ave-form-control"></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Acabados</label><select id="ref-acabados" class="ave-form-control"><option value="">-- Seleccione --</option><option value="Obra gris">Obra gris</option><option value="Acabados basicos">Acabados básicos</option><option value="Acabados medios">Acabados medios</option><option value="Acabados de lujo">Acabados de lujo</option></select></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Seguridad</label><select id="ref-seguridad" class="ave-form-control"><option value="">-- Seleccione --</option><option value="Vigilancia 24h">Vigilancia 24h</option><option value="Porton">Portón</option><option value="Cercado">Cercado</option><option value="Otro">Otro</option></select></div></div>
                    <div class="col-md-3"><div class="ave-form-group"><label class="ave-form-label">Valor por m² (USD)</label><input type="number" id="ref-valorm2" class="ave-form-control" readonly></div></div>
                </div>
                <div class="row">
                    <div class="col-md-3"><div class="ave-checkbox-wrapper"><input type="checkbox" id="ref-ascensores"><label class="ave-checkbox-label" for="ref-ascensores">Ascensores</label></div></div>
                    <div class="col-md-3"><div class="ave-checkbox-wrapper"><input type="checkbox" id="ref-terraza"><label class="ave-checkbox-label" for="ref-terraza">Terraza</label></div></div>
                </div>
                <div class="row">
                    <div class="col-md-8"><div class="ave-form-group"><label class="ave-form-label">Descripción</label><textarea id="ref-descripcion" class="ave-form-control" rows="2"></textarea></div></div>
                    <div class="col-md-4"><div class="ave-form-group"><label class="ave-form-label">Enlace</label><input type="text" id="ref-enlace" class="ave-form-control"></div></div>
                </div>
                <div class="row">
                    <div class="col-md-6">
                        <div class="ave-form-group">
                            <label class="ave-form-label">Foto (opcional)</label>
                            <input type="file" id="ref-foto" class="ave-form-control" accept="image/*">
                            <input type="hidden" id="ref-foto-id">
                            <div id="ref-foto-preview" style="display:none; margin-top:8px;">
                                <img src="" style="max-width:100px; border-radius:4px;">
                                <button type="button" id="ref-foto-remove" class="ave-btn ave-btn-danger ave-btn-sm">Quitar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="ave-btn ave-btn-secondary" data-dismiss="modal">Cancelar</button>
                <button type="button" class="ave-btn ave-btn-primary" id="btn-guardar-referencia"><i class="fas fa-save"></i> Guardar</button>
            </div>
        </div>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════ MODAL — FODA ═══════════════════════════════════════════════════════════════ -->
<div class="modal fade" id="modalFoda" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header ave-modal-header">
                <button type="button" class="ave-modal-close" data-dismiss="modal">&times;</button>
                <h4 class="ave-modal-title" id="modal-foda-titulo">
                    <i class="fas fa-balance-scale"></i> Agregar al FODA
                </h4>
            </div>
            <div class="modal-body" style="padding:24px;">
                <input type="hidden" id="foda-modal-analisis-id">
                <div class="ave-form-group">
                    <label class="ave-form-label">Título seleccionado</label>
                    <input type="text" id="foda-modal-titulo-texto" class="ave-form-control" readonly
                           style="background:#f5f5f5; font-weight:600;">
                </div>
                <div class="ave-form-group">
                    <label class="ave-form-label required">Tipo</label>
                    <div style="display:flex; gap:24px; padding:8px 0;">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                            <input type="radio" name="foda-tipo" value="fortaleza" checked>
                            <span style="color:var(--ave-success); font-weight:600;">
                                <i class="fas fa-thumbs-up"></i> Fortaleza
                            </span>
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;">
                            <input type="radio" name="foda-tipo" value="debilidad">
                            <span style="color:var(--ave-danger); font-weight:600;">
                                <i class="fas fa-thumbs-down"></i> Debilidad
                            </span>
                        </label>
                    </div>
                </div>
                <div class="ave-form-group">
                    <label class="ave-form-label required">Descripción</label>
                    <textarea id="foda-descripcion" class="ave-form-control" rows="4"
                              placeholder="Describa este factor para el inmueble avaluado..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="ave-btn ave-btn-secondary" data-dismiss="modal">Cancelar</button>
                <button type="button" class="ave-btn ave-btn-primary" id="btn-guardar-foda">
                    <i class="fas fa-plus"></i> Agregar
                </button>
            </div>
        </div>
    </div>
</div>

<!-- MODAL — Nuevo título FODA -->
<div class="modal fade" id="modalFodaTitulo" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header ave-modal-header">
                <button type="button" class="ave-modal-close" data-dismiss="modal">&times;</button>
                <h4 class="ave-modal-title">
                    <i class="fas fa-plus-circle"></i> Nuevo título FODA
                </h4>
            </div>
            <div class="modal-body" style="padding:24px;">
                <div class="ave-form-group">
                    <label class="ave-form-label required">Título</label>
                    <input type="text" id="foda-nuevo-titulo" class="ave-form-control"
                           placeholder="Ej: Ubicación privilegiada, Antigüedad del inmueble...">
                </div>
                <div class="ave-checkbox-wrapper">
                    <input type="checkbox" id="foda-nuevo-predeterminado">
                    <label class="ave-checkbox-label" for="foda-nuevo-predeterminado">
                        Predeterminado (visible para todos los equipos)
                    </label>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="ave-btn ave-btn-secondary" data-dismiss="modal">Cancelar</button>
                <button type="button" class="ave-btn ave-btn-primary" id="btn-guardar-titulo-foda">
                    <i class="fas fa-save"></i> Crear título
                </button>
            </div>
        </div>
    </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════ MODAL GENÉRICO (para Factores, Decisiones, Medios, Planes) ═══════════════════════════════════════════════════════════════ -->
<div class="modal fade" id="modalItem" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header ave-modal-header">
                <button type="button" class="ave-modal-close" data-dismiss="modal">&times;</button>
                <h4 class="ave-modal-title" id="modalItemTitulo"><i class="fas fa-plus-circle"></i> Nuevo Ítem</h4>
            </div>
            <div class="modal-body" style="padding:24px;">
                <div class="ave-form-group"><label class="ave-form-label required">Nombre</label><input type="text" id="item-nombre" class="ave-form-control"></div>
                <div class="ave-form-group" id="item-descripcion-group"><label class="ave-form-label">Descripción</label><textarea id="item-descripcion" class="ave-form-control" rows="2"></textarea></div>
                <div class="ave-form-group" id="item-impacto-group" style="display:none;"><label class="ave-form-label">Impacto</label><div style="display:flex; gap:20px;"><label><input type="radio" name="item-impacto" value="positivo" checked> Positivo</label><label><input type="radio" name="item-impacto" value="negativo"> Negativo</label></div></div>
                <div class="ave-checkbox-wrapper" id="item-predeterminado-group"><input type="checkbox" id="item-predeterminado"><label class="ave-checkbox-label" for="item-predeterminado">Predeterminado (visible para todos los equipos)</label></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="ave-btn ave-btn-secondary" data-dismiss="modal">Cancelar</button>
                <button type="button" class="ave-btn ave-btn-primary" id="btn-guardar-item"><i class="fas fa-save"></i> Crear</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal Factor (obsoleto, usar modalItem) - opcional eliminarlo -->
<!-- Modal Decision (obsoleto, usar modalItem) - opcional eliminarlo -->
<!-- Modal Canal (obsoleto, usar modalItem) - opcional eliminarlo -->