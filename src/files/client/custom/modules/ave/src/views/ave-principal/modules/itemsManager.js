define('ave:views/ave-principal/modules/itemsManager', [], function () {

    var ID_MAP = {
        factor:   { tbody: 'factores-tbody',   emptyRow: 'factores-empty-row',   selectId: 'select-factor'   },
        decision: { tbody: 'decisiones-tbody',  emptyRow: 'decisiones-empty-row', selectId: 'select-decision' },
        canal:    { tbody: 'canales-tbody',     emptyRow: 'canales-empty-row',    selectId: 'select-canal'    },
        plan:     { tbody: 'planes-tbody',      emptyRow: 'planes-empty-row',     selectId: 'select-plan'     }
    };

    var ItemsManager = function (view, tipo, options) {
        this.view            = view;
        this.tipo            = tipo;
        this.items           = [];
        this.catalogo        = [];
        this.labelSingular   = options.labelSingular   || 'ítem';
        this.tieneImpacto    = options.tieneImpacto    || false;
        this.tieneDescripcion = options.tieneDescripcion !== false;
        
        this._ids            = ID_MAP[tipo] || {
            tbody:    tipo + 's-tbody',
            emptyRow: tipo + '-empty-row',
            selectId: 'select-' + tipo
        };
    };

    // Obtener el subtipo del inmueble actual
    ItemsManager.prototype.getSubtipoInmueble = function () {
        var inmueble = this.view.inmuebleManager?.inmuebleActual;
        if (!inmueble || !inmueble.subtipoPropiedad) {
            return null;
        }
        return inmueble.subtipoPropiedad;
    };

    // Verificar si hay inmueble seleccionado
    ItemsManager.prototype.validarInmueble = function () {
        var subtipo = this.getSubtipoInmueble();
        if (!subtipo) {
            Espo.Ui.warning('Debe seleccionar un inmueble antes de agregar factores');
            // Cambiar a la pestaña del inmueble
            this.view.tabsManager.activarTab('tab-2');
            return false;
        }
        return true;
    };

    ItemsManager.prototype.cargarCatalogo = function (teamId) {
        var self = this;
        var subtipo = this.getSubtipoInmueble();
        
        var url = 'AvePrincipal/action/getFactoresPorTipo';
        var params = { tipo: this.tipo };
        
        // Para factores, enviar teamId y subtipo
        if (this.tipo === 'factor') {
            if (teamId) {
                params.teamId = teamId;
            }
            // Si no hay subtipo, enviar cadena vacía para que el backend devuelva solo generales
            params.descripcion = subtipo || '';
        } else {
            // Para otros tipos, enviar teamId para filtro
            if (teamId) {
                params.teamId = teamId;
            }
        }
        
        Espo.Ajax.getRequest(url, params)
            .then(function (response) {
                if (response.success && response.data) {
                    self.catalogo = response.data;
                    self.poblarSelect();
                }
            });
    };

    ItemsManager.prototype.poblarSelect = function () {
        var self    = this;
        var $select = this.view.$el.find('#' + this._ids.selectId);
        if (!$select.length) return;

        // Obtener IDs de los items ya agregados
        var idsAgregados = this.items.map(function (i) { return String(i.id); });
        
        console.log('Poblar select - Tipo:', this.tipo);
        console.log('Items agregados IDs:', idsAgregados);
        console.log('Catálogo completo:', this.catalogo);

        $select.empty().append('<option value="">-- Seleccione ' + this.labelSingular + ' --</option>');
        
        this.catalogo.forEach(function (item) {
            // Verificar si el item NO está ya agregado
            if (idsAgregados.indexOf(String(item.id)) === -1) {
                var text = self.escape(item.name);
                $select.append('<option value="' + item.id + '">' + text + '</option>');
            }
        });
        
        console.log('Opciones disponibles en select:', $select.find('option').length - 1);
    };

    ItemsManager.prototype.cargarItems = function (items) {
        console.log('cargarItems - tipo:', this.tipo);
        console.log('items recibidos:', items);
        
        if (this.tipo === 'factor') {
            // Filtrar solo los factores que tienen descripcion igual al subtipo actual
            var subtipoActual = this.getSubtipoInmueble();
            console.log('Subtipo actual:', subtipoActual);
            
            if (subtipoActual) {
                // Mapear los items para que tengan la estructura correcta
                this.items = (items || []).map(function(item) {
                    return {
                        id: item.factorCatalogoId || item.id,  // ← Asegurar que el ID sea correcto
                        name: item.factorName || item.name,
                        tipo: item.tipo || 'positivo',
                        descripcion: item.descripcion || subtipoActual
                    };
                }).filter(function(item) {
                    return item.descripcion === subtipoActual;
                });
            } else {
                // Si no hay subtipo, mostrar solo factores generales
                this.items = (items || []).map(function(item) {
                    return {
                        id: item.factorCatalogoId || item.id,
                        name: item.factorName || item.name,
                        tipo: item.tipo || 'positivo',
                        descripcion: item.descripcion || ''
                    };
                }).filter(function(item) {
                    return !item.descripcion || item.descripcion === '';
                });
            }
        } else {
            this.items = items || [];
        }
        
        console.log('Items cargados (con IDs):', this.items);
        this.renderizar();
        this.poblarSelect();  // ← Esto ahora filtrará los items ya agregados
        if (this.tipo === 'factor') {
            this.actualizarTotalImpacto();
        }
    };

    // Recargar catálogo cuando cambia el inmueble
    ItemsManager.prototype.recargarPorInmueble = function () {
        var self = this;
        if (this.tipo !== 'factor') return;
        
        var subtipo = this.getSubtipoInmueble();
        
        // Si no hay subtipo, enviar cadena vacía
        Espo.Ajax.getRequest('AvePrincipal/action/getFactoresPorTipo', { 
            tipo: this.tipo, 
            teamId: this.view.teamId,
            descripcion: subtipo || ''
        }).then(function (response) {
            if (response.success && response.data) {
                self.catalogo = response.data;
                // Filtrar items actuales según el subtipo
                if (subtipo) {
                    self.items = self.items.filter(function(item) {
                        return item.descripcion === subtipo;
                    });
                } else {
                    // Si no hay subtipo, filtrar items generales
                    self.items = self.items.filter(function(item) {
                        return !item.descripcion || item.descripcion === '';
                    });
                }
                self.renderizar();
                self.poblarSelect();
                self.actualizarTotalImpacto();
            }
        });
    };

    ItemsManager.prototype.agregarDesdeSelect = function () {
        var self = this;
        
        // Para factores, validar que haya inmueble seleccionado
        if (this.tipo === 'factor') {
            if (!this.validarInmueble()) return;
            
            var $select = this.view.$el.find('#' + this._ids.selectId);
            var id = $select.val();
            if (!id) {
                Espo.Ui.warning('Seleccione un factor primero');
                return;
            }
            var item = this.catalogo.find(function (i) { return String(i.id) === String(id); });
            if (!item) return;
            
            // Mostrar ventana para seleccionar tipo de impacto
            this.preguntarTipoImpacto(item);
            return;
        }
        
        // Para otros tipos (decisiones, canales, planes)
        var $select = this.view.$el.find('#' + this._ids.selectId);
        var id = $select.val();
        if (!id) {
            Espo.Ui.warning('Seleccione un ' + this.labelSingular + ' primero');
            return;
        }
        var item = this.catalogo.find(function (i) { return String(i.id) === String(id); });
        if (!item) return;

        var newItem = { id: item.id, name: item.name };
        if (this.tieneDescripcion) newItem.descripcion = item.descripcion || '';
        if (this.tieneImpacto)    newItem.impacto      = item.impacto;
        this.items.push(newItem);
        
        $select.val('');
        this.renderizar();
        this.poblarSelect();
        if (this.tipo === 'factor') {
            this.actualizarTotalImpacto();
        }
        Espo.Ui.success(this.labelSingular + ' agregado');
    };

    // Método para preguntar el tipo de impacto (positivo/negativo)
    ItemsManager.prototype.preguntarTipoImpacto = function (item) {
        var self = this;
        
        // Buscar modal existente y removerlo si existe
        if (this.view.$el.find('#modalFactorTipo').length) {
            this.view.$el.find('#modalFactorTipo').remove();
        }
        
        var modalHtml = 
            '<div class="modal fade" id="modalFactorTipo" tabindex="-1" role="dialog" data-backdrop="static">' +
            '<div class="modal-dialog" role="document">' +
            '<div class="modal-content">' +
            '<div class="modal-header ave-modal-header">' +
            '<button type="button" class="ave-modal-close" data-dismiss="modal" aria-label="Close">&times;</button>' +
            '<h4 class="ave-modal-title"><i class="fas fa-question-circle"></i> Tipo de Impacto</h4>' +
            '</div>' +
            '<div class="modal-body" style="padding:24px;">' +
            '<p><strong>' + this.escape(item.name) + '</strong></p>' +
            '<div class="ave-form-group">' +
            '<label class="ave-form-label required">¿Cómo afecta este factor al precio?</label>' +
            '<div style="display:flex; gap:24px; margin-top:8px;">' +
            '<label style="cursor:pointer;"><input type="radio" name="factor-tipo-impacto" value="positivo" checked> <span style="color:#27ae60;">✓ Positivo (+1%)</span></label>' +
            '<label style="cursor:pointer;"><input type="radio" name="factor-tipo-impacto" value="negativo"> <span style="color:#e74c3c;">✗ Negativo (-1%)</span></label>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="ave-btn ave-btn-secondary" data-dismiss="modal">Cancelar</button>' +
            '<button type="button" class="ave-btn ave-btn-primary" id="btn-confirmar-factor-tipo"><i class="fas fa-check"></i> Agregar</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
        
        this.view.$el.append(modalHtml);
        var $modal = this.view.$el.find('#modalFactorTipo');
        var $select = this.view.$el.find('#' + this._ids.selectId);
        
        $modal.on('hidden.bs.modal', function() {
            $modal.remove();
            if ($('.modal-backdrop').length) {
                $('.modal-backdrop').remove();
            }
            $('body').removeClass('modal-open');
        });
        
        $modal.find('#btn-confirmar-factor-tipo').off('click').on('click', function() {
            var tipoImpacto = $modal.find('input[name="factor-tipo-impacto"]:checked').val();
            
            var subtipoActual = self.getSubtipoInmueble();
            var newItem = { 
                id: item.id, 
                name: item.name,
                tipo: tipoImpacto,
                descripcion: subtipoActual
            };
            
            // Agregar a items
            self.items.push(newItem);
            
            // Limpiar select
            $select.val('');
            
            // Renderizar tabla y actualizar select (esto quitará el item del select)
            self.renderizar();
            self.poblarSelect();  // ← Esto actualizará el select eliminando el item agregado
            self.actualizarTotalImpacto();
            
            Espo.Ui.success('Factor agregado como ' + (tipoImpacto === 'positivo' ? 'positivo' : 'negativo'));
            
            $modal.modal('hide');
        });
        
        $modal.modal({ backdrop: 'static', keyboard: true });
    };

    ItemsManager.prototype.abrirModalNuevo = function () {
        var self = this;
        
        // Para factores, validar que haya inmueble seleccionado
        if (this.tipo === 'factor') {
            if (!this.validarInmueble()) return;
        }
        
        this.view.$el.find('#item-nombre').val('');
        
        // Para factores, ocultar el campo de descripción
        if (this.tipo === 'factor') {
            this.view.$el.find('#item-descripcion-group').hide();
        } else if (this.tieneDescripcion) {
            this.view.$el.find('#item-descripcion-group').show();
            this.view.$el.find('#item-descripcion').val('');
        } else {
            this.view.$el.find('#item-descripcion-group').hide();
        }

        if (this.tieneImpacto && this.tipo !== 'factor') {
            this.view.$el.find('#item-impacto-group').show();
            this.view.$el.find('input[name="item-impacto"][value="positivo"]').prop('checked', true);
        } else {
            this.view.$el.find('#item-impacto-group').hide();
        }

        // Verificar si el usuario es administrador
        var user = this.view.getUser();
        var esAdmin = user.get('type') === 'admin';
        var esCasaNacional = false;
        
        // Verificar roles para Casa Nacional
        var roles = user.get('roles') || [];
        for (var i = 0; i < roles.length; i++) {
            if (roles[i].name && roles[i].name.toLowerCase().includes('casa nacional')) {
                esCasaNacional = true;
                break;
            }
        }
        
        var puedeCrearPredeterminado = esAdmin || esCasaNacional;
        
        if (puedeCrearPredeterminado) {
            this.view.$el.find('#item-predeterminado-group').show();
            this.view.$el.find('#item-predeterminado').prop('checked', false);
        } else {
            this.view.$el.find('#item-predeterminado-group').hide();
            this.view.$el.find('#item-predeterminado').prop('checked', false);
        }
        
        this.view.$el.find('#modalItemTitulo').html(
            '<i class="fas fa-plus-circle"></i> Nuevo ' + this.labelSingular
        );

        this.view.$el.find('#btn-guardar-item').off('click').on('click', function () {
            self.crearNuevo();
        });

        this.view.$el.find('#modalItem').modal({ backdrop: 'static', keyboard: true });
        setTimeout(function () { self.view.$el.find('#item-nombre').focus(); }, 400);
        
        this.view.$el.find('#modalItem').off('hidden.bs.modal').on('hidden.bs.modal', function() {
            if ($('.modal-backdrop').length) {
                $('.modal-backdrop').remove();
            }
            $('body').removeClass('modal-open');
        });
    };

    ItemsManager.prototype.crearNuevo = function () {
        var self = this;
        var nombre = this.view.$el.find('#item-nombre').val().trim();
        if (!nombre) {
            Espo.Ui.warning('El nombre es requerido');
            this.view.$el.find('#item-nombre').focus();
            return;
        }
        
        var esPredeterminado = this.view.$el.find('#item-predeterminado').is(':checked');
        
        var data = {
            nombre:        nombre,
            tipo:          this.tipo,
            descripcion:   '',
            predeterminado: esPredeterminado,
            teamId:        null  // Por defecto null
        };
        
        // Solo guardar teamId si NO es predeterminado
        if (!esPredeterminado && this.view.teamId) {
            data.teamId = this.view.teamId;
        }
        
        // Para factores, la descripción será el subtipo actual
        if (this.tipo === 'factor') {
            var subtipoActual = this.getSubtipoInmueble();
            if (subtipoActual) {
                data.descripcion = subtipoActual;
            }
        } else if (this.tieneDescripcion) {
            data.descripcion = this.view.$el.find('#item-descripcion').val();
        }
        
        if (this.tieneImpacto && this.tipo !== 'factor') {
            data.impacto = this.view.$el.find('input[name="item-impacto"]:checked').val();
        }

        var $btn = this.view.$el.find('#btn-guardar-item');
        var orig = $btn.html();
        $btn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        Espo.Ajax.postRequest('AvePrincipal/action/crearFactor', data)
            .then(function (response) {
                if (response.success) {
                    var nuevo = response.data;
                    
                    if (self.tipo === 'factor') {
                        self.catalogo.push(nuevo);
                        self.poblarSelect();
                        // Mostrar ventana para seleccionar tipo de impacto
                        self.preguntarTipoImpacto(nuevo);
                    } else {
                        var newItem = { id: nuevo.id, name: nuevo.name };
                        if (self.tieneDescripcion) newItem.descripcion = nuevo.descripcion || '';
                        if (self.tieneImpacto)    newItem.impacto      = nuevo.impacto;
                        self.catalogo.push(nuevo);
                        self.items.push(newItem);
                        self.renderizar();
                        self.poblarSelect();
                    }
                    
                    self.view.$el.find('#modalItem').modal('hide');
                    Espo.Ui.success(self.labelSingular + ' creado');
                } else {
                    Espo.Ui.error(response.error || 'Error al crear');
                }
            })
            .catch(function () { Espo.Ui.error('Error al crear'); })
            .finally(function () { 
                $btn.prop('disabled', false).html(orig);
            });
    };

    ItemsManager.prototype.quitar = function (idx) {
        console.log('Quitando factor índice:', idx);
        this.items.splice(idx, 1);
        this.renderizar();
        this.poblarSelect();  // ← Esto hará que el factor vuelva a aparecer en el select
        if (this.tipo === 'factor') {
            this.actualizarTotalImpacto();
        }
        Espo.Ui.success(this.labelSingular + ' eliminado');
    };
    
    ItemsManager.prototype.actualizarTotalImpacto = function () {
        if (this.tipo !== 'factor') return;
        
        var total = 0;
        for (var i = 0; i < this.items.length; i++) {
            var item = this.items[i];
            var tipo = item.tipo || 'positivo';
            total += (tipo === 'positivo') ? 1 : -1;
        }
        
        var $container = this.view.$el.find('#factores-total-container');
        var $totalSpan = this.view.$el.find('#factores-total');
        var $mensaje = this.view.$el.find('#factores-mensaje');
        
        if (this.items.length === 0) {
            $container.hide();
            return;
        }
        
        $container.show();
        var signo = total >= 0 ? '+' : '';
        $totalSpan.html(signo + total + '%');
        $totalSpan.css('color', total >= 0 ? '#27ae60' : '#e74c3c');
        
        var mensaje = 'Debido a estos factores, el precio de la propiedad puede verse afectado en un <strong>' + signo + Math.abs(total) + '%</strong>';
        $mensaje.html(mensaje);
    };

    ItemsManager.prototype.renderizar = function () {
        var self     = this;
        var $tbody   = this.view.$el.find('#' + this._ids.tbody);
        var $emptyRow = this.view.$el.find('#' + this._ids.emptyRow);

        if (!$tbody.length) return;

        $tbody.find('tr').not($emptyRow).remove();

        if (this.items.length === 0) {
            $emptyRow.show();
            return;
        }

        $emptyRow.hide();

        this.items.forEach(function (item, idx) {
            var $tr = $('<tr>');
            
            var nombreMostrar = item.name;
            $tr.append($('<td>').css('font-weight', '600').text(nombreMostrar));
            
            if (self.tipo === 'factor') {
                var esPositivo = (item.tipo || 'positivo') === 'positivo';
                var impactoHtml = esPositivo 
                    ? '<span class="ave-impacto-positivo">✓ Positivo</span>'
                    : '<span class="ave-impacto-negativo">✗ Negativo</span>';
                $tr.append($('<td>').css('text-align', 'center').html(impactoHtml));
                
                var porcentaje = esPositivo ? '+1%' : '-1%';
                var clasePorcentaje = esPositivo ? 'ave-impacto-positivo' : 'ave-impacto-negativo';
                $tr.append($('<td>').css('text-align', 'center').html('<span class="' + clasePorcentaje + '" style="font-weight:700;">' + porcentaje + '</span>'));
            } else if (self.tieneDescripcion) {
                $tr.append($('<td>').css('color', 'var(--ave-text-muted)').text(item.descripcion || ''));
                if (self.tieneImpacto) {
                    var $impacto = item.impacto === 'positivo'
                        ? $('<span class="ave-impacto-positivo">').html('✓ Positivo')
                        : $('<span class="ave-impacto-negativo">').html('✗ Negativo');
                    $tr.append($('<td>').css('text-align', 'center').append($impacto));
                }
            } else if (self.tieneImpacto) {
                var $impacto = item.impacto === 'positivo'
                    ? $('<span class="ave-impacto-positivo">').html('✓ Positivo')
                    : $('<span class="ave-impacto-negativo">').html('✗ Negativo');
                $tr.append($('<td>').css('text-align', 'center').append($impacto));
            }
            
            var $btn = $('<button>')
                .addClass('ave-btn-quitar')
                .attr('title', 'Quitar')
                .html('<i class="fas fa-times"></i>')
                .on('click', function (e) {
                    e.stopPropagation();
                    self.quitar(idx);
                });
            
            $tr.append($('<td>').css('text-align', 'center').append($btn));
            $tbody.append($tr);
        });
    };

    ItemsManager.prototype.getData = function () {
        if (this.tipo === 'factor') {
            console.log('Factores a guardar:', this.items);
            return this.items.map(function (i) {
                return {
                    factorCatalogoId: i.id,
                    name: i.name,
                    tipo: i.tipo || 'positivo',
                    descripcion: i.descripcion
                };
            });
        }
        
        return this.items.map(function (i) {
            var item = { id: i.id, name: i.name };
            if (this.tieneDescripcion) item.descripcion = i.descripcion || '';
            if (this.tieneImpacto)    item.impacto      = i.impacto;
            return item;
        }.bind(this));
    };

    ItemsManager.prototype.escape = function (text) {
        if (!text) return '';
        return String(text).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    };

    return ItemsManager;
});