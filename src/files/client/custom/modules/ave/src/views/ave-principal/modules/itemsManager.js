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
        
        this.factoresTipos = [];
        
        this._ids            = ID_MAP[tipo] || {
            tbody:    tipo + 's-tbody',
            emptyRow: tipo + '-empty-row',
            selectId: 'select-' + tipo
        };
    };

    ItemsManager.prototype.cargarCatalogo = function (teamId) {
        var self = this;
        Espo.Ajax.getRequest('AvePrincipal/action/getFactoresPorTipo', {
            tipo: this.tipo, teamId: teamId
        })
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

        var idsAgregados = this.items.map(function (i) { return String(i.id); });

        $select.empty().append('<option value="">-- Seleccione ' + this.labelSingular + ' --</option>');
        this.catalogo.forEach(function (item) {
            if (idsAgregados.indexOf(String(item.id)) === -1) {
                var text = self.escape(item.name);
                // Para factores NO mostramos el impacto porque se asigna al agregar
                if (self.tieneImpacto && item.impacto && self.tipo !== 'factor') {
                    text += ' (' + (item.impacto === 'positivo' ? 'Positivo' : 'Negativo') + ')';
                }
                $select.append('<option value="' + item.id + '">' + text + '</option>');
            }
        });
    };

    ItemsManager.prototype.cargarItems = function (items) {
        if (this.tipo === 'factor') {
            this.items = items || [];
            this.factoresTipos = this.items.map(function(i) { return i.tipo || 'positivo'; });
        } else {
            this.items = items || [];
        }
        this.renderizar();
        this.poblarSelect();
        this.actualizarTotalImpacto();
    };

    ItemsManager.prototype.agregarDesdeSelect = function () {
        var self = this;
        var $select = this.view.$el.find('#' + this._ids.selectId);
        var id      = $select.val();
        if (!id) {
            Espo.Ui.warning('Seleccione un ' + this.labelSingular + ' primero');
            return;
        }
        var item = this.catalogo.find(function (i) { return String(i.id) === String(id); });
        if (!item) return;

        if (this.tipo === 'factor') {
            this.preguntarTipoImpacto(item);
        } else {
            var newItem = { id: item.id, name: item.name };
            if (this.tieneDescripcion) newItem.descripcion = item.descripcion || '';
            if (this.tieneImpacto)    newItem.impacto      = item.impacto;
            this.items.push(newItem);
            $select.val('');
            this.renderizar();
            this.poblarSelect();
            Espo.Ui.success(this.labelSingular + ' agregado');
        }
    };
    
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
            '<p><strong>' + self.escape(item.name) + '</strong></p>' +
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
            // Forzar remoción del backdrop
            if ($('.modal-backdrop').length) {
                $('.modal-backdrop').remove();
            }
            $('body').removeClass('modal-open');
        });
        
        $modal.find('#btn-confirmar-factor-tipo').off('click').on('click', function() {
            var tipoImpacto = $modal.find('input[name="factor-tipo-impacto"]:checked').val();
            
            var newItem = { 
                id: item.id, 
                name: item.name,
                tipo: tipoImpacto
            };
            if (self.tieneDescripcion) newItem.descripcion = item.descripcion || '';
            
            self.items.push(newItem);
            $select.val('');
            self.renderizar();
            self.poblarSelect();
            self.actualizarTotalImpacto();
            Espo.Ui.success('Factor agregado como ' + (tipoImpacto === 'positivo' ? 'positivo' : 'negativo'));
            
            $modal.modal('hide');
        });
        
        $modal.modal({ backdrop: 'static', keyboard: true });
    };

    ItemsManager.prototype.abrirModalNuevo = function () {
        var self = this;
        this.view.$el.find('#item-nombre').val('');
        this.view.$el.find('#item-descripcion').val('');

        if (this.tieneDescripcion) {
            this.view.$el.find('#item-descripcion-group').show();
        } else {
            this.view.$el.find('#item-descripcion-group').hide();
        }

        // Para factores, NO mostramos la opción de impacto porque se asigna después
        if (this.tieneImpacto && this.tipo !== 'factor') {
            this.view.$el.find('#item-impacto-group').show();
            this.view.$el.find('input[name="item-impacto"][value="positivo"]').prop('checked', true);
        } else {
            this.view.$el.find('#item-impacto-group').hide();
        }

        this.view.$el.find('#item-predeterminado').prop('checked', false);
        this.view.$el.find('#modalItemTitulo').html(
            '<i class="fas fa-plus-circle"></i> Nuevo ' + this.labelSingular
        );

        this.view.$el.find('#btn-guardar-item').off('click').on('click', function () {
            self.crearNuevo();
        });

        this.view.$el.find('#modalItem').modal({ backdrop: 'static', keyboard: true });
        setTimeout(function () { self.view.$el.find('#item-nombre').focus(); }, 400);
        
        // Asegurar que al cerrar se quite el backdrop correctamente
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
        var data = {
            nombre:        nombre,
            tipo:          this.tipo,
            descripcion:   this.tieneDescripcion ? this.view.$el.find('#item-descripcion').val() : '',
            predeterminado: this.view.$el.find('#item-predeterminado').is(':checked'),
            teamId:        this.view.teamId
        };
        
        // Para factores NO enviamos impacto al crear
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
                        // Preguntar el tipo de impacto para este nuevo factor
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
        this.items.splice(idx, 1);
        this.renderizar();
        this.poblarSelect();
        if (this.tipo === 'factor') {
            this.actualizarTotalImpacto();
        }
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
            
            $tr.append($('<td>').css('font-weight', '600').text(item.name));
            
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
            return this.items.map(function (i) {
                return {
                    factorCatalogoId: i.id,
                    name: i.name,
                    tipo: i.tipo || 'positivo'
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